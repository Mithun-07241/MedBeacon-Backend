const Report = require("../models/Report");

exports.getReports = async (req, res) => {
    try {
        // Only doctors should access reports generally, or perhaps admins
        if (req.user.role !== 'doctor') {
            return res.status(403).json({ message: "Access denied. Doctors only." });
        }

        const reports = await Report.find({ doctorId: req.user.id }).sort({ date: -1 });
        res.status(200).json({ reports });
    } catch (error) {
        res.status(500).json({ message: "Error fetching reports", error: error.message });
    }
};

exports.createReport = async (req, res) => {
    try {
        const newReport = new Report({
            ...req.body,
            doctorId: req.user.id
        });
        const savedReport = await newReport.save();
        res.status(201).json({ report: savedReport });
    } catch (error) {
        res.status(500).json({ message: "Error creating report", error: error.message });
    }
};
