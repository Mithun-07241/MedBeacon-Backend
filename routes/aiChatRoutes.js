const express = require('express');
const router = express.Router();
const {
    sendMessage,
    getSessions,
    createSession,
    getSessionMessages,
    renameSession,
    deleteSession
} = require('../controllers/aiChatController');
const authMiddleware = require('../middleware/auth');

// Session Management
router.get('/sessions', authMiddleware, getSessions);
router.post('/sessions', authMiddleware, createSession);
router.get('/sessions/:sessionId', authMiddleware, getSessionMessages);
router.patch('/sessions/:sessionId', authMiddleware, renameSession);
router.delete('/sessions/:sessionId', authMiddleware, deleteSession);

// Chat Message
router.post('/message', authMiddleware, sendMessage);

module.exports = router;
