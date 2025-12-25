const mongoose = require("mongoose");
const { v4: uuidv4 } = require('uuid');

const medicalRecordSchema = new mongoose.Schema({
    id: {
        type: String,
        default: uuidv4,
        unique: true
    },
    patientId: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    type: {
        type: String, // e.g., "Lab Report", "Imaging", "Prescription"
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    doctorName: {
        type: String
    },
    fileUrl: {
        type: String, // URL to stored file
        required: true
    },
    size: {
        type: String // e.g. "2.4 MB" - simplifying for display
    }
}, {
    timestamps: true
});

module.exports = mongoose.model("MedicalRecord", medicalRecordSchema);
