const { userSockets } = require('../socketServer');
const { sendMessageNotification } = require('../services/pushNotificationService');
const { isValidMessage, isValidUserId, sanitizeString } = require('../utils/validation');

exports.getHistory = async (req, res) => {
    try {
        const { Message } = req.models;
        const { doctorId, patientId } = req.params;
        const messages = await Message.find({ doctorId, patientId }).sort({ timestamp: 1 });
        res.json(messages);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch chat history' });
    }
};

exports.sendMessage = async (req, res) => {
    try {
        const { Message, Conversation, User } = req.models;
        const { doctorId, patientId, text } = req.body;

        if (!doctorId || !patientId || !text) return res.status(400).json({ error: 'Missing fields' });
        if (!isValidUserId(doctorId) || !isValidUserId(patientId)) return res.status(400).json({ error: 'Invalid user ID format' });
        if (!isValidMessage(text)) return res.status(400).json({ error: 'Message must be between 1 and 5000 characters' });

        const sanitizedText = sanitizeString(text);
        const message = await Message.create({ doctorId, patientId, sender: req.user.id, text: sanitizedText });

        const unreadFor = req.user.role === 'doctor' ? 'patient' : 'doctor';
        await Conversation.findOneAndUpdate(
            { doctorId, patientId },
            { $set: { lastMessage: sanitizedText, lastSender: req.user.id }, $inc: { [`unread.${unreadFor}`]: 1 } },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        const recipientId = req.user.role === 'doctor' ? patientId : doctorId;
        const isOnline = userSockets ? userSockets.has(recipientId) : false;

        if (!isOnline) {
            try {
                const recipient = await User.findOne({ id: recipientId });
                if (recipient?.fcmToken) {
                    await sendMessageNotification(recipient.fcmToken, {
                        senderId: req.user.id, senderName: req.user.username || req.user.email,
                        messageText: text, conversationId: `${doctorId}_${patientId}`, doctorId, patientId
                    });
                }
            } catch (pushError) {
                console.error('Failed to send FCM push notification:', pushError);
            }
        }

        res.status(201).json(message);
    } catch (error) {
        console.error('Send Message Error:', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
};

exports.getChats = async (req, res) => {
    try {
        const { Conversation } = req.models;
        const userId = req.user.id;
        const role = req.user.role;

        const match = role === 'doctor' ? { doctorId: userId } : { patientId: userId };
        const conversations = await Conversation.find(match).sort({ updatedAt: -1 });

        const formatted = conversations.map(c => ({
            doctorId: c.doctorId,
            patientId: c.patientId,
            lastMessage: c.lastMessage,
            timestamp: c.updatedAt,
            unreadCount: role === 'doctor' ? (c.unread?.doctor || 0) : (c.unread?.patient || 0)
        }));

        res.json(formatted);
    } catch (error) {
        console.error('Get Chats Error:', error);
        res.status(500).json({ error: 'Failed to load chats', details: error.message });
    }
};

exports.markRead = async (req, res) => {
    try {
        const { Message, Conversation } = req.models;
        const { doctorId, patientId } = req.body;
        const userId = req.user.id;
        const role = req.user.role;

        await Message.updateMany({ doctorId, patientId, sender: { $ne: userId }, read: false }, { $set: { read: true } });

        const fieldToReset = role === 'doctor' ? 'unread.doctor' : 'unread.patient';
        await Conversation.findOneAndUpdate({ doctorId, patientId }, { $set: { [fieldToReset]: 0 } });

        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to mark read' });
    }
};
