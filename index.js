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
const helmet = require("helmet");
const connectDB = require("./config/db");
const { initSocket } = require("./utils/socket");
const { authLimiter, apiLimiter } = require("./middleware/rateLimiter");

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
const emailPreferenceRoutes = require("./routes/emailPreferenceRoutes");
const aiChatRoutes = require("./routes/aiChatRoutes");
const adminRoutes = require("./routes/adminRoutes");
const billingRoutes = require("./routes/billingRoutes");
const pharmacyRoutes = require("./routes/pharmacyRoutes");
const inventoryRoutes = require("./routes/inventoryRoutes");
const serviceRoutes = require("./routes/serviceRoutes");
const clinicRoutes = require("./routes/clinicRoutes");
const labReportRoutes = require("./routes/labReportRoutes");

const app = express();
const server = http.createServer(app);

// Trust Render's (and other reverse proxy) X-Forwarded-For header
// Required for express-rate-limit to correctly identify client IPs in production
app.set('trust proxy', 1);

// Connect to Database
connectDB();

// ─── Security Middleware (HIPAA) ────────────────────────────────────────────

// Helmet sets: HSTS, CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, etc.
// crossOriginResourcePolicy is set to false here — it MUST be disabled for a public API
// that serves cross-origin requests. Leaving it as 'same-origin' (helmet default) blocks
// fetch requests from Vercel/other domains before CORS headers are even considered.
app.use(helmet({
    crossOriginResourcePolicy: false,
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https://res.cloudinary.com"],
            connectSrc: ["'self'"],
            frameSrc: ["'none'"],
        }
    },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));

// CORS — allow explicitly listed origins + pattern matching for *.vercel.app previews
// Known production origins always allowed (env var overrides when set)
const PRODUCTION_ORIGINS = [
    'https://medbeacon.vercel.app',
    'https://tauri.localhost',           // Tauri Android WebView
    'http://tauri.localhost',
    'tauri://localhost',      // production frontend
];

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : [...PRODUCTION_ORIGINS, 'http://localhost:5173', 'http://localhost:3000'];

// Additional wildcard domains always trusted
const TRUSTED_PATTERNS = [
    /^https:\/\/[^/]+\.vercel\.app$/,   // all Vercel preview deployments
    /^https:\/\/[^/]+\.onrender\.com$/, // Render service-to-service
    /^http:\/\/localhost:\d+$/,         // any localhost port in dev
];

app.use(cors({
    origin: (origin, callback) => {
        // Allow no-origin requests (Postman, mobile, server-to-server)
        if (!origin) return callback(null, true);

        // Always allow known production origins
        if (PRODUCTION_ORIGINS.includes(origin)) return callback(null, true);

        // Exact match against env-configured origins
        if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);

        // Pattern match (*.vercel.app, *.onrender.com, localhost)
        if (TRUSTED_PATTERNS.some(re => re.test(origin))) return callback(null, true);

        console.warn(`CORS blocked: ${origin}`);
        callback(new Error(`CORS: origin ${origin} not permitted`));
    },
    credentials: true
}));

// Rate Limiting (HIPAA – brute-force protection)
app.use(apiLimiter); // global 200 req/15min

app.use(express.json({ limit: "10mb" }));
app.use(morgan("dev"));

// Static Folder
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Mount Routes
// Apply strict auth limiter to login/OTP endpoints
app.use("/api", authLimiter, authRoutes); // /api/signup, /api/login, /api/me
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
app.use("/api/email-preferences", emailPreferenceRoutes);
app.use("/api/ai-chat", aiChatRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api/pharmacy", pharmacyRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api", serviceRoutes); // /api/services
app.use("/api/clinic", clinicRoutes); // /api/clinic/profile
app.use("/api/lab-reports", labReportRoutes);

// Health Check
app.get("/health", (req, res) => res.json({ ok: true }));

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

