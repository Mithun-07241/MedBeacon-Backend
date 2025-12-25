const express = require("express");
const router = express.Router();
const {
    createSymptom,
    getSymptoms,
    createAlert,
    getAlerts,
    createMetric,
    getMetrics
} = require("../controllers/dataController");
const authMiddleware = require("../middleware/auth");

router.post("/symptoms", authMiddleware, createSymptom);
router.get("/symptoms", authMiddleware, getSymptoms);

router.post("/alerts", authMiddleware, createAlert);
router.get("/alerts", authMiddleware, getAlerts);

router.post("/metrics", authMiddleware, createMetric);
router.get("/metrics", authMiddleware, getMetrics);

module.exports = router;
