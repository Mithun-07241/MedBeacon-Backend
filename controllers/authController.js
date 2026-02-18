const { hashPassword, verifyPassword, signJwt } = require("../utils/helpers");
const { v4: uuidv4 } = require('uuid');
const { sendOTP } = require("../utils/mailer");
const {
    isValidEmail,
    isValidPassword,
    isValidUsername,
    sanitizeString,
} = require('../utils/validation');
const { connectRegistry, getRegistryConnection } = require('../config/registry');
const clinicRegistrySchema = require('../models/registry/Clinic');
const { getClinicConnection } = require('../config/clinicDb');
const { getModels } = require('../models/factory');

// ─── Helpers ────────────────────────────────────────────────────────────────

const getRegistryModel = async () => {
    const conn = await connectRegistry();
    // Register model if not already registered
    try {
        return conn.model('ClinicRegistry');
    } catch {
        return conn.model('ClinicRegistry', clinicRegistrySchema);
    }
};

const generateClinicCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
};

const slugify = (name) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
};

// ─── Signup ─────────────────────────────────────────────────────────────────

exports.signup = async (req, res) => {
    try {
        const { username, email, password, confirmPassword, role, clinicName, clinicCode, ...rest } = req.body;

        if (!email || !password || !role) {
            return res.status(400).json({ error: "Email, password, and role are required" });
        }
        if (!confirmPassword) {
            return res.status(400).json({ error: "Please confirm your password" });
        }
        if (password !== confirmPassword) {
            return res.status(400).json({ error: "Passwords do not match" });
        }
        if (!isValidEmail(email)) {
            return res.status(400).json({ error: "Invalid email format" });
        }
        if (!isValidPassword(password)) {
            return res.status(400).json({ error: "Password must be at least 8 characters with 1 uppercase, 1 lowercase, and 1 number" });
        }
        if (!['patient', 'doctor', 'clinic_admin'].includes(role)) {
            return res.status(400).json({ error: "Role must be 'patient', 'doctor', or 'clinic_admin'" });
        }
        if (username && !isValidUsername(username)) {
            return res.status(400).json({ error: "Username must be 3-30 characters, alphanumeric, underscores, or hyphens only" });
        }

        let dbName;

        if (role === 'clinic_admin') {
            // ── Clinic Admin: create a new clinic + database ──
            if (!clinicName || clinicName.trim().length < 2) {
                return res.status(400).json({ error: "Clinic name is required (min 2 characters)" });
            }

            const ClinicRegistry = await getRegistryModel();
            const slug = slugify(clinicName.trim());
            dbName = `medbeacon_${slug}_${Date.now()}`;

            // Check slug uniqueness
            const existing = await ClinicRegistry.findOne({ slug });
            if (existing) {
                return res.status(409).json({ error: "A clinic with this name already exists. Please choose a different name." });
            }

            // Check email uniqueness in registry
            const emailExists = await ClinicRegistry.findOne({ adminEmail: email.trim().toLowerCase() });
            if (emailExists) {
                return res.status(409).json({ error: "Email already used to register a clinic" });
            }

            // Generate unique clinic code
            let code;
            let codeExists = true;
            while (codeExists) {
                code = generateClinicCode();
                codeExists = await ClinicRegistry.findOne({ clinicCode: code });
            }

            // Create clinic in registry
            await ClinicRegistry.create({
                clinicId: uuidv4(),
                clinicName: clinicName.trim(),
                slug,
                dbName,
                adminEmail: email.trim().toLowerCase(),
                clinicCode: code,
            });

            // Create clinic profile in the new DB
            const conn = await getClinicConnection(dbName);
            const models = getModels(conn, dbName);
            await models.ClinicProfile.create({
                id: uuidv4(),
                clinicName: clinicName.trim(),
                isSingleton: true,
                setupComplete: false,
            });

        } else {
            // ── Doctor / Patient: join via clinic code ──
            if (!clinicCode) {
                return res.status(400).json({ error: "Clinic code is required to join a clinic" });
            }

            const ClinicRegistry = await getRegistryModel();
            const clinic = await ClinicRegistry.findOne({ clinicCode: clinicCode.trim().toUpperCase() });
            if (!clinic) {
                return res.status(404).json({ error: "Invalid clinic code. Please check with your clinic admin." });
            }

            dbName = clinic.dbName;
        }

        // Create user in the clinic DB
        const conn = await getClinicConnection(dbName);
        const models = getModels(conn, dbName);

        const existingUser = await models.User.findOne({ email: email.trim().toLowerCase() });
        if (existingUser) {
            return res.status(409).json({ error: "Email already in use in this clinic" });
        }

        const passwordHash = await hashPassword(password);
        const userId = uuidv4();
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

        const newUser = await models.User.create({
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

        const emailSent = await sendOTP(email, otp, newUser._id);
        if (!emailSent) {
            console.error("Failed to send OTP email to", email);
        }

        const userObj = newUser.toObject();
        delete userObj.password;
        delete userObj.otp;

        res.status(201).json({
            message: "User registered successfully. Please verify your email.",
            user: userObj,
            dbName,
        });

    } catch (error) {
        console.error("Signup Error:", error);
        res.status(500).json({ error: error.message || "Signup failed" });
    }
};

// ─── Login ──────────────────────────────────────────────────────────────────

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: "Email and password are required" });
        }
        if (!isValidEmail(email)) {
            return res.status(400).json({ error: "Invalid email format" });
        }

        // HARDCODED ADMIN LOGIN
        if (email === 'medbeacon.test@gmail.com' && password === 'medbeacon@2025') {
            // Try to find the first clinic for admin
            let dbName = null;
            try {
                const ClinicRegistry = await getRegistryModel();
                const firstClinic = await ClinicRegistry.findOne({}).sort({ createdAt: 1 });
                if (firstClinic) dbName = firstClinic.dbName;
            } catch (e) {
                console.warn('Registry lookup for admin failed:', e.message);
            }

            const adminToken = signJwt({ id: 'admin-hardcoded', role: 'admin', dbName });
            return res.json({
                message: "Admin login successful",
                token: adminToken,
                user: {
                    id: 'admin-hardcoded',
                    email: 'medbeacon.test@gmail.com',
                    username: 'Admin',
                    role: 'admin',
                    dbName,
                    verificationStatus: 'verified',
                    profileCompleted: true
                }
            });
        }

        // Find which clinic this user belongs to
        const ClinicRegistry = await getRegistryModel();
        const allClinics = await ClinicRegistry.find({ isActive: true });

        let foundUser = null;
        let foundDbName = null;

        for (const clinic of allClinics) {
            try {
                const conn = await getClinicConnection(clinic.dbName);
                const models = getModels(conn, clinic.dbName);
                const user = await models.User.findOne({ email: email.trim().toLowerCase() });
                if (user) {
                    foundUser = user;
                    foundDbName = clinic.dbName;
                    break;
                }
            } catch (e) {
                console.warn(`Could not search clinic ${clinic.dbName}:`, e.message);
            }
        }

        if (!foundUser) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        if (foundUser.verificationStatus === 'pending') {
            return res.status(403).json({ error: "Email not verified. Please verify your email." });
        }

        const isMatch = await verifyPassword(password, foundUser.password);
        if (!isMatch) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const token = signJwt({ id: foundUser.id, role: foundUser.role, dbName: foundDbName });

        const userObj = foundUser.toObject();
        delete userObj.password;
        userObj.dbName = foundDbName;

        res.json({ message: "Login successful", token, user: userObj });

    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ error: "Login failed" });
    }
};

