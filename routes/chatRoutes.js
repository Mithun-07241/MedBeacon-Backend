const express = require("express");
const router = express.Router();
const {
    getChats,
    getHistory,
    sendMessage,
    markRead
} = require("../controllers/chatController");
const authMiddleware = require("../middleware/auth");
const { logPhiAccess } = require("../middleware/phiAuditLogger");

router.get("/", authMiddleware, logPhiAccess('chat_message'), getChats);
router.get("/:doctorId/:patientId", authMiddleware, logPhiAccess('chat_message'), getHistory);
router.post("/send", authMiddleware, logPhiAccess('chat_message'), sendMessage);
router.post("/read", authMiddleware, markRead);

module.exports = router;

