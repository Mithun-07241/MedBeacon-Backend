const mongoose = require("mongoose");

const inventoryItemSchema = new mongoose.Schema({
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
    category: {
        type: String,
        required: true,
        enum: [
            "Medical Equipment",
            "Office Supplies",
            "Furniture",
            "IT Equipment",
            "Laboratory Equipment",
            "Diagnostic Tools",
            "Safety Equipment",
            "Other"
        ]
    },
    description: {
        type: String,
        default: ""
    },
    quantity: {
        type: Number,
        required: true,
        min: 0,
        default: 1
    },
    unit: {
        type: String,
        required: true,
        enum: ["pieces", "sets", "units", "boxes", "items"]
    },
    location: {
        type: String,
        default: ""
    },
    purchaseDate: {
        type: Date,
        required: true
    },
    purchasePrice: {
        type: Number,
        required: true,
        min: 0
    },
    supplier: {
        type: String,
        default: ""
    },
    status: {
        type: String,
        enum: ["available", "in_use", "maintenance", "damaged", "disposed"],
        default: "available"
    },
    assignedTo: {
        type: String,
        ref: "User"
    },
    notes: {
        type: String,
        default: ""
    }
}, {
    timestamps: true
});

// Indexes for efficient queries
inventoryItemSchema.index({ name: 1 });
inventoryItemSchema.index({ category: 1 });
inventoryItemSchema.index({ status: 1 });
inventoryItemSchema.index({ assignedTo: 1 });

module.exports = mongoose.model("InventoryItem", inventoryItemSchema);
