const express = require("express");
const router = express.Router();
const {
    signup,
    login,
    getMe,
    verifyOTP,
    resendOTP,
    checkClinicSlug,
    getClinicByCode,
} = require("../controllers/authController");
const authMiddleware = require("../middleware/auth");

router.post("/signup", signup);
router.post("/login", login);
router.post("/verify-otp", verifyOTP);
router.post("/resend-otp", resendOTP);
router.get("/me", authMiddleware, getMe);

// Clinic discovery routes (no auth required)
router.get("/clinic/check-name", checkClinicSlug);
router.get("/clinic/code/:code", getClinicByCode);

module.exports = router;
