const Ticket = require("../models/Ticket");

exports.getTickets = async (req, res) => {
    try {
        // Users see their own tickets
        const tickets = await Ticket.find({ userId: req.user.id }).sort({ createdAt: -1 });
        res.status(200).json({ tickets });
    } catch (error) {
        res.status(500).json({ message: "Error fetching tickets", error: error.message });
    }
};

exports.createTicket = async (req, res) => {
    try {
        const newTicket = new Ticket({
            ...req.body,
            userId: req.user.id
        });
        const savedTicket = await newTicket.save();
        res.status(201).json({ ticket: savedTicket });
    } catch (error) {
        res.status(500).json({ message: "Error creating ticket", error: error.message });
    }
};
