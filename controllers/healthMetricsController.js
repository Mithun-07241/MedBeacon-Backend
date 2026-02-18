const { validateHealthMetric, isValidUserId } = require('../utils/validation');

exports.getHealthMetrics = async (req, res) => {
    try {
        const { HealthMetric } = req.models;
        const query = {};
        if (req.user.role === 'patient') query.patientId = req.user.id;
        else if (req.params.id) query.patientId = req.params.id;
        else if (req.query.patientId) query.patientId = req.query.patientId;

        const metrics = await HealthMetric.find(query).sort({ recordedAt: -1 });
        res.status(200).json(metrics);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching health metrics', error: error.message });
    }
};

exports.createHealthMetric = async (req, res) => {
    try {
        const { HealthMetric } = req.models;
        const validation = validateHealthMetric(req.body);
        if (!validation.isValid) return res.status(400).json({ message: validation.errors.join(', ') });

        const patientId = req.body.patientId || req.user?.id;
        if (!patientId) return res.status(400).json({ message: 'Patient ID is required' });
        if (!isValidUserId(patientId)) return res.status(400).json({ message: 'Invalid patient ID format' });

        const newMetric = new HealthMetric({ ...validation.sanitized, patientId });
        const savedMetric = await newMetric.save();
        res.status(201).json({ metric: savedMetric });
    } catch (error) {
        console.error('Create Metrics Error:', error);
        res.status(500).json({ message: 'Error creating health metric', error: error.message });
    }
};
