const express = require("express");
const router = express.Router();
const {
    getReports,
    createReport
} = require("../controllers/reportController");
const authMiddleware = require("../middleware/auth");

router.get("/", authMiddleware, getReports);
router.post("/", authMiddleware, createReport);

module.exports = router;
