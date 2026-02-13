const mongoose = require("mongoose");

const pharmacyTransactionSchema = new mongoose.Schema({
    id: {
        type: String,
        required: true,
        unique: true
    },
    itemId: {
        type: String,
        ref: "PharmacyItem",
        required: true
    },
    type: {
        type: String,
        required: true,
        enum: ["purchase", "sale", "adjustment", "return", "expired"]
    },
    quantity: {
        type: Number,
        required: true
    },
    previousQuantity: {
        type: Number,
        required: true,
        min: 0
    },
    newQuantity: {
        type: Number,
        required: true,
        min: 0
    },
    performedBy: {
        type: String,
        ref: "User",
        required: true
    },
    notes: {
        type: String,
        default: ""
    }
}, {
    timestamps: true
});

// Indexes for efficient queries
pharmacyTransactionSchema.index({ itemId: 1, createdAt: -1 });
pharmacyTransactionSchema.index({ performedBy: 1 });
pharmacyTransactionSchema.index({ type: 1 });

module.exports = mongoose.model("PharmacyTransaction", pharmacyTransactionSchema);
