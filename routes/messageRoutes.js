const express = require("express");
const router = express.Router();
const {
    getConversations,
    getMessages,
    sendMessage
} = require("../controllers/messageController");
const authMiddleware = require("../middleware/auth");
const { logPhiAccess } = require("../middleware/phiAuditLogger");

router.get("/conversations", authMiddleware, getConversations);
router.get("/:conversationId", authMiddleware, getMessages);
router.post("/", authMiddleware, logPhiAccess('chat_message'), sendMessage);

module.exports = router;
