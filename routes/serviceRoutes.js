const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const serviceController = require('../controllers/serviceController');

// All routes require authentication
router.use(authMiddleware);

// Get all services (global + doctor's custom)
router.get('/services', serviceController.getServices);

// Create custom service (doctors only)
router.post('/services', serviceController.createService);

// Update custom service
router.patch('/services/:id', serviceController.updateService);

// Delete custom service
router.delete('/services/:id', serviceController.deleteService);

module.exports = router;
