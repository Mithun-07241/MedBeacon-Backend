const express = require('express');
const router = express.Router();
const healthMetricsController = require('../controllers/healthMetricsController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

router.get('/', healthMetricsController.getHealthMetrics);
router.post('/', healthMetricsController.createHealthMetric);

module.exports = router;
