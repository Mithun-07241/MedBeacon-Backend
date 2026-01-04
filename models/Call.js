const mongoose = require('mongoose');

const CallSchema = new mongoose.Schema({
    callId: {
        type: String,
        required: true,
        unique: true
    },
    callerId: {
        type: String,
        required: true,
        ref: 'User'
    },
    receiverId: {
        type: String,
        required: true,
        ref: 'User'
    },
    callType: {
        type: String,
        enum: ['voice', 'video'],
        required: true
    },
    status: {
        type: String,
        enum: ['initiated', 'ringing', 'accepted', 'rejected', 'ended', 'missed'],
        default: 'initiated'
    },
    startTime: {
        type: Date,
        default: Date.now
    },
    endTime: {
        type: Date
    },
    duration: {
        type: Number, // in seconds
        default: 0
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Call', CallSchema);
