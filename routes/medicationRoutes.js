const express = require("express");
const router = express.Router();
const {
    getMedications,
    createMedication,
    updateMedication,
    deleteMedication
} = require("../controllers/medicationController");
const authMiddleware = require("../middleware/auth");
const { logPhiAccess } = require("../middleware/phiAuditLogger");

router.get("/", authMiddleware, logPhiAccess('medication'), getMedications);
router.get("/patient/:id", authMiddleware, logPhiAccess('medication'), getMedications);
router.post("/", authMiddleware, logPhiAccess('medication'), createMedication);
router.patch("/:id", authMiddleware, logPhiAccess('medication'), updateMedication);
router.delete("/:id", authMiddleware, logPhiAccess('medication'), deleteMedication);

module.exports = router;

