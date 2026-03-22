/**
 * PHI Audit Log – HIPAA §164.312(b)
 *
 * Stored inside each clinic's own MongoDB database (not the global ActivityLog).
 * Records every read, create, update, delete, or export of Protected Health Information.
 */
const mongoose = require('mongoose');

const phiAuditLogSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        index: true
    },
    userEmail: {
        type: String,
        default: 'unknown'
    },
    role: {
        type: String,
        required: true
    },
    action: {
        type: String,
        required: true,
        enum: ['read', 'create', 'update', 'delete', 'export', 'download']
    },
    resourceType: {
        type: String,
        required: true,
        enum: [
            'medical_record',
            'health_metric',
            'medication',
            'appointment',
            'ai_chat',
            'billing',
            'patient_profile',
            'chat_message',
            'pharmacy',
            'report'
        ]
    },
    resourceId: {
        type: String,
        default: null
    },
    patientId: {
        type: String,
        default: null,
        index: true
    },
    ipAddress: {
        type: String,
        default: 'unknown'
    },
    userAgent: {
        type: String,
        default: 'unknown'
    },
    httpMethod: {
        type: String,
        required: true
    },
    path: {
        type: String,
        required: true
    },
    statusCode: {
        type: Number,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    }
}, {
    // TTL: auto-delete after 6 years (HIPAA minimum retention is 6 years)
    // Comment this out if you want to keep logs indefinitely
    // expireAfterSeconds: 60 * 60 * 24 * 365 * 6
});

phiAuditLogSchema.index({ userId: 1, timestamp: -1 });
phiAuditLogSchema.index({ patientId: 1, timestamp: -1 });
phiAuditLogSchema.index({ resourceType: 1, timestamp: -1 });

module.exports = phiAuditLogSchema;
