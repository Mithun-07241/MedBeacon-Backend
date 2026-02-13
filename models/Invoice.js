const mongoose = require("mongoose");

const invoiceItemSchema = new mongoose.Schema({
    description: {
        type: String,
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 1
    },
    rate: {
        type: Number,
        required: true,
        min: 0
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    }
}, { _id: false });

const invoiceSchema = new mongoose.Schema({
    id: {
        type: String,
        required: true,
        unique: true
    },
    invoiceNumber: {
        type: String,
        required: true,
        unique: true
    },
    doctorId: {
        type: String,
        ref: "User",
        required: true
    },
    patientId: {
        type: String,
        ref: "User",
        required: true
    },
    appointmentId: {
        type: String,
        ref: "Appointment"
    },
    items: {
        type: [invoiceItemSchema],
        required: true,
        validate: {
            validator: function (items) {
                return items && items.length > 0;
            },
            message: "Invoice must have at least one item"
        }
    },
    subtotal: {
        type: Number,
        required: true,
        min: 0
    },
    tax: {
        type: Number,
        default: 0,
        min: 0
    },
    discount: {
        type: Number,
        default: 0,
        min: 0
    },
    total: {
        type: Number,
        required: true,
        min: 0
    },
    status: {
        type: String,
        enum: ["draft", "sent", "paid", "cancelled"],
        default: "draft"
    },
    dueDate: {
        type: Date,
        required: true
    },
    paidDate: {
        type: Date
    },
    notes: {
        type: String,
        default: ""
    }
}, {
    timestamps: true
});

// Index for faster queries
invoiceSchema.index({ doctorId: 1, createdAt: -1 });
invoiceSchema.index({ patientId: 1 });
invoiceSchema.index({ status: 1 });
invoiceSchema.index({ invoiceNumber: 1 });

module.exports = mongoose.model("Invoice", invoiceSchema);
