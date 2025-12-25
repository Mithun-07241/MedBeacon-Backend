const mongoose = require("mongoose");

const patientDetailSchema = new mongoose.Schema({
    userId: {
        type: String,
        ref: "User",
        required: true,
        unique: true
    },
    dateOfBirth: {
        type: String,
        required: true
    },
    phoneNumber: {
        type: String,
        required: true
    },
    address: {
        type: String,
        required: true
    },
    allergies: {
        type: String,
        default: ""
    },
    profilePicUrl: {
        type: String
    },
    treatmentFileUrl: {
        type: String
    },
    age: { // Derived or stored, keeping it simple as stored for now as per previous logic
        type: Number
    },
    gender: {
        type: String
    }
}, {
    timestamps: true
});

module.exports = mongoose.model("PatientDetail", patientDetailSchema);
