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
    },
    rating: {
        type: Number,
        min: 1,
        max: 5
    },
    feedback: {
        type: String,
        default: ""
    },
    rated: {
        type: Boolean,
        default: false
    },
    rescheduleOffer: {
        date: { type: String, default: '' },
        time: { type: String, default: '' },
        status: {
            type: String,
            enum: ['pending', 'accepted', 'declined', ''],
            default: ''
        }
    }
}, {
    timestamps: true
});

module.exports = mongoose.model("Appointment", appointmentSchema);
