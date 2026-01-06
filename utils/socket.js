const { Server } = require("socket.io");

const onlineUsers = new Map(); // userId -> socketId

let io;

const initSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: "*", // Allowing all for development ease, restrict in prod
            credentials: true
        }
    });

    io.on("connection", (socket) => {
        console.log("✅ Socket Connected:", socket.id);

        // User Online
        socket.on("user_online", (userId) => {
            onlineUsers.set(userId, socket.id);
            io.emit("online_users", Array.from(onlineUsers.keys()));
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
        socket.on("callUser", (data) => {
            const socketId = onlineUsers.get(data.userToCall);
            if (socketId) {
                // Forward all data (signal, from, name, isVideo, etc.)
                io.to(socketId).emit("callUser", {
                    signal: data.signalData,
                    from: data.from,
                    name: data.name,
                    isVideo: data.isVideo
                });
            }
        });

        socket.on("answerCall", ({ to, signal }) => {
            const socketId = onlineUsers.get(to);
            if (socketId) {
                io.to(socketId).emit("callAccepted", signal);
            }
        });

        socket.on("iceCandidate", ({ to, candidate }) => {
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
    });

    return io;
};

const getIO = () => {
    if (!io) {
        throw new Error("Socket.io not initialized!");
    }
    return io;
};

module.exports = { initSocket, getIO };
