const Message = require("../models/Message");
const Conversation = require("../models/Conversation");
const User = require("../models/User");
const { userSockets } = require("../socketServer");
const { sendMessageNotification } = require("../services/pushNotificationService");

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

        // Determine recipient
        const recipientId = req.user.role === "doctor" ? patientId : doctorId;

        // Check if recipient is online (only if socket server is initialized)
        const isOnline = userSockets ? userSockets.has(recipientId) : false;

        if (!isOnline) {
            // Recipient is offline, send FCM push notification
            console.log(`Recipient ${recipientId} is offline, sending FCM push...`);

            try {
                const recipient = await User.findOne({ id: recipientId });

                if (recipient && recipient.fcmToken) {
                    await sendMessageNotification(recipient.fcmToken, {
                        senderId: req.user.id,
                        senderName: req.user.username || req.user.email,
                        messageText: text,
                        conversationId: `${doctorId}_${patientId}`,
                        doctorId,
                        patientId
                    });
                    console.log('✅ FCM push notification sent to offline user');
                } else {
                    console.warn('⚠️  Recipient has no FCM token registered');
                }
            } catch (pushError) {
                console.error('Failed to send FCM push notification:', pushError);
            }
        } else {
            console.log(`Recipient ${recipientId} is online, notification via socket`);
        }

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

        console.log('📋 Getting chats for user:', userId, 'role:', role);

        // We can use the Conversation model for this! 
        // storage.ts used complex aggregation on Messages, but we have Conversation model now maintained by sendMessage.

        const match = role === "doctor" ? { doctorId: userId } : { patientId: userId };

        console.log('📋 Match query:', match);

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

        console.log('📋 Found conversations:', conversations.length);

        const formatted = conversations.map(c => ({
            doctorId: c.doctorId,
            patientId: c.patientId,
            lastMessage: c.lastMessage,
            timestamp: c.updatedAt,
            unreadCount: role === "doctor" ? (c.unread?.doctor || 0) : (c.unread?.patient || 0)
        }));

        console.log('📋 Formatted conversations:', formatted.length);

        res.json(formatted);

    } catch (error) {
        console.error("Get Chats Error:", error);
        console.error("Error stack:", error.stack);
        res.status(500).json({ error: "Failed to load chats", details: error.message });
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
