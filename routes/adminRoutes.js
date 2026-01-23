const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { adminOnly } = require('../middleware/adminMiddleware');
const adminController = require('../controllers/adminController');

// All routes require authentication and admin role
router.use(authMiddleware);
router.use(adminOnly);

// Get pending doctors
router.get('/pending-doctors', adminController.getPendingDoctors);

// Verify (approve/reject) doctor
router.patch('/verify-doctor/:userId', adminController.verifyDoctor);

// Get admin statistics
router.get('/stats', adminController.getAdminStats);

// Get all doctors with optional status filter
router.get('/doctors', adminController.getAllDoctors);

// Get all users with filters
router.get('/users', adminController.getAllUsers);

// Get all patients
router.get('/patients', adminController.getAllPatients);

// Get all appointments
router.get('/appointments', adminController.getAllAppointments);

// Get analytics data
router.get('/analytics', adminController.getAnalytics);

// Update user
router.patch('/users/:userId', adminController.updateUser);

module.exports = router;
