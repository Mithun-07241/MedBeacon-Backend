const jwt = require("jsonwebtoken");
const { verifyJwt } = require("../utils/helpers");
const { getClinicConnection } = require("../config/clinicDb");
const { getModels } = require("../models/factory");

const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ error: "Unauthorized: No token provided" });
        }

        const token = authHeader.split(" ")[1];
        if (!token) {
            return res.status(401).json({ error: "Unauthorized: Token malformed" });
        }

        const decoded = verifyJwt(token);
        if (!decoded) {
            return res.status(401).json({ error: "Unauthorized: Invalid token signature" });
        }

        // HARDCODED ADMIN SUPPORT (DEVELOPMENT ONLY)
        if (decoded.id === 'admin-hardcoded') {
            req.user = {
                id: 'admin-hardcoded',
                email: 'medbeacon.test@gmail.com',
                username: 'Admin',
                role: 'admin',
                dbName: decoded.dbName || null,
                verificationStatus: 'verified',
                profileCompleted: true,
                toObject: function () {
                    return {
                        id: this.id,
                        email: this.email,
                        username: this.username,
                        role: this.role,
                        dbName: this.dbName,
                        verificationStatus: this.verificationStatus,
                        profileCompleted: this.profileCompleted
                    };
                }
            };

            // If admin has a dbName, attach models
            if (decoded.dbName) {
                try {
                    const conn = await getClinicConnection(decoded.dbName);
                    req.db = conn;
                    req.models = getModels(conn, decoded.dbName);
                } catch (e) {
                    console.warn('Could not connect to clinic DB for admin:', e.message);
                }
            }

            return next();
        }

        // For clinic users: dbName is embedded in JWT
        const dbName = decoded.dbName;
        if (!dbName) {
            return res.status(401).json({ error: "No clinic database in token. Please log in again." });
        }

        // Connect to the clinic's database
        const conn = await getClinicConnection(dbName);
        const models = getModels(conn, dbName);

        // Find user in clinic DB
        const user = await models.User.findOne({ id: decoded.id });
        if (!user) {
            return res.status(401).json({ error: "User not found" });
        }

        req.user = user;
        req.user.dbName = dbName; // ensure dbName is accessible
        req.db = conn;
        req.models = models;

        next();
    } catch (error) {
        console.error("Auth Middleware Error:", error.message);
        res.status(401).json({ error: "Invalid token" });
    }
};

module.exports = authMiddleware;
