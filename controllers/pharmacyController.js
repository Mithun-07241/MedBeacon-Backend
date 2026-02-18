const { v4: uuidv4 } = require('uuid');

exports.addPharmacyItem = async (req, res) => {
    try {
        const { PharmacyItem } = req.models;
        const { name, category, description, manufacturer, batchNumber, expiryDate, quantity, unit, price, reorderLevel, location } = req.body;

        if (!name || !category || !manufacturer || !batchNumber || !expiryDate || !unit || price === undefined) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const item = await PharmacyItem.create({
            name, category, description: description || '', manufacturer, batchNumber,
            expiryDate: new Date(expiryDate), quantity: quantity || 0, unit,
            sellingPrice: price, purchasePrice: price, reorderLevel: reorderLevel || 10, location: location || ''
        });

        res.status(201).json({ message: 'Pharmacy item added successfully', item });
    } catch (error) {
        console.error('Add Pharmacy Item Error:', error);
        res.status(500).json({ error: 'Failed to add pharmacy item' });
    }
};

exports.getPharmacyItems = async (req, res) => {
    try {
        const { PharmacyItem } = req.models;
        const { category, search, limit = 100 } = req.query;

        const match = {};
        if (category) match.category = category;
        if (search) {
            match.$or = [
                { name: { $regex: search, $options: 'i' } },
                { manufacturer: { $regex: search, $options: 'i' } },
                { batchNumber: { $regex: search, $options: 'i' } }
            ];
        }

        const items = await PharmacyItem.find(match).sort({ createdAt: -1 }).limit(parseInt(limit));

        const stats = {
            total: items.length,
            lowStock: items.filter(i => i.quantity <= i.reorderLevel && i.quantity > 0).length,
            outOfStock: items.filter(i => i.quantity === 0).length,
        };

        res.json({ items, stats });
    } catch (error) {
        console.error('Get Pharmacy Items Error:', error);
        res.status(500).json({ error: 'Failed to fetch pharmacy items' });
    }
};

exports.getPharmacyItemById = async (req, res) => {
    try {
        const { PharmacyItem } = req.models;
        const { id } = req.params;
        const item = await PharmacyItem.findOne({ id });
        if (!item) return res.status(404).json({ error: 'Item not found' });
        res.json({ item });
    } catch (error) {
        console.error('Get Pharmacy Item Error:', error);
        res.status(500).json({ error: 'Failed to fetch item' });
    }
};

exports.updatePharmacyItem = async (req, res) => {
    try {
        const { PharmacyItem } = req.models;
        const { id } = req.params;
        const updates = req.body;

        const item = await PharmacyItem.findOne({ id });
        if (!item) return res.status(404).json({ error: 'Item not found' });

        const allowedFields = ['name', 'category', 'description', 'manufacturer', 'batchNumber', 'expiryDate', 'quantity', 'unit', 'sellingPrice', 'purchasePrice', 'reorderLevel', 'location'];
        allowedFields.forEach(field => {
            if (updates[field] !== undefined) {
                item[field] = field === 'expiryDate' ? new Date(updates[field]) : updates[field];
            }
        });

        await item.save();
        res.json({ message: 'Item updated successfully', item });
    } catch (error) {
        console.error('Update Pharmacy Item Error:', error);
        res.status(500).json({ error: 'Failed to update item' });
    }
};

exports.deletePharmacyItem = async (req, res) => {
    try {
        const { PharmacyItem } = req.models;
        const { id } = req.params;
        const item = await PharmacyItem.findOne({ id });
        if (!item) return res.status(404).json({ error: 'Item not found' });
        await PharmacyItem.deleteOne({ id });
        res.json({ message: 'Item deleted successfully' });
    } catch (error) {
        console.error('Delete Pharmacy Item Error:', error);
        res.status(500).json({ error: 'Failed to delete item' });
    }
};

exports.recordTransaction = async (req, res) => {
    try {
        const { PharmacyItem, PharmacyTransaction } = req.models;
        const { itemId, type, quantity, notes } = req.body;

        if (!itemId || !type || quantity === undefined) return res.status(400).json({ error: 'Missing required fields' });

        const item = await PharmacyItem.findOne({ id: itemId });
        if (!item) return res.status(404).json({ error: 'Item not found' });

        const previousQuantity = item.quantity;
        let newQuantity;

        switch (type) {
            case 'purchase': case 'return': newQuantity = previousQuantity + Math.abs(quantity); break;
            case 'sale': case 'expired': newQuantity = previousQuantity - Math.abs(quantity); break;
            case 'adjustment': newQuantity = quantity; break;
            default: return res.status(400).json({ error: 'Invalid transaction type' });
        }

        if (newQuantity < 0) return res.status(400).json({ error: 'Insufficient stock' });

        const transaction = await PharmacyTransaction.create({
            itemId: item._id,
            itemName: item.name,
            transactionType: type,
            quantity: type === 'adjustment' ? quantity - previousQuantity : (type === 'purchase' || type === 'return' ? quantity : -quantity),
            performedBy: req.user.id,
            notes: notes || ''
        });

        item.quantity = newQuantity;
        await item.save();

        res.status(201).json({ message: 'Transaction recorded successfully', transaction, item });
    } catch (error) {
        console.error('Record Transaction Error:', error);
        res.status(500).json({ error: 'Failed to record transaction' });
    }
};

exports.getTransactions = async (req, res) => {
    try {
        const { PharmacyTransaction, PharmacyItem } = req.models;
        const { itemId, type, startDate, endDate, limit = 100 } = req.query;

        const match = {};
        if (itemId) match.itemId = itemId;
        if (type) match.transactionType = type;
        if (startDate || endDate) {
            match.createdAt = {};
            if (startDate) match.createdAt.$gte = new Date(startDate);
            if (endDate) match.createdAt.$lte = new Date(endDate);
        }

        const transactions = await PharmacyTransaction.find(match).sort({ createdAt: -1 }).limit(parseInt(limit)).lean();
        res.json({ transactions });
    } catch (error) {
        console.error('Get Transactions Error:', error);
        res.status(500).json({ error: 'Failed to fetch transactions' });
    }
};

exports.getLowStockItems = async (req, res) => {
    try {
        const { PharmacyItem } = req.models;
        const items = await PharmacyItem.find({ $expr: { $lte: ['$quantity', '$reorderLevel'] } }).sort({ quantity: 1 });
        res.json({ items, count: items.length });
    } catch (error) {
        console.error('Get Low Stock Items Error:', error);
        res.status(500).json({ error: 'Failed to fetch low stock items' });
    }
};

exports.getExpiringItems = async (req, res) => {
    try {
        const { PharmacyItem } = req.models;
        const { days = 30 } = req.query;
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + parseInt(days));

        const items = await PharmacyItem.find({
            expiryDate: { $lte: futureDate, $gte: new Date() },
            isActive: true
        }).sort({ expiryDate: 1 });

        res.json({ items, count: items.length });
    } catch (error) {
        console.error('Get Expiring Items Error:', error);
        res.status(500).json({ error: 'Failed to fetch expiring items' });
    }
};
