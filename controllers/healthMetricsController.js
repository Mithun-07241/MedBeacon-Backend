const HealthMetric = require('../models/HealthMetric');

exports.getHealthMetrics = async (req, res) => {
    try {
        const query = {};
        if (req.user.role === 'patient') {
            query.patientId = req.user.id;
        } else if (req.query.patientId) {
            query.patientId = req.query.patientId;
        }

        const metrics = await HealthMetric.find(query).sort({ timestamp: -1 });
        res.status(200).json({ metrics });
    } catch (error) {
        res.status(500).json({ message: "Error fetching health metrics", error: error.message });
    }
};

exports.createHealthMetric = async (req, res) => {
    try {
        // Filter out empty strings to prevent CastErrors and remove extra fields
        const cleanData = Object.fromEntries(
            Object.entries(req.body).filter(([_, v]) => v !== '' && v !== null && v !== undefined)
        );

        const patientId = req.body.patientId || req.user?.id;

        if (!patientId) {
            return res.status(400).json({ message: "Patient ID is required" });
        }

        const newMetric = new HealthMetric({
            ...cleanData,
            patientId
        });
        const savedMetric = await newMetric.save();
        res.status(201).json({ metric: savedMetric });
    } catch (error) {
        console.error("Create Metrics Error:", error);
        res.status(500).json({ message: "Error creating health metric", error: error.message });
    }
};
