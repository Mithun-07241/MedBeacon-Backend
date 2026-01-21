const mongoose = require("mongoose");
const { v4: uuidv4 } = require('uuid');

const userSchema = new mongoose.Schema({
    id: {
        type: String,
        default: uuidv4,
        unique: true
    },
    username: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ["patient", "doctor"],
        required: true
    },
    profilePicUrl: {
        type: String,
        default: null
    },
    profileCompleted: {
        type: Boolean,
        default: false
    },
    verificationStatus: {
        type: String,
        enum: ["pending", "verified", "rejected", "under_review"],
        default: "pending"
    },
    otp: {
        type: String
    },
    otpExpires: {
        type: Date
    },
    fcmToken: {
        type: String,
        default: null
    },
    fcmPlatform: {
        type: String,
        default: null
    },
    fcmDeviceId: {
        type: String,
        default: null
    },
    fcmUpdatedAt: {
        type: Date,
        default: null
    },
    isOnline: {
        type: Boolean,
        default: false
    },
    lastSeen: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

module.exports = mongoose.model("User", userSchema);
