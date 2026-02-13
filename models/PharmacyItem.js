const mongoose = require("mongoose");

const pharmacyItemSchema = new mongoose.Schema({
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
            "Antibiotics",
            "Pain Relief",
            "Vitamins",
            "Cardiovascular",
            "Diabetes",
            "Respiratory",
            "Gastrointestinal",
            "Dermatology",
            "Neurology",
            "Other"
        ]
    },
    description: {
        type: String,
        default: ""
    },
    manufacturer: {
        type: String,
        required: true
    },
    batchNumber: {
        type: String,
        required: true
    },
    expiryDate: {
        type: Date,
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 0,
        default: 0
    },
    unit: {
        type: String,
        required: true,
        enum: ["tablets", "capsules", "ml", "bottles", "boxes", "vials", "tubes", "sachets"]
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    reorderLevel: {
        type: Number,
        required: true,
        min: 0,
        default: 10
    },
    location: {
        type: String,
        default: ""
    },
    status: {
        type: String,
        enum: ["in_stock", "low_stock", "out_of_stock", "expired"],
        default: "in_stock"
    }
}, {
    timestamps: true
});

// Automatically update status based on quantity and expiry
pharmacyItemSchema.pre('save', function (next) {
    const now = new Date();

    if (this.expiryDate < now) {
        this.status = 'expired';
    } else if (this.quantity === 0) {
        this.status = 'out_of_stock';
    } else if (this.quantity <= this.reorderLevel) {
        this.status = 'low_stock';
    } else {
        this.status = 'in_stock';
    }

    next();
});

// Indexes for efficient queries
pharmacyItemSchema.index({ name: 1 });
pharmacyItemSchema.index({ category: 1 });
pharmacyItemSchema.index({ status: 1 });
pharmacyItemSchema.index({ expiryDate: 1 });

module.exports = mongoose.model("PharmacyItem", pharmacyItemSchema);
