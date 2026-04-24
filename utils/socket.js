const { Server } = require("socket.io");

const onlineUsers = new Map(); // userId -> socketId

let io;

const initSocket = (server) => {
    io = new Server(server, {
        allowEIO3: true, // Support older mobile clients (Socket.io v2.x)
        cors: {
            origin: "*",
            credentials: true
        }
    });

    io.on("connection", (socket) => {
        console.log("✅ Socket Connected:", socket.id);

        // User Online / Registration
        socket.on("user_online", (userId) => {
            onlineUsers.set(userId, socket.id);
            io.emit("online_users", Array.from(onlineUsers.keys()));
            console.log(`User ${userId} online via 'user_online'`);
        });

        socket.on("register", (userId) => {
            onlineUsers.set(userId, socket.id);
            io.emit("online_users", Array.from(onlineUsers.keys()));
            console.log(`User ${userId} registered via 'register'`);
        });

        // Disconnect
        socket.on("disconnect", () => {
            for (const [userId, id] of onlineUsers) {
                if (id === socket.id) {
                    onlineUsers.delete(userId);
                    break;
                }
            }
            io.emit("online_users", Array.from(onlineUsers.keys()));
        });

        // Chat Room
        socket.on("join_chat", ({ doctorId, patientId }) => {
            const room = `${doctorId}_${patientId}`;
            socket.join(room);
            console.log(`Socket ${socket.id} joined room ${room}`);
        });

        // Typing
        socket.on("typing", ({ room }) => {
            socket.to(room).emit("typing");
        });

        socket.on("stop_typing", ({ room }) => {
            socket.to(room).emit("stop_typing");
        });

        // Send Message (Real-time relay, persistence handled by API)
        socket.on("send_message", (msg) => {
            const room = `${msg.doctorId}_${msg.patientId}`;
            socket.to(room).emit("receive_message", msg);
        });

        // ==============================
        // WebRTC Signaling
        // ==============================
        socket.on("callUser", async (data) => {
            const socketId = onlineUsers.get(data.userToCall);
            const signal = data.signalData || data.signal;

            if (socketId) {
                // Forward all signaling data to the receiver
                io.to(socketId).emit("callUser", {
                    signal:     signal,
                    from:       data.from,
                    name:       data.name,
                    profilePic: data.profilePic || data.callerProfilePic || null,
                    isVideo:    data.isVideo,
                    callId:     data.callId
                });
            } else {
                // Receiver offline — try push notification
                console.log(`User ${data.userToCall} offline for WebRTC call, checking for FCM...`);
                try {
                    const User = require('../models/User');
                    const { sendCallNotification } = require('../services/pushNotificationService');
                    const receiver = await User.findOne({ id: data.userToCall });

                    if (receiver && receiver.fcmToken) {
                        await sendCallNotification(receiver.fcmToken, {
                            callId: data.callId || `call_${Date.now()}`,
                            callerId: data.from,
                            callerName: data.name,
                            callerProfilePic: data.profilePic || data.callerProfilePic,
                            callType: data.isVideo ? 'video' : 'audio',
                            offer: signal
                        });
                        console.log('✅ WebRTC Push notification sent to offline user');
                    }
                } catch (err) {
                    console.error('Failed push notification fallback in WebRTC signaling:', err);
                }

                socket.emit("callUser-failed", { reason: "offline", userToCall: data.userToCall });
            }
        });

        socket.on("answerCall", (data) => {
            const { to, signal, signalData } = data;
            const socketId = onlineUsers.get(to);
            if (socketId) {
                io.to(socketId).emit("callAccepted", signalData || signal);
            }
        });

        socket.on("iceCandidate", (data) => {
            const { to, candidate } = data;
            const socketId = onlineUsers.get(to);
            if (socketId) {
                io.to(socketId).emit("iceCandidate", candidate);
            }
        });

        socket.on("endCall", ({ to }) => {
            const socketId = onlineUsers.get(to);
            if (socketId) {
                io.to(socketId).emit("endCall");
            }
        });

        // Add compatibility aliases for events used by mobile and different versions of the web app
        socket.on("call:initiate", (data) => {
            socket.emit("callUser", {
                userToCall: data.receiverId,
                signalData: data.offer || data.signal,
                from: data.callerId,
                name: data.callerName,
                profilePic: data.callerProfilePic,
                isVideo: data.callType === 'video'
            });
        });
    });

    return io;
};

const getIO = () => {
    if (!io) {
        throw new Error("Socket.io not initialized!");
    }
    return io;
};

module.exports = { initSocket, getIO, onlineUsers };
