const express = require("express");
const router = express.Router();
const {
    getMedicalRecords,
    createMedicalRecord,
    deleteMedicalRecord
} = require("../controllers/medicalRecordController");
const authMiddleware = require("../middleware/auth");

router.get("/", authMiddleware, getMedicalRecords);
router.post("/", authMiddleware, createMedicalRecord);
router.delete("/:id", authMiddleware, deleteMedicalRecord);

module.exports = router;
