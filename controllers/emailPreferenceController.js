const EmailPreference = require("../models/EmailPreference");
const User = require("../models/User");

// Get unsubscribe page data
exports.getUnsubscribePage = async (req, res) => {
    try {
        const { token } = req.params;

        const preference = await EmailPreference.findOne({ unsubscribeToken: token })
            .populate("userId", "username email");

        if (!preference) {
            return res.status(404).json({
                success: false,
                message: "Invalid unsubscribe link",
            });
        }

        res.json({
            success: true,
            data: {
                email: preference.email,
                username: preference.userId?.username,
                preferences: {
                    unsubscribedFromAll: preference.unsubscribedFromAll,
                    categories: preference.unsubscribedCategories,
                },
            },
        });
    } catch (error) {
        console.error("Error fetching unsubscribe page:", error);
        res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};

// Update email preferences
exports.updatePreferences = async (req, res) => {
    try {
        const { token } = req.params;
        const { unsubscribedFromAll, unsubscribedCategories } = req.body;

        const preference = await EmailPreference.findOne({ unsubscribeToken: token });

        if (!preference) {
            return res.status(404).json({
                success: false,
                message: "Invalid unsubscribe link",
            });
        }

        // Update preferences
        if (typeof unsubscribedFromAll === "boolean") {
            preference.unsubscribedFromAll = unsubscribedFromAll;
        }

        if (unsubscribedCategories) {
            preference.unsubscribedCategories = {
                ...preference.unsubscribedCategories,
                ...unsubscribedCategories,
            };
        }

        await preference.save();

        res.json({
            success: true,
            message: "Email preferences updated successfully",
            data: {
                unsubscribedFromAll: preference.unsubscribedFromAll,
                categories: preference.unsubscribedCategories,
            },
        });
    } catch (error) {
        console.error("Error updating preferences:", error);
        res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};

// Get user's own preferences (authenticated route)
exports.getMyPreferences = async (req, res) => {
    try {
        const userId = req.user._id;

        let preference = await EmailPreference.findOne({ userId });

        if (!preference) {
            // Create default preferences if they don't exist
            const user = await User.findById(userId);
            preference = await EmailPreference.create({
                userId,
                email: user.email,
            });
        }

        res.json({
            success: true,
            data: {
                email: preference.email,
                unsubscribedFromAll: preference.unsubscribedFromAll,
                categories: preference.unsubscribedCategories,
            },
        });
    } catch (error) {
        console.error("Error fetching preferences:", error);
        res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};

// Update user's own preferences (authenticated route)
exports.updateMyPreferences = async (req, res) => {
    try {
        const userId = req.user._id;
        const { unsubscribedFromAll, unsubscribedCategories } = req.body;

        let preference = await EmailPreference.findOne({ userId });

        if (!preference) {
            const user = await User.findById(userId);
            preference = await EmailPreference.create({
                userId,
                email: user.email,
            });
        }

        // Update preferences
        if (typeof unsubscribedFromAll === "boolean") {
            preference.unsubscribedFromAll = unsubscribedFromAll;
        }

        if (unsubscribedCategories) {
            preference.unsubscribedCategories = {
                ...preference.unsubscribedCategories,
                ...unsubscribedCategories,
            };
        }

        await preference.save();

        res.json({
            success: true,
            message: "Email preferences updated successfully",
            data: {
                unsubscribedFromAll: preference.unsubscribedFromAll,
                categories: preference.unsubscribedCategories,
            },
        });
    } catch (error) {
        console.error("Error updating preferences:", error);
        res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};

// Check if user can receive emails (helper for internal use)
exports.canUserReceiveEmail = async (userId, category = "general") => {
    try {
        const preference = await EmailPreference.findOne({ userId });

        if (!preference) {
            return true; // If no preferences set, allow emails
        }

        return preference.canReceiveEmail(category);
    } catch (error) {
        console.error("Error checking email preferences:", error);
        return true; // Default to allowing emails on error
    }
};
