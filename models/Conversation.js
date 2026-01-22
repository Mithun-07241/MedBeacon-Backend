const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        index: true
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
    lastActive: {
        type: Date,
        default: Date.now
    },
    metadata: {
        totalMessages: {
            type: Number,
            default: 0
        },
        totalToolCalls: {
            type: Number,
            default: 0
        }
    }
}, {
    timestamps: true
});

// Index for efficient queries
conversationSchema.index({ userId: 1, lastActive: -1 });

// Update lastActive on save
conversationSchema.pre('save', function (next) {
    this.lastActive = new Date();
    this.metadata.totalMessages = this.messages.length;
    next();
});

module.exports = mongoose.model('Conversation', conversationSchema);
