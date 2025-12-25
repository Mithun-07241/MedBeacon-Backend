const express = require("express");
const router = express.Router();
const {
    getTickets,
    createTicket
} = require("../controllers/ticketController");
const authMiddleware = require("../middleware/auth");

router.get("/", authMiddleware, getTickets);
router.post("/", authMiddleware, createTicket);

module.exports = router;
