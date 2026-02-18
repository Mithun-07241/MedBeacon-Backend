exports.registerFCMToken = async (req, res) => {
    try {
        const { User } = req.models;
        const { fcmToken, platform, deviceId } = req.body;
        const userId = req.user.id;

        if (!fcmToken) return res.status(400).json({ error: 'FCM token is required' });

        await User.findOneAndUpdate(
            { id: userId },
            { fcmToken, fcmPlatform: platform || 'unknown', fcmDeviceId: deviceId || 'unknown', fcmUpdatedAt: new Date() },
            { new: true }
        );

        res.json({ message: 'FCM token registered successfully' });
    } catch (error) {
        console.error('Register FCM token error:', error);
        res.status(500).json({ error: error.message || 'Failed to register FCM token' });
    }
};

exports.updateFCMToken = async (req, res) => {
    try {
        const { User } = req.models;
        const { fcmToken } = req.body;
        const userId = req.user.id;

        if (!fcmToken) return res.status(400).json({ error: 'FCM token is required' });

        await User.findOneAndUpdate({ id: userId }, { fcmToken }, { new: true });
        res.json({ message: 'FCM token updated successfully' });
    } catch (error) {
        console.error('Update FCM token error:', error);
        res.status(500).json({ error: error.message || 'Failed to update FCM token' });
    }
};

exports.removeFCMToken = async (req, res) => {
    try {
        const { User } = req.models;
        const userId = req.user.id;
        await User.findOneAndUpdate({ id: userId }, { fcmToken: null }, { new: true });
        res.json({ message: 'FCM token removed successfully' });
    } catch (error) {
        console.error('Remove FCM token error:', error);
        res.status(500).json({ error: error.message || 'Failed to remove FCM token' });
    }
};
