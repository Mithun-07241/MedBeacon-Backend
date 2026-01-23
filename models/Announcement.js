const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
    id: {
        type: String,
        required: true,
        unique: true
    },
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    targetAudience: {
        type: String,
        enum: ['all', 'patients', 'doctors', 'verified_doctors'],
        default: 'all'
    },
    createdBy: {
        type: String,
        required: true
    },
    createdByEmail: {
        type: String
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium'
    },
    status: {
        type: String,
        enum: ['draft', 'sent'],
        default: 'sent'
    },
    sentAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

announcementSchema.index({ targetAudience: 1, sentAt: -1 });
announcementSchema.index({ createdBy: 1, sentAt: -1 });

module.exports = mongoose.model('Announcement', announcementSchema);
