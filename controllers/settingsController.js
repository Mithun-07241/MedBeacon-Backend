const Settings = require("../models/Settings");

exports.getSettings = async (req, res) => {
    try {
        let settings = await Settings.findOne({ userId: req.user.id });
        if (!settings) {
            // Create default settings if not exists
            settings = await Settings.create({ userId: req.user.id });
        }
        res.status(200).json({ settings });
    } catch (error) {
        res.status(500).json({ message: "Error fetching settings", error: error.message });
    }
};

exports.updateSettings = async (req, res) => {
    try {
        const settings = await Settings.findOneAndUpdate(
            { userId: req.user.id },
            req.body,
            { new: true, upsert: true } // Create if not exists
        );
        res.status(200).json({ settings });
    } catch (error) {
        res.status(500).json({ message: "Error updating settings", error: error.message });
    }
};
