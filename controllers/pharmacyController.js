const PharmacyItem = require("../models/PharmacyItem");
const PharmacyTransaction = require("../models/PharmacyTransaction");
const { v4: uuidv4 } = require("uuid");

/**
 * Add new pharmacy item
 */
exports.addPharmacyItem = async (req, res) => {
    try {
        const {
            name,
            category,
            description,
            manufacturer,
            batchNumber,
            expiryDate,
            quantity,
            unit,
            price,
            reorderLevel,
            location
        } = req.body;

        // Validate required fields
        if (!name || !category || !manufacturer || !batchNumber || !expiryDate || !unit || price === undefined) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const item = await PharmacyItem.create({
            id: uuidv4(),
            name,
            category,
            description: description || "",
            manufacturer,
            batchNumber,
            expiryDate: new Date(expiryDate),
            quantity: quantity || 0,
            unit,
            price,
            reorderLevel: reorderLevel || 10,
            location: location || ""
        });

        res.status(201).json({
            message: "Pharmacy item added successfully",
            item
        });
    } catch (error) {
        console.error("Add Pharmacy Item Error:", error);
        res.status(500).json({ error: "Failed to add pharmacy item" });
    }
};

/**
 * Get all pharmacy items with filters
 */
exports.getPharmacyItems = async (req, res) => {
    try {
        const { category, status, search, limit = 100 } = req.query;

        const match = {};
        if (category) match.category = category;
        if (status) match.status = status;
        if (search) {
            match.$or = [
                { name: { $regex: search, $options: 'i' } },
                { manufacturer: { $regex: search, $options: 'i' } },
                { batchNumber: { $regex: search, $options: 'i' } }
            ];
        }

        const items = await PharmacyItem.find(match)
            .sort({ createdAt: -1 })
            .limit(parseInt(limit));

        // Calculate statistics
        const stats = {
            total: items.length,
            inStock: items.filter(i => i.status === 'in_stock').length,
            lowStock: items.filter(i => i.status === 'low_stock').length,
            outOfStock: items.filter(i => i.status === 'out_of_stock').length,
            expired: items.filter(i => i.status === 'expired').length
        };

        res.json({ items, stats });
    } catch (error) {
        console.error("Get Pharmacy Items Error:", error);
        res.status(500).json({ error: "Failed to fetch pharmacy items" });
    }
};

/**
 * Get pharmacy item by ID
 */
exports.getPharmacyItemById = async (req, res) => {
    try {
        const { id } = req.params;
        const item = await PharmacyItem.findOne({ id });

        if (!item) {
            return res.status(404).json({ error: "Item not found" });
        }

        res.json({ item });
    } catch (error) {
        console.error("Get Pharmacy Item Error:", error);
        res.status(500).json({ error: "Failed to fetch item" });
    }
};

/**
 * Update pharmacy item
 */
