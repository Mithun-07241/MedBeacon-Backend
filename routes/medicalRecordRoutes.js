const express = require("express");
const router = express.Router();
const {
    getMedicalRecords,
    createMedicalRecord,
    deleteMedicalRecord
} = require("../controllers/medicalRecordController");
const authMiddleware = require("../middleware/auth");
const { logPhiAccess } = require("../middleware/phiAuditLogger");

router.get("/", authMiddleware, logPhiAccess('medical_record'), getMedicalRecords);
router.post("/", authMiddleware, logPhiAccess('medical_record'), createMedicalRecord);
router.delete("/:id", authMiddleware, logPhiAccess('medical_record'), deleteMedicalRecord);

module.exports = router;

