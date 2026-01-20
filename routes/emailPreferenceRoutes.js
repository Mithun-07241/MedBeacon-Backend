const express = require("express");
const router = express.Router();
const emailPreferenceController = require("../controllers/emailPreferenceController");
const authMiddleware = require("../middleware/auth");

// Public routes (token-based)
router.get("/unsubscribe/:token", emailPreferenceController.getUnsubscribePage);
router.post("/unsubscribe/:token", emailPreferenceController.updatePreferences);

// Authenticated routes
router.get("/my-preferences", authMiddleware, emailPreferenceController.getMyPreferences);
router.put("/my-preferences", authMiddleware, emailPreferenceController.updateMyPreferences);

module.exports = router;
