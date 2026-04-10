const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { adminOnly } = require('../middleware/adminMiddleware');
const inventoryController = require('../controllers/inventoryController');

// All routes require authentication
router.use(authMiddleware);

// Read-only: any authenticated user (used by billing to pick inventory items)
router.get('/items/public', inventoryController.getInventoryItems);

// Doctor + Admin middleware — allows both doctors and admin roles
const doctorOrAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
    }
    if (!['admin', 'clinic_admin', 'doctor'].includes(req.user.role)) {
        return res.status(403).json({ error: "Doctor or Admin access required" });
    }
    next();
};

// Routes accessible by doctors AND admins
router.get('/items', doctorOrAdmin, inventoryController.getInventoryItems);
router.get('/items/:id', doctorOrAdmin, inventoryController.getInventoryItemById);
router.post('/items', doctorOrAdmin, inventoryController.addInventoryItem);
router.patch('/items/:id', doctorOrAdmin, inventoryController.updateInventoryItem);
router.delete('/items/:id', doctorOrAdmin, inventoryController.deleteInventoryItem);

// Assign item to user (admin only)
router.patch('/items/:id/assign', adminOnly, inventoryController.assignItem);

// Get items grouped by category (doctor + admin)
router.get('/by-category', doctorOrAdmin, inventoryController.getItemsByCategory);

// Export inventory to CSV (admin only)
router.get('/export', adminOnly, inventoryController.exportInventory);

module.exports = router;
