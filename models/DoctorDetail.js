const mongoose = require("mongoose");

const doctorDetailSchema = new mongoose.Schema({
    userId: {
        type: String, // Matching User.id UUID string
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
    medicalLicense: {
        type: String
    },
    specialization: {
        type: String
    },
    hospitalAffiliation: {
        type: String
    },
    hospital: {
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
    bio: {
        type: String
    },
    education: {
        type: String
    },
    graduationYear: {
        type: String
    },
    certifications: {
        type: String
    },
    languages: {
        type: String
    },
    availability: {
        type: String,
        enum: ["available", "busy", "unavailable"],
        default: "available"
    },
    expertise: {
        type: [String]
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
