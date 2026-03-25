exports.createSymptom = async (req, res) => {
    try {
        const { Symptom } = req.models;
        const symptom = await Symptom.create({ ...req.body, userId: req.user.id });
        res.status(201).json({ symptom });
    } catch (error) {
        res.status(500).json({ error: 'Failed to insert symptom' });
    }
};

exports.getSymptoms = async (req, res) => {
    try {
        const { Symptom } = req.models;
        const symptoms = await Symptom.find({ userId: req.user.id }).sort({ createdAt: -1 });
        res.json({ symptoms });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch symptoms' });
    }
};

exports.createAlert = async (req, res) => {
    try {
        const { Alert } = req.models;
        const alert = await Alert.create({ ...req.body, patientId: req.user.id });
        res.status(201).json({ alert });
    } catch (error) {
        res.status(500).json({ error: 'Failed to insert alert' });
    }
};

exports.getAlerts = async (req, res) => {
    try {
        const { Alert } = req.models;
        const role = req.user?.role;

        let query = {};
        if (role === 'doctor' || role === 'clinic_admin' || role === 'admin') {
            // Doctors see all alerts in the clinic (optionally filtered by their doctorId)
            query = {};
        } else {
            // Patients see only their own alerts
            query = { patientId: req.user.id };
        }

        const alerts = await Alert.find(query).sort({ createdAt: -1 }).limit(50);
        res.json({ alerts });
    } catch (error) {
        console.error('getAlerts error:', error);
        res.status(500).json({ error: 'Failed to fetch alerts' });
    }
};


exports.createMetric = async (req, res) => {
    try {
        const { HealthMetric } = req.models;
        const metric = await HealthMetric.create({ ...req.body, patientId: req.user.id });
        res.status(201).json({ metric });
    } catch (error) {
        res.status(500).json({ error: 'Failed to insert metric' });
    }
};

exports.getMetrics = async (req, res) => {
    try {
        const { HealthMetric } = req.models;
        const metrics = await HealthMetric.find({ patientId: req.user.id }).sort({ createdAt: -1 });
        res.json({ metrics });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch metrics' });
    }
};
