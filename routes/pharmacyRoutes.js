const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const pharmacyController = require('../controllers/pharmacyController');

// All routes require authentication
router.use(authMiddleware);

// Add new pharmacy item
router.post('/items', pharmacyController.addPharmacyItem);

// Get all pharmacy items
router.get('/items', pharmacyController.getPharmacyItems);

// Get pharmacy item by ID
router.get('/items/:id', pharmacyController.getPharmacyItemById);

// Update pharmacy item
router.patch('/items/:id', pharmacyController.updatePharmacyItem);

// Delete pharmacy item
router.delete('/items/:id', pharmacyController.deletePharmacyItem);

// Record stock transaction
router.post('/transactions', pharmacyController.recordTransaction);

// Get transaction history
router.get('/transactions', pharmacyController.getTransactions);

// Get low stock items
router.get('/low-stock', pharmacyController.getLowStockItems);

// Get expiring items
router.get('/expiring', pharmacyController.getExpiringItems);

module.exports = router;
