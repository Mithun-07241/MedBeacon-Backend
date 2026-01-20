const mongoose = require("mongoose");
const crypto = require("crypto");

const emailPreferenceSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true,
        },
        email: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,
        },
        unsubscribedFromAll: {
            type: Boolean,
            default: false,
        },
        unsubscribedCategories: {
            marketing: { type: Boolean, default: false },
            notifications: { type: Boolean, default: false },
            appointments: { type: Boolean, default: false },
            reminders: { type: Boolean, default: false },
        },
        unsubscribeToken: {
            type: String,
            unique: true,
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

// Generate unsubscribe token before saving
emailPreferenceSchema.pre("save", function (next) {
    if (!this.unsubscribeToken) {
        this.unsubscribeToken = crypto.randomBytes(32).toString("hex");
    }
    next();
});

// Static method to generate or get token for a user
emailPreferenceSchema.statics.getOrCreateToken = async function (userId, email) {
    let preference = await this.findOne({ userId });

    if (!preference) {
        preference = await this.create({
            userId,
            email,
            unsubscribeToken: crypto.randomBytes(32).toString("hex"),
        });
    }

    return preference.unsubscribeToken;
};

// Method to check if user can receive emails
emailPreferenceSchema.methods.canReceiveEmail = function (category = "general") {
    if (this.unsubscribedFromAll) {
        return false;
    }

    if (category && this.unsubscribedCategories[category]) {
        return false;
    }

    return true;
};

module.exports = mongoose.model("EmailPreference", emailPreferenceSchema);
