const mongoose = require("mongoose");
const { v4: uuidv4 } = require('uuid');

const reportSchema = new mongoose.Schema({
    id: {
        type: String,
        default: uuidv4,
        unique: true
    },
    doctorId: {
        type: String,
        required: true
    },
    title: {
        type: String,
        required: true
    },
    date: {
        type: Date,
        default: Date.now
    },
    type: {
        type: String // e.g., "Administrative", "Clinical", "Audit"
    },
    status: {
        type: String,
        enum: ["Ready", "Processing", "Review Needed"],
        default: "Processing"
    },
    fileUrl: {
        type: String
    }
}, {
    timestamps: true
});

module.exports = mongoose.model("Report", reportSchema);
