// Get unsubscribe page data (public route - no req.models)
exports.getUnsubscribePage = async (req, res) => {
    try {
        // EmailPreference is a registry-level model; use req.models if available
        const EmailPreference = req.models?.EmailPreference;
        if (!EmailPreference) return res.status(503).json({ success: false, message: 'Service unavailable' });

        const { token } = req.params;
        const preference = await EmailPreference.findOne({ unsubscribeToken: token });

        if (!preference) return res.status(404).json({ success: false, message: 'Invalid unsubscribe link' });

        res.json({
            success: true,
            data: {
                email: preference.email,
                preferences: {
                    unsubscribedFromAll: preference.unsubscribedFromAll,
                    categories: preference.unsubscribedCategories,
                },
            },
        });
    } catch (error) {
        console.error('Error fetching unsubscribe page:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.updatePreferences = async (req, res) => {
    try {
        const { EmailPreference } = req.models;
        const { token } = req.params;
        const { unsubscribedFromAll, unsubscribedCategories } = req.body;

        const preference = await EmailPreference.findOne({ unsubscribeToken: token });
        if (!preference) return res.status(404).json({ success: false, message: 'Invalid unsubscribe link' });

        if (typeof unsubscribedFromAll === 'boolean') preference.unsubscribedFromAll = unsubscribedFromAll;
        if (unsubscribedCategories) {
            preference.unsubscribedCategories = { ...preference.unsubscribedCategories, ...unsubscribedCategories };
        }

        await preference.save();
        res.json({ success: true, message: 'Email preferences updated successfully', data: { unsubscribedFromAll: preference.unsubscribedFromAll, categories: preference.unsubscribedCategories } });
    } catch (error) {
        console.error('Error updating preferences:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.getMyPreferences = async (req, res) => {
    try {
        const { EmailPreference, User } = req.models;
        const userId = req.user.id;

        let preference = await EmailPreference.findOne({ userId });
        if (!preference) {
            const user = await User.findOne({ id: userId });
            preference = await EmailPreference.create({ userId, email: user.email });
        }

        res.json({ success: true, data: { email: preference.email, unsubscribedFromAll: preference.unsubscribedFromAll, categories: preference.unsubscribedCategories } });
    } catch (error) {
        console.error('Error fetching preferences:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.updateMyPreferences = async (req, res) => {
    try {
        const { EmailPreference, User } = req.models;
        const userId = req.user.id;
        const { unsubscribedFromAll, unsubscribedCategories } = req.body;

        let preference = await EmailPreference.findOne({ userId });
        if (!preference) {
            const user = await User.findOne({ id: userId });
            preference = await EmailPreference.create({ userId, email: user.email });
        }

        if (typeof unsubscribedFromAll === 'boolean') preference.unsubscribedFromAll = unsubscribedFromAll;
        if (unsubscribedCategories) {
            preference.unsubscribedCategories = { ...preference.unsubscribedCategories, ...unsubscribedCategories };
        }

        await preference.save();
        res.json({ success: true, message: 'Email preferences updated successfully', data: { unsubscribedFromAll: preference.unsubscribedFromAll, categories: preference.unsubscribedCategories } });
    } catch (error) {
        console.error('Error updating preferences:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.canUserReceiveEmail = async (userId, category = 'general', models) => {
    try {
        if (!models?.EmailPreference) return true;
        const preference = await models.EmailPreference.findOne({ userId });
        if (!preference) return true;
        return preference.canReceiveEmail ? preference.canReceiveEmail(category) : true;
    } catch (error) {
        console.error('Error checking email preferences:', error);
        return true;
    }
};
