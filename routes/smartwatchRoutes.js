const express = require('express');
const router = express.Router();
const smartwatchController = require('../controllers/smartwatchController');
const authMiddleware = require('../middleware/auth');

// All routes require authentication
router.use(authMiddleware);

// Sync smartwatch data
router.post('/sync', smartwatchController.syncData);

// Get smartwatch data for a patient
router.get('/data/:patientId', smartwatchController.getData);

// Get latest smartwatch data
router.get('/latest/:patientId', smartwatchController.getLatest);

// Get smartwatch statistics
router.get('/stats/:patientId', smartwatchController.getStats);

// Disconnect device
router.delete('/disconnect', smartwatchController.disconnect);

module.exports = router;
