const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const upload = require('../middleware/upload');
const clinicController = require('../controllers/clinicController');

// Public route - anyone can fetch clinic profile
router.get('/profile', clinicController.getClinicProfile);

// Admin-only routes
router.patch('/profile', authMiddleware, clinicController.updateClinicProfile);
router.post('/upload-logo', authMiddleware, upload.single('logo'), clinicController.uploadClinicLogo);

module.exports = router;
