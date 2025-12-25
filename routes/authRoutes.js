const express = require("express");
const router = express.Router();
const { signup, login, getMe, verifyOTP, resendOTP } = require("../controllers/authController");
const authMiddleware = require("../middleware/auth");

router.post("/signup", signup);
router.post("/login", login);
router.post("/verify-otp", verifyOTP);
router.post("/resend-otp", resendOTP);
router.get("/me", authMiddleware, getMe);

module.exports = router;
