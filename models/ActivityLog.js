const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
    id: {
        type: String,
        required: true,
        unique: true
    },
    adminId: {
        type: String,
        required: true
    },
    adminEmail: {
        type: String,
        required: true
    },
    action: {
        type: String,
        required: true,
        enum: ['approve_doctor', 'reject_doctor', 'suspend_user', 'activate_user', 'delete_user', 'send_announcement', 'bulk_approve', 'bulk_reject', 'update_settings', 'other']
    },
    targetType: {
        type: String,
        enum: ['user', 'doctor', 'patient', 'system', 'announcement']
    },
    targetId: {
        type: String
    },
    details: {
        type: String
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed
    },
    ipAddress: {
        type: String
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

activityLogSchema.index({ adminId: 1, timestamp: -1 });
activityLogSchema.index({ action: 1, timestamp: -1 });
activityLogSchema.index({ timestamp: -1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
