const mongoose = require('mongoose');

const smartwatchDataSchema = new mongoose.Schema({
    patientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    deviceName: {
        type: String,
        required: true
    },
    deviceId: {
        type: String,
        required: true
    },
    heartRate: {
        type: Number,
        default: 0
    },
    steps: {
        type: Number,
        default: 0
    },
    bloodOxygen: {
        type: Number,
        default: 0
    },
    sleepHours: {
        type: Number,
        default: 0
    },
    calories: {
        type: Number,
        default: 0
    },
    batteryLevel: {
        type: Number,
        default: 0
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    syncedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Index for efficient queries
smartwatchDataSchema.index({ patientId: 1, timestamp: -1 });

module.exports = mongoose.model('SmartwatchData', smartwatchDataSchema);
