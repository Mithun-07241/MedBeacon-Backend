const Call = require('../models/Call');
const { v4: uuidv4 } = require('uuid');

// Initiate a new call
exports.initiateCall = async (req, res) => {
    try {
        const { receiverId, callType } = req.body;
        const callerId = req.user.id;

        if (!receiverId || !callType) {
            return res.status(400).json({ error: 'Receiver ID and call type are required' });
        }

        if (!['voice', 'video'].includes(callType)) {
            return res.status(400).json({ error: 'Invalid call type' });
        }

        const callId = uuidv4();

        const call = new Call({
            callId,
            callerId,
            receiverId,
            callType,
            status: 'initiated'
        });

        await call.save();

        res.status(201).json({
            message: 'Call initiated',
            call
        });
    } catch (error) {
        console.error('Initiate Call Error:', error);
        res.status(500).json({ error: error.message || 'Failed to initiate call' });
    }
};

// Accept a call
exports.acceptCall = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const call = await Call.findOne({ callId: id });

        if (!call) {
            return res.status(404).json({ error: 'Call not found' });
        }

        if (call.receiverId !== userId) {
            return res.status(403).json({ error: 'Not authorized to accept this call' });
        }

        call.status = 'accepted';
        call.startTime = new Date();
        await call.save();

        res.json({
            message: 'Call accepted',
            call
        });
    } catch (error) {
        console.error('Accept Call Error:', error);
        res.status(500).json({ error: error.message || 'Failed to accept call' });
    }
};

// Reject a call
exports.rejectCall = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const call = await Call.findOne({ callId: id });

        if (!call) {
            return res.status(404).json({ error: 'Call not found' });
        }

        if (call.receiverId !== userId) {
            return res.status(403).json({ error: 'Not authorized to reject this call' });
        }

        call.status = 'rejected';
        call.endTime = new Date();
        await call.save();

        res.json({
            message: 'Call rejected',
            call
        });
    } catch (error) {
        console.error('Reject Call Error:', error);
        res.status(500).json({ error: error.message || 'Failed to reject call' });
    }
};

// End a call
exports.endCall = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const call = await Call.findOne({ callId: id });

        if (!call) {
            return res.status(404).json({ error: 'Call not found' });
        }

        if (call.callerId !== userId && call.receiverId !== userId) {
            return res.status(403).json({ error: 'Not authorized to end this call' });
        }

        call.status = 'ended';
        call.endTime = new Date();

        // Calculate duration if call was accepted
        if (call.status === 'accepted' && call.startTime) {
            call.duration = Math.floor((call.endTime - call.startTime) / 1000);
        }

        await call.save();

        res.json({
            message: 'Call ended',
            call
        });
    } catch (error) {
        console.error('End Call Error:', error);
        res.status(500).json({ error: error.message || 'Failed to end call' });
    }
};

// Get call history
exports.getCallHistory = async (req, res) => {
    try {
        const userId = req.user.id;

        const calls = await Call.find({
            $or: [
                { callerId: userId },
                { receiverId: userId }
            ]
        })
            .sort({ startTime: -1 })
            .limit(50)
            .populate('callerId', 'username email profilePicUrl')
            .populate('receiverId', 'username email profilePicUrl');

        res.json({ calls });
    } catch (error) {
        console.error('Get Call History Error:', error);
        res.status(500).json({ error: error.message || 'Failed to fetch call history' });
    }
};
