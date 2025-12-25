const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { verifyJwt } = require("../utils/helpers");

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

        const user = await User.findOne({ id: decoded.id });
        if (!user) {
            return res.status(401).json({ error: "User not found" });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error("Auth Middleware Error:", error.message);
        res.status(401).json({ error: "Invalid token" });
    }
};

module.exports = authMiddleware;
