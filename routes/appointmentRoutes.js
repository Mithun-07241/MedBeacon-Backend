const express = require("express");
const router = express.Router();
const {
    getAppointments,
    getAppointmentById,
    createAppointment,
    updateAppointment,
    deleteAppointment,
    submitRating,
    getDoctorStats,
    getDoctorReviews
} = require("../controllers/appointmentController");
const authMiddleware = require("../middleware/auth");
const { logPhiAccess } = require("../middleware/phiAuditLogger");

router.get("/", authMiddleware, logPhiAccess('appointment'), getAppointments);
router.get("/:id", authMiddleware, logPhiAccess('appointment'), getAppointmentById);
router.post("/", authMiddleware, logPhiAccess('appointment'), createAppointment);
router.patch("/:id", authMiddleware, logPhiAccess('appointment'), updateAppointment);
router.delete("/:id", authMiddleware, logPhiAccess('appointment'), deleteAppointment);

// Rating endpoints
router.post("/:id/rating", authMiddleware, logPhiAccess('appointment'), submitRating);
router.get("/doctor/:doctorId/stats", getDoctorStats);
router.get("/doctor/:doctorId/reviews", getDoctorReviews);

module.exports = router;

