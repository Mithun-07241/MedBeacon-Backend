const Message = require("../models/Message");
const Conversation = require("../models/Conversation");

exports.getHistory = async (req, res) => {
    try {
        const { doctorId, patientId } = req.params;
        const messages = await Message.find({ doctorId, patientId }).sort({ timestamp: 1 });
        res.json(messages);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch chat history" });
    }
};

exports.sendMessage = async (req, res) => {
    try {
        const { doctorId, patientId, text } = req.body;
        if (!doctorId || !patientId || !text) return res.status(400).json({ error: "Missing fields" });

        const message = await Message.create({
            doctorId,
            patientId,
            sender: req.user.id,
            text
        });

        // Validating Conversation Upsert
        const unreadFor = req.user.role === "doctor" ? "patient" : "doctor"; // If sender is doctor, unread for patient

        await Conversation.findOneAndUpdate(
            { doctorId, patientId },
            {
                $set: {
                    lastMessage: text,
                    lastSender: req.user.id,
                    // updatedAt handled by timestamps: true
                },
                $inc: { [`unread.${unreadFor}`]: 1 }
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        res.status(201).json(message);
    } catch (error) {
        console.error("Send Message Error:", error);
        res.status(500).json({ error: "Failed to send message" });
    }
};

exports.getChats = async (req, res) => {
    try {
        const userId = req.user.id;
        const role = req.user.role;

        // We can use the Conversation model for this! 
        // storage.ts used complex aggregation on Messages, but we have Conversation model now maintained by sendMessage.

        const match = role === "doctor" ? { doctorId: userId } : { patientId: userId };

        // We need to return specific format including unreadCount
        // The conversation model has `unread: { doctor: X, patient: Y }`

        // BUT we also need info about the other party (name, avatar).
        // So aggregation needed on Conversation.

        const pipeline = [
            { $match: match },
            { $sort: { updatedAt: -1 } },
            // Lookup other party
            // If I am doctor, look up patient. If I am patient, look up doctor.
        ];

        if (role === "doctor") {
            pipeline.push(
                {
                    $lookup: {
                        from: "users",
                        localField: "patientId",
                        foreignField: "id",
                        as: "otherUser"
                    }
                },
                { $unwind: "$otherUser" }, // simplified for now
                {
                    $project: {
                        doctorId: 1,
                        patientId: 1,
                        lastMessage: 1,
                        timestamp: "$updatedAt",
                        unreadCount: "$unread.doctor",
                        otherUser: {
                            username: "$otherUser.username",
                            profilePicUrl: "$otherUser.profilePicUrl"
                        }
                    }
                }
            );
        } else {
            pipeline.push(
                {
                    $lookup: {
                        from: "users",
                        localField: "doctorId",
                        foreignField: "id",
                        as: "otherUser"
                    }
                },
                { $unwind: "$otherUser" },
                {
                    $project: {
                        doctorId: 1,
                        patientId: 1,
                        lastMessage: 1,
                        timestamp: "$updatedAt",
                        unreadCount: "$unread.patient",
                        otherUser: {
                            username: "$otherUser.username",
                            profilePicUrl: "$otherUser.profilePicUrl"
                        }
                    }
                }
            );
        }

        // However, the frontend might expect the exact format from storage.ts:
        // { doctorId, patientId, lastMessage, timestamp, unreadCount } 
        // It didn't seem to include user details in the list? 
        // storage.ts lines 324-330: doctorId, patientId, lastMessage, timestamp, unreadCount. 
        // Okay, maintain that signature.

        const conversations = await Conversation.find(match).sort({ updatedAt: -1 });

        const formatted = conversations.map(c => ({
            doctorId: c.doctorId,
            patientId: c.patientId,
            lastMessage: c.lastMessage,
            timestamp: c.updatedAt,
            unreadCount: role === "doctor" ? c.unread.doctor : c.unread.patient
        }));

        res.json(formatted);

    } catch (error) {
        console.error("Get Chats Error:", error);
        res.status(500).json({ error: "Failed to load chats" });
    }
};

exports.markRead = async (req, res) => {
    try {
        const { doctorId, patientId } = req.body;
        const userId = req.user.id;
        const role = req.user.role;

        // Update Message
        await Message.updateMany(
            { doctorId, patientId, sender: { $ne: userId }, read: false },
            { $set: { read: true } }
        );

        // Update Conversation unread count
        const fieldToReset = role === "doctor" ? "unread.doctor" : "unread.patient";
        await Conversation.findOneAndUpdate(
            { doctorId, patientId },
            { $set: { [fieldToReset]: 0 } }
        );

        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ error: "Failed to mark read" });
    }
};
