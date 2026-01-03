const mongoose = require("mongoose");

const patientDetailSchema = new mongoose.Schema({
    userId: {
        type: String,
        ref: "User",
        required: true,
        unique: true
    },
    firstName: {
        type: String
    },
    lastName: {
        type: String
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
        type: String
    },
    treatmentFileUrl: {
        type: String
    },
    profilePicUrl: {
        type: String
    },
    age: {
        type: String
    },
    gender: {
        type: String
    },
    bio: {
        type: String
    },
    emergencyContactName: {
        type: String
    },
    emergencyContactPhone: {
        type: String
    },
    bloodType: {
        type: String
    },
    medicalHistory: {
        type: String
    }
}, {
    timestamps: true
});

module.exports = mongoose.model("PatientDetail", patientDetailSchema);