// ─── Get Me ──────────────────────────────────────────────────────────────────

exports.getMe = async (req, res) => {
    try {
        const userObj = req.user.toObject();
        delete userObj.password;
        userObj.dbName = req.user.dbName;

        res.set("Cache-Control", "no-store");
        res.json({ user: userObj });
    } catch (error) {
        console.error("GetMe Error:", error);
        res.status(500).json({ error: "Failed to get user data" });
    }
};

// ─── Verify OTP ──────────────────────────────────────────────────────────────

exports.verifyOTP = async (req, res) => {
    try {
        const { email, otp, dbName } = req.body;

        if (!email || !otp) {
            return res.status(400).json({ error: "Email and OTP are required" });
        }
        if (!isValidEmail(email)) {
            return res.status(400).json({ error: "Invalid email format" });
        }
        if (!/^\d{6}$/.test(otp)) {
            return res.status(400).json({ error: "OTP must be 6 digits" });
        }

        // Find the user's clinic DB
        let targetDbName = dbName;
        let foundUser = null;

        if (targetDbName) {
            const conn = await getClinicConnection(targetDbName);
            const models = getModels(conn, targetDbName);
            foundUser = await models.User.findOne({ email: email.trim().toLowerCase() });
        } else {
            // Search all clinics
            const ClinicRegistry = await getRegistryModel();
            const allClinics = await ClinicRegistry.find({ isActive: true });
            for (const clinic of allClinics) {
                const conn = await getClinicConnection(clinic.dbName);
                const models = getModels(conn, clinic.dbName);
                const user = await models.User.findOne({ email: email.trim().toLowerCase() });
                if (user) {
                    foundUser = user;
                    targetDbName = clinic.dbName;
                    break;
                }
            }
        }

        if (!foundUser) {
            return res.status(400).json({ error: "User not found" });
        }

        if (foundUser.otp !== otp) {
            return res.status(400).json({ error: "Invalid OTP" });
        }
        if (foundUser.otpExpires < Date.now()) {
            return res.status(400).json({ error: "OTP expired" });
        }

        foundUser.otp = undefined;
        foundUser.otpExpires = undefined;
        foundUser.verificationStatus = foundUser.role === 'doctor' ? 'under_review' : 'verified';
        await foundUser.save();

        const token = signJwt({ id: foundUser.id, role: foundUser.role, dbName: targetDbName });

        const userObj = foundUser.toObject();
        delete userObj.password;
        userObj.dbName = targetDbName;

        res.json({ message: "Email verified successfully", token, user: userObj });

    } catch (error) {
        console.error("Verify OTP Error:", error);
        res.status(500).json({ error: "Verification failed" });
    }
};

