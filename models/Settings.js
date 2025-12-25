const mongoose = require("mongoose");
const { v4: uuidv4 } = require('uuid');

const settingsSchema = new mongoose.Schema({
    id: {
        type: String,
        default: uuidv4,
        unique: true
    },
    userId: {
        type: String,
        required: true,
        unique: true
    },
    notifications: {
        email: { type: Boolean, default: true },
        push: { type: Boolean, default: true },
        sms: { type: Boolean, default: false }
    },
    theme: {
        type: String,
        enum: ["light", "dark", "system"],
        default: "light"
    },
    language: {
        type: String,
        default: "en"
    }
}, {
    timestamps: true
});

module.exports = mongoose.model("Settings", settingsSchema);
