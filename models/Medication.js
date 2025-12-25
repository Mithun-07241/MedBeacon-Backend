const mongoose = require("mongoose");
const { v4: uuidv4 } = require('uuid');

const medicationSchema = new mongoose.Schema({
    id: {
        type: String,
        default: uuidv4,
        unique: true
    },
    patientId: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    dosage: {
        type: String,
        required: true
    },
    frequency: {
        type: String, // e.g., "Daily", "Twice Daily"
        required: true
    },
    time: {
        type: String // e.g., "8:00 AM"
    },
    status: {
        type: String,
        enum: ["Active", "Completed", "Paused"],
        default: "Active"
    },
    remaining: {
        type: Number,
        default: 0
    },
    prescribedBy: {
        type: String // Doctor Name or ID
    }
}, {
    timestamps: true
});

module.exports = mongoose.model("Medication", medicationSchema);
