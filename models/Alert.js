const mongoose = require("mongoose");
const { v4: uuidv4 } = require('uuid');

const alertSchema = new mongoose.Schema({
    id: {
        type: String,
        default: uuidv4,
        unique: true
    },
    patientId: {
        type: String,
        required: true
    },
    doctorId: {
        type: String,
        default: null
    },
    message: {
        type: String,
        required: true
    },
    severity: {
        type: String,
        required: true
    },
    status: {
        type: String,
        default: "pending"
    }
}, {
    timestamps: true
});

module.exports = mongoose.model("Alert", alertSchema);