// ─── Resend OTP ──────────────────────────────────────────────────────────────

exports.resendOTP = async (req, res) => {
    try {
        const { email, dbName } = req.body;

        if (!email) {
            return res.status(400).json({ error: "Email is required" });
        }
        if (!isValidEmail(email)) {
            return res.status(400).json({ error: "Invalid email format" });
        }

        let targetDbName = dbName;
        let foundUser = null;

        if (targetDbName) {
            const conn = await getClinicConnection(targetDbName);
            const models = getModels(conn, targetDbName);
            foundUser = await models.User.findOne({ email: email.trim().toLowerCase() });
        } else {
            const ClinicRegistry = await getRegistryModel();
            const allClinics = await ClinicRegistry.find({ isActive: true });
            for (const clinic of allClinics) {
                const conn = await getClinicConnection(clinic.dbName);
                const models = getModels(conn, clinic.dbName);
                const user = await models.User.findOne({ email: email.trim().toLowerCase() });
                if (user) {
                    foundUser = user;
                    targetDbName = clinic.dbName;
                    break;
                }
            }
        }

        if (!foundUser) return res.status(400).json({ error: "User not found" });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

        foundUser.otp = otp;
        foundUser.otpExpires = otpExpires;
        await foundUser.save();

        const emailSent = await sendOTP(email, otp, foundUser._id);
        if (!emailSent) {
            return res.status(500).json({ error: "Failed to send OTP email" });
        }

        res.json({ message: "OTP resent successfully" });

    } catch (error) {
        console.error("Resend OTP Error:", error);
        res.status(500).json({ error: "Failed to resend OTP" });
    }
};

// ─── Search Clinics ──────────────────────────────────────────────────────────

exports.searchClinics = async (req, res) => {
    try {
        const { q } = req.query;
        const ClinicRegistry = await getRegistryModel();

        const query = q && q.trim().length > 0
            ? { clinicName: { $regex: q.trim(), $options: 'i' }, isActive: true }
            : { isActive: true };

        const clinics = await ClinicRegistry.find(query)
            .select('clinicName clinicCode slug')
            .limit(10)
            .sort({ clinicName: 1 });

        res.json({ clinics });
    } catch (error) {
        console.error('Search Clinics Error:', error);
        res.status(500).json({ error: 'Failed to search clinics' });
    }
};

// ─── Check Clinic Slug ────────────────────────────────────────────────────────

exports.checkClinicSlug = async (req, res) => {
    try {
        const { name } = req.query;
        if (!name) return res.status(400).json({ error: "Name is required" });

        const slug = slugify(name.trim());
        const ClinicRegistry = await getRegistryModel();
        const existing = await ClinicRegistry.findOne({ slug });

        res.json({ available: !existing, slug });
    } catch (error) {
        console.error("Check Slug Error:", error);
        res.status(500).json({ error: "Failed to check clinic name" });
    }
};

// ─── Get Clinic Info by Code ──────────────────────────────────────────────────

exports.getClinicByCode = async (req, res) => {
    try {
        const { code } = req.params;
        if (!code) return res.status(400).json({ error: "Code is required" });

        const ClinicRegistry = await getRegistryModel();
        const clinic = await ClinicRegistry.findOne({ clinicCode: code.trim().toUpperCase() });

        if (!clinic) {
            return res.status(404).json({ error: "Invalid clinic code" });
        }

        res.json({
            clinicName: clinic.clinicName,
            slug: clinic.slug,
            clinicCode: clinic.clinicCode,
        });
    } catch (error) {
        console.error("Get Clinic By Code Error:", error);
        res.status(500).json({ error: "Failed to fetch clinic info" });
    }
};
