const Conversation = require('../models/Conversation');

/**
 * Get or create conversation for a user
 */
async function getConversation(userId) {
    try {
        let conversation = await Conversation.findOne({ userId }).sort({ lastActive: -1 });

        if (!conversation) {
            conversation = await Conversation.create({
                userId,
                messages: [],
                metadata: {
                    totalMessages: 0,
                    totalToolCalls: 0
                }
            });
        }

        return conversation;
    } catch (error) {
        console.error('Error getting conversation:', error);
        throw error;
    }
}

/**
 * Add message to conversation history
 */
async function addMessage(userId, role, content, toolsExecuted = []) {
    try {
        const conversation = await getConversation(userId);

        conversation.messages.push({
            role,
            content,
            timestamp: new Date(),
            toolsExecuted
        });

        // Keep only last 50 messages to prevent memory overflow
        if (conversation.messages.length > 50) {
            conversation.messages = conversation.messages.slice(-50);
        }

        // Update metadata
        if (toolsExecuted && toolsExecuted.length > 0) {
            conversation.metadata.totalToolCalls += toolsExecuted.length;
        }

        await conversation.save();
        return conversation;
    } catch (error) {
        console.error('Error adding message:', error);
        throw error;
    }
}

/**
 * Get conversation history for AI context
 * Returns last N messages formatted for AI
 */
async function getConversationHistory(userId, limit = 20) {
    try {
        const conversation = await getConversation(userId);

        // Get last N messages
        const recentMessages = conversation.messages.slice(-limit);

        // Format for AI (exclude system messages and toolsExecuted)
        return recentMessages.map(msg => ({
            role: msg.role,
            content: msg.content
        }));
    } catch (error) {
        console.error('Error getting conversation history:', error);
        return [];
    }
}

/**
 * Clear conversation history for a user
 */
async function clearConversation(userId) {
    try {
        await Conversation.findOneAndUpdate(
            { userId },
            {
                messages: [],
                metadata: {
                    totalMessages: 0,
                    totalToolCalls: 0
                }
            }
        );
        return true;
    } catch (error) {
        console.error('Error clearing conversation:', error);
        return false;
    }
}

/**
 * Get conversation summary/stats
 */
async function getConversationStats(userId) {
    try {
        const conversation = await getConversation(userId);

        return {
            totalMessages: conversation.metadata.totalMessages,
            totalToolCalls: conversation.metadata.totalToolCalls,
            lastActive: conversation.lastActive,
            messageCount: conversation.messages.length
        };
    } catch (error) {
        console.error('Error getting conversation stats:', error);
        return null;
    }
}

module.exports = {
    getConversation,
    addMessage,
    getConversationHistory,
    clearConversation,
    getConversationStats
};
