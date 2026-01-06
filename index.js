const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const dotenv = require("dotenv");

const envPath = process.argv[2] || path.join(__dirname, ".env");

if (envPath.endsWith(".enc")) {
    try {
        const encryptedContent = fs.readFileSync(envPath);
        const iv = encryptedContent.slice(0, 16);
        const text = encryptedContent.slice(16);
        const algorithm = 'aes-256-cbc';
        const key = crypto.createHash('sha256').update(String('MEDBEACON_SECURE_KEY_2024')).digest('base64').substr(0, 32);

        const decipher = crypto.createDecipheriv(algorithm, key, iv);
        let decrypted = decipher.update(text);
        decrypted = Buffer.concat([decrypted, decipher.final()]);

        const envConfig = dotenv.parse(decrypted);
        for (const k in envConfig) {
            process.env[k] = envConfig[k];
        }
        console.log("Loaded encrypted env from:", envPath);
    } catch (e) {
        console.error("Failed to decrypt env:", e);
        process.exit(1);
    }
} else {
    require("dotenv").config({ path: envPath });
}

const express = require("express");
const http = require("http");
const cors = require("cors");
const morgan = require("morgan");
const connectDB = require("./config/db");
const { initSocket } = require("./utils/socket");

// Routes
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const appointmentRoutes = require("./routes/appointmentRoutes");
const chatRoutes = require("./routes/chatRoutes");
const dataRoutes = require("./routes/dataRoutes");
const medicationRoutes = require("./routes/medicationRoutes");
const medicalRecordRoutes = require("./routes/medicalRecordRoutes");
const reportRoutes = require("./routes/reportRoutes");
const ticketRoutes = require("./routes/ticketRoutes");
const settingsRoutes = require("./routes/settingsRoutes");
const healthMetricsRoutes = require("./routes/healthMetricsRoutes");
const callRoutes = require("./routes/callRoutes");
const fcmRoutes = require("./routes/fcmRoutes");

const app = express();
const server = http.createServer(app);

// Connect to Database
connectDB();

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(morgan("dev"));

// Static Folder
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Mount Routes
app.use("/api", authRoutes); // /api/signup, /api/login, /api/me
app.use("/api", userRoutes); // /api/profile/*, /api/patients, /api/doctors
app.use("/api/appointments", appointmentRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api", dataRoutes); // /api/symptoms, /api/alerts
app.use("/api/medications", medicationRoutes);
app.use("/api/records", medicalRecordRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/tickets", ticketRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/metrics", healthMetricsRoutes);
app.use("/api/calls", callRoutes);
app.use("/api/fcm", fcmRoutes);

// Health Check
app.get("/health", (req, res) => res.json({ ok: true }));

// Error Handling
// Error Handling
app.use((err, req, res, next) => {
    console.error("🔥 Global Error Handler:", err.stack);
    res.status(500).json({ error: "Something went wrong!", details: err.message });
});

// Init Socket.IO (single instance for both chat and calls)
const io = initSocket(server);

// Setup call-specific socket handlers
const { setupSocketIO } = require("./socketServer");
setupSocketIO(io);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
