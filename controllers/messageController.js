const { decryptMessage } = require('../utils/chatEncryption');

exports.getConversations = async (req, res) => {
    try {
        const { Conversation, User, PatientDetail, DoctorDetail } = req.models;
        const userId = req.user.id;
        const role = req.user.role;

        const match = role === 'doctor' ? { doctorId: userId } : { patientId: userId };
        const conversations = await Conversation.find(match).sort({ updatedAt: -1 });

        const formattedConversations = await Promise.all(conversations.map(async (conv) => {
            const otherUserId = role === 'doctor' ? conv.patientId : conv.doctorId;
            const otherUser = await User.findOne({ id: otherUserId });

            let otherUserName = "Unknown User";
            let otherUserAvatar = null;

            if (otherUser) {
                otherUserName = otherUser.username;
                otherUserAvatar = otherUser.profilePicUrl;

                // Try to get real name from details
                if (otherUser.role === 'patient') {
                    const details = await PatientDetail.findOne({ userId: otherUserId });
                    if (details && details.firstName) {
                        otherUserName = `${details.firstName} ${details.lastName || ''}`.trim();
                    }
                } else if (otherUser.role === 'doctor') {
                    const details = await DoctorDetail.findOne({ userId: otherUserId });
                    if (details && details.firstName) {
                        otherUserName = `Dr. ${details.firstName} ${details.lastName || ''}`.trim();
                    }
                }
            }

            const decryptedText = decryptMessage(conv.lastMessage || '', conv.doctorId, conv.patientId);

            return {
                id: `${conv.doctorId}_${conv.patientId}`,
                otherUser: {
                    id: otherUserId,
                    name: otherUserName,
                    role: otherUser ? otherUser.role : (role === 'doctor' ? 'patient' : 'doctor'),
                    avatarUrl: otherUserAvatar
                },
                lastMessage: conv.lastMessage ? {
                    id: conv._id.toString(),
                    senderId: conv.lastSender,
                    text: decryptedText,
                    timestamp: conv.updatedAt.toISOString(),
                    type: "text"
                } : null,
                unreadCount: role === 'doctor' ? (conv.unread?.doctor || 0) : (conv.unread?.patient || 0)
            };
        }));

        res.json(formattedConversations);
    } catch (error) {
        console.error('Get Conversations Error:', error);
        res.status(500).json({ error: 'Failed to load conversations' });
    }
};

exports.getMessages = async (req, res) => {
    try {
        const { Message } = req.models;
        const { conversationId } = req.params;
        const [doctorId, patientId] = conversationId.split('_');

        if (!doctorId || !patientId) {
            return res.status(400).json({ error: 'Invalid conversation ID' });
        }

        const rawMessages = await Message.find({ doctorId, patientId }).sort({ timestamp: 1 });

        const { decryptMessages } = require('../utils/chatEncryption');
        const decryptedMessages = decryptMessages(rawMessages, doctorId, patientId);

        const formattedMessages = decryptedMessages.map(m => ({
            id: m._id.toString(),
            senderId: m.sender, // Correctly mapping 'sender' from DB to 'senderId' for the app
            text: m.text,
            timestamp: m.timestamp.toISOString(),
            type: "text"
        }));

        res.json(formattedMessages);
    } catch (error) {
        console.error('Get Messages Error:', error);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
};

exports.sendMessage = async (req, res) => {
    // We can reuse the existing sendMessage logic from chatController or implement here
    const chatController = require('./chatController');

    // Adapt request body if needed
    if (req.body.conversationId && !req.body.doctorId) {
        const [doctorId, patientId] = req.body.conversationId.split('_');
        req.body.doctorId = doctorId;
        req.body.patientId = patientId;
    }

    return chatController.sendMessage(req, res);
};
