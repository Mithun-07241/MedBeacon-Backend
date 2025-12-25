const mongoose = require("mongoose");
const { v4: uuidv4 } = require('uuid');

const ticketSchema = new mongoose.Schema({
    id: {
        type: String,
        default: uuidv4,
        unique: true
    },
    userId: {
        type: String,
        required: true
    },
    subject: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ["Open", "In Progress", "Resolved", "Closed"],
        default: "Open"
    },
    category: {
        type: String, // e.g. "Technical", "Billing", "General"
        default: "General"
    }
}, {
    timestamps: true
});

module.exports = mongoose.model("Ticket", ticketSchema);
