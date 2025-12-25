const mongoose = require("mongoose");

const doctorDetailSchema = new mongoose.Schema({
    userId: {
        type: String, // Matching User.id UUID string
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
    medicalLicense: {
        type: String
    },
    specialization: {
        type: String
    },
    hospitalAffiliation: {
        type: String
    },
    proofFileUrl: {
        type: String
    },
    profilePicUrl: {
        type: String
    },
    experience: {
        type: String
    },
    gender: {
        type: String
    },
    verificationStatus: {
        type: String,
        enum: ["pending", "verified", "rejected"],
        default: "pending"
    }
}, {
    timestamps: true
});

module.exports = mongoose.model("DoctorDetail", doctorDetailSchema);
