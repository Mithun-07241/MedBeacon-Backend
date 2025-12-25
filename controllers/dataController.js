const Symptom = require("../models/Symptom");
const Alert = require("../models/Alert");
const HealthMetric = require("../models/HealthMetric");

exports.createSymptom = async (req, res) => {
    try {
        const symptom = await Symptom.create({
            ...req.body,
            userId: req.user.id
        });
        res.status(201).json({ symptom });
    } catch (error) {
        res.status(500).json({ error: "Failed to insert symptom" });
    }
};

exports.getSymptoms = async (req, res) => {
    const symptoms = await Symptom.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json({ symptoms });
};

exports.createAlert = async (req, res) => {
    try {
        const alert = await Alert.create({
            ...req.body,
            userId: req.user.id
        }); // Schema has patientId, but route used userId from req.user (Patient)
        // Wait, storage.ts line 220: ...req.body, userId: req.user.id.
        // Alert Schema: patientId, doctorId.
        // I should probably map userId to patientId if role is patient.
        // But let's assume req.body has what's needed or I adjust.
        // The previous code passed `userId: req.user.id`.
        // My Alert model has `patientId`. I should map it.

        // Better:
        const data = { ...req.body, patientId: req.user.id };
        const newAlert = await Alert.create(data);

        res.status(201).json({ alert: newAlert });
    } catch (error) {
        res.status(500).json({ error: "Failed to insert alert" });
    }
};

exports.getAlerts = async (req, res) => {
    const alerts = await Alert.find({ patientId: req.user.id }).sort({ createdAt: -1 });
    res.json({ alerts });
};

exports.createMetric = async (req, res) => {
    try {
        const metric = await HealthMetric.create({
            ...req.body,
            patientId: req.user.id
        });
        res.status(201).json({ metric });
    } catch (error) {
        res.status(500).json({ error: "Failed to insert metric" });
    }
};

exports.getMetrics = async (req, res) => {
    const metrics = await HealthMetric.find({ patientId: req.user.id }).sort({ createdAt: -1 });
    res.json({ metrics });
};
