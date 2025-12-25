const express = require("express");
const router = express.Router();
const {
    getAppointments,
    getAppointmentById,
    createAppointment,
    updateAppointment,
    deleteAppointment
} = require("../controllers/appointmentController");
const authMiddleware = require("../middleware/auth");

router.get("/", authMiddleware, getAppointments);
router.get("/:id", authMiddleware, getAppointmentById);
router.post("/", authMiddleware, createAppointment);
router.patch("/:id", authMiddleware, updateAppointment);
router.delete("/:id", authMiddleware, deleteAppointment);

module.exports = router;
