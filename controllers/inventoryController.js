const InventoryItem = require("../models/InventoryItem");
const User = require("../models/User");
const { v4: uuidv4 } = require("uuid");
const { isValidUserId } = require("../utils/validation");

/**
 * Add new inventory item (admin only)
 */
exports.addInventoryItem = async (req, res) => {
    try {
        const {
            name,
            category,
            description,
            quantity,
            unit,
            location,
            purchaseDate,
            purchasePrice,
            supplier,
            status,
            notes
        } = req.body;

        // Validate required fields
        if (!name || !category || !unit || !purchaseDate || purchasePrice === undefined) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const item = await InventoryItem.create({
            id: uuidv4(),
            name,
            category,
            description: description || "",
            quantity: quantity || 1,
            unit,
            location: location || "",
            purchaseDate: new Date(purchaseDate),
            purchasePrice,
            supplier: supplier || "",
            status: status || "available",
            notes: notes || ""
        });

        res.status(201).json({
            message: "Inventory item added successfully",
            item
        });
    } catch (error) {
        console.error("Add Inventory Item Error:", error);
        res.status(500).json({ error: "Failed to add inventory item" });
    }
};

/**
 * Get all inventory items with filters
 */
exports.getInventoryItems = async (req, res) => {
    try {
        const { category, status, search, assignedTo, limit = 100 } = req.query;

        const match = {};
        if (category) match.category = category;
        if (status) match.status = status;
        if (assignedTo) match.assignedTo = assignedTo;
        if (search) {
            match.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { supplier: { $regex: search, $options: 'i' } }
            ];
        }

        const items = await InventoryItem.find(match)
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .lean();

        // Fetch assigned user details if any
        const assignedUserIds = items
            .filter(i => i.assignedTo)
            .map(i => i.assignedTo);

        let userMap = {};
        if (assignedUserIds.length > 0) {
            const users = await User.find({ id: { $in: assignedUserIds } })
                .select('id username email role');
            users.forEach(u => { userMap[u.id] = u; });
        }

        // Enrich items with user data
        const enrichedItems = items.map(item => ({
            ...item,
            assignedUser: item.assignedTo ? userMap[item.assignedTo] || null : null
        }));

        // Calculate statistics
        const stats = {
            total: items.length,
            available: items.filter(i => i.status === 'available').length,
            inUse: items.filter(i => i.status === 'in_use').length,
            maintenance: items.filter(i => i.status === 'maintenance').length,
            damaged: items.filter(i => i.status === 'damaged').length,
            disposed: items.filter(i => i.status === 'disposed').length
        };

        res.json({ items: enrichedItems, stats });
    } catch (error) {
        console.error("Get Inventory Items Error:", error);
        res.status(500).json({ error: "Failed to fetch inventory items" });
    }
};

/**
 * Get inventory item by ID
 */
exports.getInventoryItemById = async (req, res) => {
    try {
        const { id } = req.params;
        const item = await InventoryItem.findOne({ id }).lean();

        if (!item) {
            return res.status(404).json({ error: "Item not found" });
        }

        // Fetch assigned user if any
        if (item.assignedTo) {
            const user = await User.findOne({ id: item.assignedTo })
                .select('id username email role');
            item.assignedUser = user;
        }

        res.json({ item });
    } catch (error) {
        console.error("Get Inventory Item Error:", error);
        res.status(500).json({ error: "Failed to fetch item" });
    }
};

/**
 * Update inventory item
 */
exports.updateInventoryItem = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const item = await InventoryItem.findOne({ id });
        if (!item) {
            return res.status(404).json({ error: "Item not found" });
        }

        // Update allowed fields
        const allowedFields = [
            'name', 'category', 'description', 'quantity', 'unit', 'location',
            'purchaseDate', 'purchasePrice', 'supplier', 'status', 'notes'
        ];

        allowedFields.forEach(field => {
            if (updates[field] !== undefined) {
                if (field === 'purchaseDate') {
                    item[field] = new Date(updates[field]);
                } else {
                    item[field] = updates[field];
                }
            }
        });

        await item.save();

        res.json({
            message: "Item updated successfully",
            item
        });
    } catch (error) {
        console.error("Update Inventory Item Error:", error);
        res.status(500).json({ error: "Failed to update item" });
    }
};

/**
 * Delete inventory item
 */
exports.deleteInventoryItem = async (req, res) => {
    try {
        const { id } = req.params;

        const item = await InventoryItem.findOne({ id });
        if (!item) {
            return res.status(404).json({ error: "Item not found" });
        }

        await InventoryItem.deleteOne({ id });

        res.json({ message: "Item deleted successfully" });
    } catch (error) {
        console.error("Delete Inventory Item Error:", error);
        res.status(500).json({ error: "Failed to delete item" });
    }
};

/**
 * Assign item to a user
 */
exports.assignItem = async (req, res) => {
    try {
        const { id } = req.params;
        const { userId } = req.body;

        const item = await InventoryItem.findOne({ id });
        if (!item) {
            return res.status(404).json({ error: "Item not found" });
        }

        // Validate user if provided
        if (userId) {
            if (!isValidUserId(userId)) {
                return res.status(400).json({ error: "Invalid user ID" });
            }

            const user = await User.findOne({ id: userId });
            if (!user) {
                return res.status(404).json({ error: "User not found" });
            }

            item.assignedTo = userId;
            item.status = 'in_use';
        } else {
            // Unassign
            item.assignedTo = undefined;
            item.status = 'available';
        }

        await item.save();

        res.json({
            message: userId ? "Item assigned successfully" : "Item unassigned successfully",
            item
        });
    } catch (error) {
        console.error("Assign Item Error:", error);
        res.status(500).json({ error: "Failed to assign item" });
    }
};

/**
 * Get items grouped by category
 */
exports.getItemsByCategory = async (req, res) => {
    try {
        const items = await InventoryItem.aggregate([
            {
                $group: {
                    _id: "$category",
                    count: { $sum: 1 },
                    totalValue: { $sum: { $multiply: ["$quantity", "$purchasePrice"] } },
                    items: { $push: "$$ROOT" }
                }
            },
            { $sort: { count: -1 } }
        ]);

        res.json({ categories: items });
    } catch (error) {
        console.error("Get Items By Category Error:", error);
        res.status(500).json({ error: "Failed to fetch items by category" });
    }
};

/**
 * Export inventory to CSV
 */
exports.exportInventory = async (req, res) => {
    try {
        const items = await InventoryItem.find({})
            .sort({ category: 1, name: 1 })
            .lean();

        const csv = [
            ['ID', 'Name', 'Category', 'Quantity', 'Unit', 'Location', 'Purchase Date', 'Purchase Price', 'Supplier', 'Status', 'Assigned To'].join(','),
            ...items.map(item => [
                item.id,
                `"${item.name}"`,
                item.category,
                item.quantity,
                item.unit,
                `"${item.location}"`,
                new Date(item.purchaseDate).toISOString().split('T')[0],
                item.purchasePrice,
                `"${item.supplier}"`,
                item.status,
                item.assignedTo || 'N/A'
            ].join(','))
        ].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=inventory-export.csv');
        res.send(csv);
    } catch (error) {
        console.error("Export Inventory Error:", error);
        res.status(500).json({ error: "Failed to export inventory" });
    }
};
