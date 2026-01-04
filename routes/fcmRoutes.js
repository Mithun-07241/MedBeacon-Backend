const express = require('express');
const router = express.Router();
const { updateFCMToken, removeFCMToken } = require('../controllers/fcmController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

router.post('/token', updateFCMToken);
router.delete('/token', removeFCMToken);

module.exports = router;
