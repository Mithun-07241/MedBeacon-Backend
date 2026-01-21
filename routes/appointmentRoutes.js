const express = require("express");
const router = express.Router();
const {
    getAppointments,
    getAppointmentById,
    createAppointment,
    updateAppointment,
    deleteAppointment,
    submitRating,
    getDoctorStats
} = require("../controllers/appointmentController");
const authMiddleware = require("../middleware/auth");

router.get("/", authMiddleware, getAppointments);
router.get("/:id", authMiddleware, getAppointmentById);
router.post("/", authMiddleware, createAppointment);
router.patch("/:id", authMiddleware, updateAppointment);
router.delete("/:id", authMiddleware, deleteAppointment);

// Rating endpoints
router.post("/:id/rating", authMiddleware, submitRating);
router.get("/doctor/:doctorId/stats", getDoctorStats);

module.exports = router;
