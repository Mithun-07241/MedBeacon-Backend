const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const JWT_SECRET = process.env.JWT_SECRET || "dev-insecure-secret-change-me";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

const hashPassword = async (plain) => {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(plain, salt);
};

const verifyPassword = async (plain, hash) => {
    return bcrypt.compare(plain, hash);
};

const signJwt = (payload) => {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

const verifyJwt = (token) => {
    return jwt.verify(token, JWT_SECRET);
};

module.exports = {
    hashPassword,
    verifyPassword,
    signJwt,
    verifyJwt
};
