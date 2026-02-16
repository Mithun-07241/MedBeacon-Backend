const mongoose = require("mongoose");

const serviceItemSchema = new mongoose.Schema({
    id: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        default: ""
    },
    category: {
        type: String,
        required: true,
        enum: ["Consultation", "Diagnostic", "Treatment", "Surgery", "Medication", "Other"]
    },
    defaultPrice: {
        type: Number,
        required: true,
        min: 0
    },
    createdBy: {
        type: String,
        ref: "User"
    },
    isGlobal: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Indexes for efficient queries
serviceItemSchema.index({ name: 1 });
serviceItemSchema.index({ category: 1 });
serviceItemSchema.index({ isGlobal: 1 });
serviceItemSchema.index({ createdBy: 1 });

module.exports = mongoose.model("ServiceItem", serviceItemSchema);
