const User = require("../models/User");
const { hashPassword, verifyPassword, signJwt } = require("../utils/helpers");
const { v4: uuidv4 } = require('uuid');
const { sendOTP } = require("../utils/mailer");
const {
    isValidEmail,
    isValidPassword,
    isValidUsername,
    sanitizeString,
    validateRegistration
} = require('../utils/validation');

// ==========================================
// NEW IMPLEMENTATION
// ==========================================

exports.signup = async (req, res) => {
    try {
        const { username, email, password, role, ...rest } = req.body;

        // Validate required fields
        if (!email || !password || !role) {
            return res.status(400).json({ error: "Email, password, and role are required" });
        }

        // Validate email format
        if (!isValidEmail(email)) {
            return res.status(400).json({ error: "Invalid email format" });
        }

        // Validate password strength
        if (!isValidPassword(password)) {
            return res.status(400).json({
                error: "Password must be at least 8 characters with 1 uppercase, 1 lowercase, and 1 number"
            });
        }

        // Validate role
        if (!['patient', 'doctor'].includes(role)) {
            return res.status(400).json({ error: "Role must be either 'patient' or 'doctor'" });
        }

        // Validate username if provided
        if (username && !isValidUsername(username)) {
            return res.status(400).json({
                error: "Username must be 3-30 characters, alphanumeric, underscores, or hyphens only"
            });
        }

        // Check existing
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({ error: "Email already in use" });
        }

        const passwordHash = await hashPassword(password);
        const userId = uuidv4();

        // Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        const newUser = await User.create({
            id: userId,
            username: sanitizeString(username || email.split("@")[0]),
            email: email.trim().toLowerCase(),
            password: passwordHash,
            role,
            verificationStatus: "pending",
            otp,
            otpExpires,
            profileCompleted: false,
            ...rest
        });

        // Send OTP via email
        const emailSent = await sendOTP(email, otp, newUser._id);
        if (!emailSent) {
            // Optional: delete user if email fails? Or just return warning?
            console.error("Failed to send OTP email to", email);
            // For now, continuing but client should know
        }

        // NO TOKEN RETURNED HERE. User must verify email.

        // Safe return
        const userObj = newUser.toObject();
        delete userObj.password;
        delete userObj.otp; // Restored

        res.status(201).json({
            message: "User registered successfully. Please verify your email.",
            user: userObj
        });

    } catch (error) {
        console.error("Signup Error:", error);
        res.status(500).json({ error: error.message || "Signup failed" });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate required fields
        if (!email || !password) {
            return res.status(400).json({ error: "Email and password are required" });
        }

        // Validate email format
        if (!isValidEmail(email)) {
            return res.status(400).json({ error: "Invalid email format" });
        }

        const user = await User.findOne({ email: email.trim().toLowerCase() });
        if (!user) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        // Block login if pending (email not verified)
        // If they are 'under_review' (doctor), they might still be able to login but see limited dashboard?
        // Or strictly block 'pending'?
        if (user.verificationStatus === 'pending') {
            return res.status(403).json({ error: "Email not verified. Please verify your email." });
        }

        const isMatch = await verifyPassword(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const token = signJwt({ id: user.id, role: user.role });

        const userObj = user.toObject();
        delete userObj.password;

        res.json({
            message: "Login successful",
            token,
            user: userObj
        });

    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ error: "Login failed" });
    }
};

exports.getMe = async (req, res) => {
    try {
        // req.user is set by authMiddleware
        const userObj = req.user.toObject();
        delete userObj.password;

        res.set("Cache-Control", "no-store");
        res.json({ user: userObj });
    } catch (error) {
        console.error("GetMe Error:", error);
        res.status(500).json({ error: "Failed to get user data" });
    }
};

exports.verifyOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;

        // Validate required fields
        if (!email || !otp) {
            return res.status(400).json({ error: "Email and OTP are required" });
        }

        // Validate email format
        if (!isValidEmail(email)) {
            return res.status(400).json({ error: "Invalid email format" });
        }

        // Validate OTP format (6 digits)
        if (!/^\d{6}$/.test(otp)) {
            return res.status(400).json({ error: "OTP must be 6 digits" });
        }

        const user = await User.findOne({ email: email.trim().toLowerCase() });
        if (!user) {
            return res.status(400).json({ error: "User not found" });
        }

        // Check if already verified?
        // if (user.verificationStatus === 'verified') return res.json({ token: ... }) ?

        if (user.otp !== otp) {
            console.log(`[VerifyOTP Debug] Failed match. DB: '${user.otp}' (${typeof user.otp}) vs Input: '${otp}' (${typeof otp})`);
            return res.status(400).json({ error: "Invalid OTP" });
        }

        if (user.otpExpires < Date.now()) {
            return res.status(400).json({ error: "OTP expired" });
        }

        // OTP Valid
        user.otp = undefined;
        user.otpExpires = undefined;

        if (user.role === 'doctor') {
            user.verificationStatus = 'under_review';
        } else {
            user.verificationStatus = 'verified';
        }

        await user.save();

        const token = signJwt({ id: user.id, role: user.role });

        // safe user object
        const userObj = user.toObject();
        delete userObj.password;

        res.json({ message: "Email verified successfully", token, user: userObj });

    } catch (error) {
        console.error("Verify OTP Error:", error);
        res.status(500).json({ error: "Verification failed" });
    }
};

