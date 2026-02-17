const mongoose = require("mongoose");

const clinicProfileSchema = new mongoose.Schema({
    id: {
        type: String,
        required: true,
        unique: true
    },
    clinicName: {
        type: String,
        required: true,
        trim: true
    },
    clinicLogoUrl: {
        type: String,
        default: null
    },
    address: {
        type: String,
        default: ""
    },
    city: {
        type: String,
        default: ""
    },
    state: {
        type: String,
        default: ""
    },
    zipCode: {
        type: String,
        default: ""
    },
    phone: {
        type: String,
        default: ""
    },
    email: {
        type: String,
        default: ""
    },
    website: {
        type: String,
        default: ""
    },
    taxId: {
        type: String,
        default: ""
    },
    description: {
        type: String,
        default: ""
    },
    isSingleton: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Ensure only one clinic profile exists
clinicProfileSchema.index({ isSingleton: 1 }, { unique: true });

module.exports = mongoose.model("ClinicProfile", clinicProfileSchema);
