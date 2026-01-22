const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const aiChatSessionSchema = new mongoose.Schema({
    sessionId: {
        type: String,
        default: uuidv4,
        unique: true,
        index: true
    },
    userId: {
        type: String,
        required: true,
        index: true
    },
    title: {
        type: String,
        default: 'New Chat'
    },
    messages: [{
        role: {
            type: String,
            enum: ['user', 'assistant', 'system'],
            required: true
        },
        content: {
            type: String,
            required: true
        },
        timestamp: {
            type: Date,
            default: Date.now
        },
        toolsExecuted: [{
            type: String
        }]
    }],
    lastMessageAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Indexes for efficient queries
aiChatSessionSchema.index({ userId: 1, lastMessageAt: -1 });
aiChatSessionSchema.index({ sessionId: 1, userId: 1 });

// Update lastMessageAt when messages are added
aiChatSessionSchema.pre('save', function (next) {
    if (this.messages && this.messages.length > 0) {
        this.lastMessageAt = this.messages[this.messages.length - 1].timestamp || new Date();
    }
    next();
});

module.exports = mongoose.model('AiChatSession', aiChatSessionSchema);
