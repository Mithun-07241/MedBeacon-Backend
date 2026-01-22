const express = require('express');
const router = express.Router();
const { sendMessage } = require('../controllers/aiChatController');
const authMiddleware = require('../middleware/auth');
const memoryService = require('../services/memoryService');

// AI Chat endpoint
router.post('/message', authMiddleware, sendMessage);

// Get conversation history
router.get('/history', authMiddleware, async (req, res) => {
    try {
        const history = await memoryService.getConversationHistory(req.user.id, 50);
        res.json({ history });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch history' });
    }
});

// Clear conversation history
router.delete('/history', authMiddleware, async (req, res) => {
    try {
        await memoryService.clearConversation(req.user.id);
        res.json({ message: 'Conversation history cleared' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to clear history' });
    }
});

// Get conversation stats
router.get('/stats', authMiddleware, async (req, res) => {
    try {
        const stats = await memoryService.getConversationStats(req.user.id);
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

module.exports = router;
