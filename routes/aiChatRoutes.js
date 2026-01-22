const express = require('express');
const router = express.Router();
const { sendMessage } = require('../controllers/aiChatController');
const authMiddleware = require('../middleware/auth');

// AI Chat endpoint
router.post('/message', authMiddleware, sendMessage);

module.exports = router;
