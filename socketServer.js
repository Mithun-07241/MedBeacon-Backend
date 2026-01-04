const User = require('../models/User');
const { sendCallNotification } = require('../services/pushNotificationService');

// Store active socket connections
const userSockets = new Map(); // userId -> socketId
const socketUsers = new Map(); // socketId -> userId

function setupSocketIO(io) {
    io.on('connection', (socket) => {
        console.log('New socket connection:', socket.id);

        // User authentication and registration
        socket.on('register', async (userId) => {
            try {
                // Store user-socket mapping
                userSockets.set(userId, socket.id);
                socketUsers.set(socket.id, userId);

                // Update user online status
                await User.findOneAndUpdate(
                    { id: userId },
                    { isOnline: true, lastSeen: new Date() }
                );

                console.log(`User ${userId} registered with socket ${socket.id}`);

                // Notify user of successful registration
                socket.emit('registered', { userId, socketId: socket.id });
            } catch (error) {
                console.error('Socket register error:', error);
            }
        });

        // Call initiation
        socket.on('call:initiate', async (data) => {
            try {
                const { callId, callerId, receiverId, callType, callerName, callerProfilePic } = data;

                const receiverSocketId = userSockets.get(receiverId);

                if (receiverSocketId) {
                    // Receiver is online, send call notification via socket
                    io.to(receiverSocketId).emit('call:incoming', {
                        callId,
                        callerId,
                        callType,
                        callerName,
                        callerProfilePic
                    });

                    // Notify caller that receiver is being notified
                    socket.emit('call:ringing', { callId });
                } else {
                    // Receiver is offline, send push notification
                    console.log(`Receiver ${receiverId} is offline, sending push notification...`);

                    try {
                        // Get receiver's FCM token
                        const receiver = await User.findOne({ id: receiverId });

                        if (receiver && receiver.fcmToken) {
                            await sendCallNotification(receiver.fcmToken, {
                                callId,
                                callerId,
                                callerName,
                                callerProfilePic,
                                callType
                            });
                            console.log('✅ Push notification sent to offline user');
                        } else {
                            console.warn('⚠️  Receiver has no FCM token registered');
                        }
                    } catch (pushError) {
                        console.error('Failed to send push notification:', pushError);
                    }

                    socket.emit('call:receiver-offline', { callId, receiverId });
                }
            } catch (error) {
                console.error('Call initiate error:', error);
                socket.emit('call:error', { error: error.message });
            }
        });

        // Call acceptance
        socket.on('call:accept', (data) => {
            const { callId, callerId } = data;
            const callerSocketId = userSockets.get(callerId);

            if (callerSocketId) {
                io.to(callerSocketId).emit('call:accepted', { callId });
            }
        });

        // Call rejection
        socket.on('call:reject', (data) => {
            const { callId, callerId } = data;
            const callerSocketId = userSockets.get(callerId);

            if (callerSocketId) {
                io.to(callerSocketId).emit('call:rejected', { callId });
            }
        });

        // Call end
        socket.on('call:end', (data) => {
            const { callId, otherUserId } = data;
            const otherSocketId = userSockets.get(otherUserId);

            if (otherSocketId) {
                io.to(otherSocketId).emit('call:ended', { callId });
            }
        });

        // WebRTC signaling
        socket.on('webrtc:offer', (data) => {
            const { receiverId, offer, callId } = data;
            const receiverSocketId = userSockets.get(receiverId);

            if (receiverSocketId) {
                io.to(receiverSocketId).emit('webrtc:offer', { offer, callId, senderId: socketUsers.get(socket.id) });
            }
        });

        socket.on('webrtc:answer', (data) => {
            const { callerId, answer, callId } = data;
            const callerSocketId = userSockets.get(callerId);

            if (callerSocketId) {
                io.to(callerSocketId).emit('webrtc:answer', { answer, callId });
            }
        });

        socket.on('webrtc:ice-candidate', (data) => {
            const { targetUserId, candidate, callId } = data;
            const targetSocketId = userSockets.get(targetUserId);

            if (targetSocketId) {
                io.to(targetSocketId).emit('webrtc:ice-candidate', { candidate, callId });
            }
        });

        // Disconnect handling
        socket.on('disconnect', async () => {
            const userId = socketUsers.get(socket.id);

            if (userId) {
                userSockets.delete(userId);
                socketUsers.delete(socket.id);

                // Update user offline status
                try {
                    await User.findOneAndUpdate(
                        { id: userId },
                        { isOnline: false, lastSeen: new Date() }
                    );
                } catch (error) {
                    console.error('Error updating user status:', error);
                }

                console.log(`User ${userId} disconnected`);
            }
        });
    });
}

module.exports = { setupSocketIO, userSockets };
