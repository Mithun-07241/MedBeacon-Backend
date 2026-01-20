const express = require("express");
const router = express.Router();
const emailPreferenceController = require("../controllers/emailPreferenceController");
const { protect } = require("../middleware/authMiddleware");

// Public routes (token-based)
router.get("/unsubscribe/:token", emailPreferenceController.getUnsubscribePage);
router.post("/unsubscribe/:token", emailPreferenceController.updatePreferences);

// Authenticated routes
router.get("/my-preferences", protect, emailPreferenceController.getMyPreferences);
router.put("/my-preferences", protect, emailPreferenceController.updateMyPreferences);

module.exports = router;
