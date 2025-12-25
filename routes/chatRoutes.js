const express = require("express");
const router = express.Router();
const {
    getChats,
    getHistory,
    sendMessage,
    markRead
} = require("../controllers/chatController");
const authMiddleware = require("../middleware/auth");

router.get("/", authMiddleware, getChats);
router.get("/:doctorId/:patientId", authMiddleware, getHistory);
router.post("/send", authMiddleware, sendMessage);
router.post("/read", authMiddleware, markRead);

module.exports = router;
