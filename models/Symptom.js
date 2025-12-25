const mongoose = require("mongoose");
const { v4: uuidv4 } = require('uuid');

const symptomSchema = new mongoose.Schema({
    id: {
        type: String,
        default: uuidv4,
        unique: true
    },
    userId: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    severity: {
        type: String,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

module.exports = mongoose.model("Symptom", symptomSchema);
