const mongoose = require("mongoose");
const { v4: uuidv4 } = require('uuid');

const healthMetricSchema = new mongoose.Schema({
    id: {
        type: String,
        default: uuidv4,
        unique: true
    },
    patientId: {
        type: String,
        required: true
    },
    heartRate: Number,
    temperature: String,
    bloodPressureSystolic: Number,
    bloodPressureDiastolic: Number,
    weight: Number,
    oxygenSaturation: Number,
    timestamp: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

module.exports = mongoose.model("HealthMetric", healthMetricSchema);