exports.updatePharmacyItem = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const item = await PharmacyItem.findOne({ id });
        if (!item) {
            return res.status(404).json({ error: "Item not found" });
        }

        // Update allowed fields
        const allowedFields = [
            'name', 'category', 'description', 'manufacturer', 'batchNumber',
            'expiryDate', 'quantity', 'unit', 'price', 'reorderLevel', 'location'
        ];

        allowedFields.forEach(field => {
            if (updates[field] !== undefined) {
                if (field === 'expiryDate') {
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
        console.error("Update Pharmacy Item Error:", error);
        res.status(500).json({ error: "Failed to update item" });
    }
};

/**
 * Delete pharmacy item
 */
exports.deletePharmacyItem = async (req, res) => {
    try {
        const { id } = req.params;

        const item = await PharmacyItem.findOne({ id });
        if (!item) {
            return res.status(404).json({ error: "Item not found" });
        }

        await PharmacyItem.deleteOne({ id });

        res.json({ message: "Item deleted successfully" });
    } catch (error) {
        console.error("Delete Pharmacy Item Error:", error);
        res.status(500).json({ error: "Failed to delete item" });
    }
};

/**
 * Record stock transaction
 */
exports.recordTransaction = async (req, res) => {
    try {
        const { itemId, type, quantity, notes } = req.body;

        if (!itemId || !type || quantity === undefined) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const item = await PharmacyItem.findOne({ id: itemId });
        if (!item) {
            return res.status(404).json({ error: "Item not found" });
        }

        const previousQuantity = item.quantity;
        let newQuantity;

        // Calculate new quantity based on transaction type
        switch (type) {
            case 'purchase':
            case 'return':
                newQuantity = previousQuantity + Math.abs(quantity);
                break;
            case 'sale':
            case 'expired':
                newQuantity = previousQuantity - Math.abs(quantity);
                break;
            case 'adjustment':
                newQuantity = quantity; // Direct quantity set
                break;
            default:
                return res.status(400).json({ error: "Invalid transaction type" });
        }

        // Ensure quantity doesn't go negative
        if (newQuantity < 0) {
            return res.status(400).json({ error: "Insufficient stock" });
        }

        // Create transaction record
        const transaction = await PharmacyTransaction.create({
            id: uuidv4(),
            itemId,
            type,
            quantity: type === 'adjustment' ? quantity - previousQuantity : (type === 'purchase' || type === 'return' ? quantity : -quantity),
            previousQuantity,
            newQuantity,
            performedBy: req.user.id,
            notes: notes || ""
        });

        // Update item quantity
        item.quantity = newQuantity;
        await item.save();

        res.status(201).json({
            message: "Transaction recorded successfully",
            transaction,
            item
        });
    } catch (error) {
        console.error("Record Transaction Error:", error);
        res.status(500).json({ error: "Failed to record transaction" });
    }
};

/**
 * Get transaction history
 */
exports.getTransactions = async (req, res) => {
    try {
        const { itemId, type, startDate, endDate, limit = 100 } = req.query;

        const match = {};
        if (itemId) match.itemId = itemId;
        if (type) match.type = type;
        if (startDate || endDate) {
            match.createdAt = {};
            if (startDate) match.createdAt.$gte = new Date(startDate);
            if (endDate) match.createdAt.$lte = new Date(endDate);
        }

        const transactions = await PharmacyTransaction.find(match)
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .lean();

        // Fetch item details
        const itemIds = [...new Set(transactions.map(t => t.itemId))];
        const items = await PharmacyItem.find({ id: { $in: itemIds } })
            .select('id name category');

        const itemMap = {};
        items.forEach(i => { itemMap[i.id] = i; });

        // Enrich transactions with item data
        const enrichedTransactions = transactions.map(t => ({
            ...t,
            item: itemMap[t.itemId] || null
        }));

        res.json({ transactions: enrichedTransactions });
    } catch (error) {
        console.error("Get Transactions Error:", error);
        res.status(500).json({ error: "Failed to fetch transactions" });
    }
};

/**
 * Get low stock items
 */
exports.getLowStockItems = async (req, res) => {
    try {
        const items = await PharmacyItem.find({
            status: { $in: ['low_stock', 'out_of_stock'] }
        }).sort({ quantity: 1 });

        res.json({ items, count: items.length });
    } catch (error) {
        console.error("Get Low Stock Items Error:", error);
        res.status(500).json({ error: "Failed to fetch low stock items" });
    }
};

/**
 * Get expiring items
 */
exports.getExpiringItems = async (req, res) => {
    try {
        const { days = 30 } = req.query;
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + parseInt(days));

        const items = await PharmacyItem.find({
            expiryDate: { $lte: futureDate, $gte: new Date() },
            status: { $ne: 'expired' }
        }).sort({ expiryDate: 1 });

        res.json({ items, count: items.length });
    } catch (error) {
        console.error("Get Expiring Items Error:", error);
        res.status(500).json({ error: "Failed to fetch expiring items" });
    }
};