exports.resendOTP = async (req, res) => {
    try {
        const { email } = req.body;

        // Validate required field
        if (!email) {
            return res.status(400).json({ error: "Email is required" });
        }

        // Validate email format
        if (!isValidEmail(email)) {
            return res.status(400).json({ error: "Invalid email format" });
        }

        const user = await User.findOne({ email: email.trim().toLowerCase() });
        if (!user) return res.status(400).json({ error: "User not found" });

        if (user.verificationStatus === 'verified' && user.role === 'patient') {
            return res.status(400).json({ error: "Email already verified" });
        }

        // Generate new OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        user.otp = otp;
        user.otpExpires = otpExpires;
        await user.save();

        const emailSent = await sendOTP(email, otp, user._id);
        if (!emailSent) {
            return res.status(500).json({ error: "Failed to send OTP email" });
        }

        res.json({ message: "OTP resent successfully" });

    } catch (error) {
        console.error("Resend OTP Error:", error);
        res.status(500).json({ error: "Failed to resend OTP" });
    }
};
/*
exports.verifyOTP_OLD = async (req, res) => {
    res.status(501).json({ error: "OTP verification is temporarily disabled" });
};
*/

/*
const { sendOTP } = require("../utils/mailer");

exports.signup = async (req, res) => {
    try {
        const { username, email, password, role, ...rest } = req.body;

        if (!email || !password || !role) {
            return res.status(400).json({ error: "Email, password and role are required" });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({ error: "Email already in use" });
        }

        const passwordHash = await hashPassword(password);
        const userId = uuidv4();

        // Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        const newUser = await User.create({
            id: userId,
            username: username || email.split("@")[0],
            email,
            password: passwordHash,
            role,
            verificationStatus: "pending", // Force pending until OTP verified
            otp,
            otpExpires,
            ...rest
        });

        // Send OTP via email
        await sendOTP(email, otp);

        res.status(201).json({
            message: "User created. Please verify your email.",
            userId: newUser.id,
            email: newUser.email
        });

    } catch (error) {
        console.error("Signup Error:", error);
        res.status(500).json({ error: error.message || "Signup failed" });
    }
};

exports.verifyOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ error: "User not found" });
        }

        if (user.otp !== otp) {
            return res.status(400).json({ error: "Invalid OTP" });
        }

        if (user.otpExpires < Date.now()) {
            return res.status(400).json({ error: "OTP expired" });
        }

        // OTP Valid
        user.otp = undefined;
        user.otpExpires = undefined;

        if (user.role === 'doctor') {
            user.verificationStatus = 'under_review';
        } else {
            user.verificationStatus = 'verified';
        }

        await user.save();

        const token = signJwt({ id: user.id, role: user.role });

        // safe user object
        const userObj = user.toObject();
        delete userObj.password;

        res.json({ message: "Email verified successfully", token, user: userObj });

    } catch (error) {
        console.error("Verify OTP Error:", error);
        res.status(500).json({ error: "Verification failed" });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        // Block login if email OTP not verified? 
        // We checked verificationStatus in ProtectedRoute, but maybe block here too if it means "Email Verified"
        // If verificationStatus is still "pending" (and we used that for OTP), they shouldn't get a token?
        // But doctors stay "pending" for admin approval.
        // Let's assume login returns token, but ProtectedRoute handles access.

        const isMatch = await verifyPassword(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const token = signJwt({ id: user.id, role: user.role });

        // safe user object
        const userObj = user.toObject();
        delete userObj.password;

        res.json({ user: userObj, token });
    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ error: "Login failed" });
    }
};

exports.getMe = async (req, res) => {
    const userObj = req.user.toObject();
    delete userObj.password;
    res.set("Cache-Control", "no-store");
    res.json({ user: userObj });
};
*/
