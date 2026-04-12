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
const { logPhiAccess } = require('../middleware/phiAuditLogger');

// Session Management
router.get('/sessions', authMiddleware, logPhiAccess('ai_chat'), getSessions);
router.post('/sessions', authMiddleware, logPhiAccess('ai_chat'), createSession);
router.get('/sessions/:sessionId', authMiddleware, logPhiAccess('ai_chat'), getSessionMessages);
router.patch('/sessions/:sessionId', authMiddleware, logPhiAccess('ai_chat'), renameSession);
router.delete('/sessions/:sessionId', authMiddleware, logPhiAccess('ai_chat'), deleteSession);

// Chat Message
router.post('/message', authMiddleware, logPhiAccess('ai_chat'), sendMessage);

// Manual Autonomous Trigger (For Testing)
router.post('/trigger-autonomy', authMiddleware, async (req, res) => {
    const { runProactiveBriefings } = require('../services/autonomousCronJob');
    runProactiveBriefings(); // Run asynchronously in background
    res.json({ message: '🤖 Autonomous agent awakened! It is now running background tasks and will ping your chat shortly.' });
});

module.exports = router;

