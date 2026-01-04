const SmartwatchData = require('../models/SmartwatchData');

/**
 * Sync smartwatch data
 * POST /api/smartwatch/sync
 */
exports.syncData = async (req, res) => {
    try {
        const { deviceName, deviceId, heartRate, steps, bloodOxygen, sleepHours, calories, batteryLevel } = req.body;
        const patientId = req.user.id;

        const smartwatchData = new SmartwatchData({
            patientId,
            deviceName,
            deviceId,
            heartRate: heartRate || 0,
            steps: steps || 0,
            bloodOxygen: bloodOxygen || 0,
            sleepHours: sleepHours || 0,
            calories: calories || 0,
            batteryLevel: batteryLevel || 0,
            timestamp: new Date(),
            syncedAt: new Date()
        });

        await smartwatchData.save();

        res.status(201).json({
            message: 'Smartwatch data synced successfully',
            data: smartwatchData
        });
    } catch (error) {
        console.error('Error syncing smartwatch data:', error);
        res.status(500).json({ error: 'Failed to sync smartwatch data' });
    }
};

/**
 * Get smartwatch data for a patient
 * GET /api/smartwatch/data/:patientId
 */
exports.getData = async (req, res) => {
    try {
        const { patientId } = req.params;
        const { limit = 100, startDate, endDate } = req.query;

        // Build query
        const query = { patientId };

        if (startDate || endDate) {
            query.timestamp = {};
            if (startDate) query.timestamp.$gte = new Date(startDate);
            if (endDate) query.timestamp.$lte = new Date(endDate);
        }

        const data = await SmartwatchData.find(query)
            .sort({ timestamp: -1 })
            .limit(parseInt(limit))
            .lean();

        res.json({
            count: data.length,
            data
        });
    } catch (error) {
        console.error('Error fetching smartwatch data:', error);
        res.status(500).json({ error: 'Failed to fetch smartwatch data' });
    }
};

/**
 * Get latest smartwatch data for a patient
 * GET /api/smartwatch/latest/:patientId
 */
exports.getLatest = async (req, res) => {
    try {
        const { patientId } = req.params;

        const latestData = await SmartwatchData.findOne({ patientId })
            .sort({ timestamp: -1 })
            .lean();

        if (!latestData) {
            return res.status(404).json({ error: 'No smartwatch data found' });
        }

        res.json(latestData);
    } catch (error) {
        console.error('Error fetching latest smartwatch data:', error);
        res.status(500).json({ error: 'Failed to fetch latest smartwatch data' });
    }
};

/**
 * Delete smartwatch data (disconnect device)
 * DELETE /api/smartwatch/disconnect
 */
exports.disconnect = async (req, res) => {
    try {
        const patientId = req.user.id;
        const { deviceId } = req.body;

        // Optionally delete all data for this device
        if (deviceId) {
            await SmartwatchData.deleteMany({ patientId, deviceId });
        }

        res.json({ message: 'Device disconnected successfully' });
    } catch (error) {
        console.error('Error disconnecting device:', error);
        res.status(500).json({ error: 'Failed to disconnect device' });
    }
};

/**
 * Get smartwatch statistics
 * GET /api/smartwatch/stats/:patientId
 */
exports.getStats = async (req, res) => {
    try {
        const { patientId } = req.params;
        const { days = 7 } = req.query;

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(days));

        const stats = await SmartwatchData.aggregate([
            {
                $match: {
                    patientId: mongoose.Types.ObjectId(patientId),
                    timestamp: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: null,
                    avgHeartRate: { $avg: '$heartRate' },
                    maxHeartRate: { $max: '$heartRate' },
                    minHeartRate: { $min: '$heartRate' },
                    totalSteps: { $sum: '$steps' },
                    avgBloodOxygen: { $avg: '$bloodOxygen' },
                    totalSleepHours: { $sum: '$sleepHours' },
                    totalCalories: { $sum: '$calories' },
                    dataPoints: { $sum: 1 }
                }
            }
        ]);

        res.json(stats[0] || {});
    } catch (error) {
        console.error('Error fetching smartwatch stats:', error);
        res.status(500).json({ error: 'Failed to fetch smartwatch stats' });
    }
};
