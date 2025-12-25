const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
    doctorId: {
        type: String,
        required: true
    },
    patientId: {
        type: String,
        required: true
    },
    sender: {
        type: String, // User.id
        required: true
    },
    text: {
        type: String,
        required: true
    },
    read: {
        type: Boolean,
        default: false
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

// Index for efficient querying of chat history
messageSchema.index({ doctorId: 1, patientId: 1, timestamp: 1 });

module.exports = mongoose.model("Message", messageSchema);
