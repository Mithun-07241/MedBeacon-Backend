const express = require('express');
const router = express.Router();
const healthMetricsController = require('../controllers/healthMetricsController');
const authMiddleware = require('../middleware/auth');
const { logPhiAccess } = require('../middleware/phiAuditLogger');

router.use(authMiddleware);

router.get('/', logPhiAccess('health_metric'), healthMetricsController.getHealthMetrics);
router.get('/patient/:id', logPhiAccess('health_metric'), healthMetricsController.getHealthMetrics);
router.post('/', logPhiAccess('health_metric'), healthMetricsController.createHealthMetric);

module.exports = router;

