const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema({
    doctorId: {
        type: String,
        required: true
    },
    patientId: {
        type: String,
        required: true
    },
    lastMessage: String,
    lastSender: String,
    unread: {
        doctor: { type: Number, default: 0 },
        patient: { type: Number, default: 0 }
    }
}, {
    timestamps: true
});

conversationSchema.index({ doctorId: 1, patientId: 1 }, { unique: true });

module.exports = mongoose.model("Conversation", conversationSchema);
