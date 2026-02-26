const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { adminOnly } = require('../middleware/adminMiddleware');
const inventoryController = require('../controllers/inventoryController');

// All routes require authentication
router.use(authMiddleware);

// Read-only: any authenticated user (used by billing to pick inventory items)
router.get('/items/public', inventoryController.getInventoryItems);

// All routes below require admin role
router.use(adminOnly);

// Add new inventory item
router.post('/items', inventoryController.addInventoryItem);

// Get all inventory items
router.get('/items', inventoryController.getInventoryItems);

// Get inventory item by ID
router.get('/items/:id', inventoryController.getInventoryItemById);

// Update inventory item
router.patch('/items/:id', inventoryController.updateInventoryItem);

// Delete inventory item
router.delete('/items/:id', inventoryController.deleteInventoryItem);

// Assign item to user
router.patch('/items/:id/assign', inventoryController.assignItem);

// Get items grouped by category
router.get('/by-category', inventoryController.getItemsByCategory);

// Export inventory to CSV
router.get('/export', inventoryController.exportInventory);

module.exports = router;
