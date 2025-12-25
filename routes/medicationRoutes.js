const express = require("express");
const router = express.Router();
const {
    getMedications,
    createMedication,
    updateMedication,
    deleteMedication
} = require("../controllers/medicationController");
const authMiddleware = require("../middleware/auth");

router.get("/", authMiddleware, getMedications);
router.post("/", authMiddleware, createMedication);
router.patch("/:id", authMiddleware, updateMedication);
router.delete("/:id", authMiddleware, deleteMedication);

module.exports = router;
