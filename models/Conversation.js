const mongoose = require('mongoose');

// Doctor-Patient Conversation Schema
const conversationSchema = new mongoose.Schema({
    doctorId: {
        type: String,
        required: true,
        index: true
    },
    patientId: {
        type: String,
        required: true,
        index: true
    },
    lastMessage: {
        type: String,
        default: ''
    },
    lastSender: {
        type: String
    },
    unread: {
        doctor: {
            type: Number,
            default: 0
        },
        patient: {
            type: Number,
            default: 0
        }
    }
}, {
    timestamps: true // Adds createdAt and updatedAt
});

// Compound index for efficient queries
conversationSchema.index({ doctorId: 1, patientId: 1 }, { unique: true });
conversationSchema.index({ updatedAt: -1 });

module.exports = mongoose.model('Conversation', conversationSchema);
