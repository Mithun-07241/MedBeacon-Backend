const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema({
    patientId: {
        type: String, // referring to User.id (UUID)
        ref: "User",
        required: true
    },
    doctorId: {
        type: String, // referring to User.id (UUID)
        ref: "User",
        required: true
    },
    date: {
        type: String,
        required: true
    },
    time: {
        type: String,
        required: true
    },
    reason: {
        type: String,
        required: true
    },
    notes: {
        type: String,
        default: ""
    },
    status: {
        type: String,
        enum: ["pending", "confirmed", "rejected", "completed", "cancelled"],
        default: "pending"
    }
}, {
    timestamps: true
});

module.exports = mongoose.model("Appointment", appointmentSchema);
