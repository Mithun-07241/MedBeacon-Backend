const User = require("../models/User");
const DoctorDetail = require("../models/DoctorDetail");
const { isValidUserId } = require('../utils/validation');

/**
 * Get all pending doctors (verification status: 'under_review')
 */
exports.getPendingDoctors = async (req, res) => {
    try {
        // Find all doctors with under_review status
        const pendingDoctors = await User.aggregate([
            {
                $match: {
                    role: "doctor",
                    verificationStatus: "under_review"
                }
            },
            {
                $lookup: {
                    from: "doctordetails",
                    localField: "id",
                    foreignField: "userId",
                    as: "details"
                }
            },
            { $unwind: { path: "$details", preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    _id: 0,
                    id: 1,
                    username: 1,
                    email: 1,
                    verificationStatus: 1,
                    createdAt: 1,
                    profilePicUrl: 1,
                    firstName: "$details.firstName",
                    lastName: "$details.lastName",
                    phoneNumber: "$details.phoneNumber",
                    specialization: "$details.specialization",
                    experience: "$details.experience",
                    education: "$details.education",
                    hospital: "$details.hospital",
                    proofFileUrl: "$details.proofFileUrl",
                    bio: "$details.bio"
                }
            },
            { $sort: { createdAt: -1 } }
        ]);

        res.json({
            count: pendingDoctors.length,
            doctors: pendingDoctors
        });
    } catch (error) {
        console.error("Get Pending Doctors Error:", error);
        res.status(500).json({ error: "Failed to fetch pending doctors" });
    }
};

/**
 * Verify (approve or reject) a doctor
 */
exports.verifyDoctor = async (req, res) => {
    try {
        const { userId } = req.params;
        const { action, reason } = req.body; // action: 'approve' or 'reject'

        // Validate user ID
        if (!isValidUserId(userId)) {
            return res.status(400).json({ error: "Invalid user ID format" });
        }

        // Validate action
        if (!['approve', 'reject'].includes(action)) {
            return res.status(400).json({ error: "Action must be 'approve' or 'reject'" });
        }

        // Find the doctor
        const doctor = await User.findOne({ id: userId, role: "doctor" });
        if (!doctor) {
            return res.status(404).json({ error: "Doctor not found" });
        }

        // Check if already verified
        if (doctor.verificationStatus === 'verified') {
            return res.status(400).json({ error: "Doctor is already verified" });
        }

        // Update verification status
        const newStatus = action === 'approve' ? 'verified' : 'rejected';
        doctor.verificationStatus = newStatus;

        // Store rejection reason if provided
        if (action === 'reject' && reason) {
            doctor.rejectionReason = reason;
        }

        await doctor.save();

        // TODO: Send email notification to doctor
        // await sendVerificationEmail(doctor.email, newStatus, reason);

        res.json({
            message: `Doctor ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
            doctor: {
                id: doctor.id,
                email: doctor.email,
                verificationStatus: doctor.verificationStatus
            }
        });
    } catch (error) {
        console.error("Verify Doctor Error:", error);
        res.status(500).json({ error: "Failed to verify doctor" });
    }
};

/**
 * Get admin dashboard statistics
 */
exports.getAdminStats = async (req, res) => {
    try {
        const stats = await Promise.all([
            User.countDocuments({ role: "doctor", verificationStatus: "under_review" }),
            User.countDocuments({ role: "doctor", verificationStatus: "verified" }),
            User.countDocuments({ role: "doctor", verificationStatus: "rejected" }),
            User.countDocuments({ role: "patient" })
        ]);

        res.json({
            pendingDoctors: stats[0],
            verifiedDoctors: stats[1],
            rejectedDoctors: stats[2],
            totalPatients: stats[3]
        });
    } catch (error) {
        console.error("Get Admin Stats Error:", error);
        res.status(500).json({ error: "Failed to fetch statistics" });
    }
};

/**
 * Get all doctors (with filters)
 */
exports.getAllDoctors = async (req, res) => {
    try {
        const { status } = req.query; // Filter by verification status

        const match = { role: "doctor" };
        if (status) {
            match.verificationStatus = status;
        }

        const doctors = await User.aggregate([
            { $match: match },
            {
                $lookup: {
                    from: "doctordetails",
                    localField: "id",
                    foreignField: "userId",
                    as: "details"
                }
            },
            { $unwind: { path: "$details", preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    _id: 0,
                    id: 1,
                    username: 1,
                    email: 1,
                    verificationStatus: 1,
                    createdAt: 1,
                    firstName: "$details.firstName",
                    lastName: "$details.lastName",
                    specialization: "$details.specialization",
                    experience: "$details.experience",
                    hospital: "$details.hospital"
                }
            },
            { $sort: { createdAt: -1 } }
        ]);

        res.json({ doctors });
    } catch (error) {
        console.error("Get All Doctors Error:", error);
        res.status(500).json({ error: "Failed to fetch doctors" });
    }
};

/**
 * Get all users with filters
 */
exports.getAllUsers = async (req, res) => {
    try {
        const { role, status, search } = req.query;

        const match = {};
        if (role) match.role = role;
        if (status) match.verificationStatus = status;
        if (search) {
            match.$or = [
                { email: { $regex: search, $options: 'i' } },
                { username: { $regex: search, $options: 'i' } }
            ];
        }

        const users = await User.find(match)
            .select('-password -otp -otpExpires')
            .sort({ createdAt: -1 })
            .limit(100);

        res.json({ users, count: users.length });
    } catch (error) {
        console.error("Get All Users Error:", error);
        res.status(500).json({ error: "Failed to fetch users" });
    }
};

/**
 * Get all patients
 */
exports.getAllPatients = async (req, res) => {
    try {
        const patients = await User.aggregate([
            { $match: { role: "patient" } },
            {
                $lookup: {
                    from: "patientdetails",
                    localField: "id",
                    foreignField: "userId",
                    as: "details"
                }
            },
            { $unwind: { path: "$details", preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    _id: 0,
                    id: 1,
                    username: 1,
                    email: 1,
                    verificationStatus: 1,
                    createdAt: 1,
                    firstName: "$details.firstName",
                    lastName: "$details.lastName",
                    phoneNumber: "$details.phoneNumber",
                    dateOfBirth: "$details.dateOfBirth",
                    gender: "$details.gender"
                }
            },
            { $sort: { createdAt: -1 } }
        ]);

        res.json({ patients, count: patients.length });
    } catch (error) {
        console.error("Get All Patients Error:", error);
        res.status(500).json({ error: "Failed to fetch patients" });
    }
};

/**
 * Get all appointments (admin view)
 */
exports.getAllAppointments = async (req, res) => {
    try {
        const Appointment = require('../models/Appointment');
        const { status, limit = 50 } = req.query;

        const match = {};
        if (status) match.status = status;

        // Get appointments without populate first
        const appointments = await Appointment.find(match)
            .sort({ date: -1, time: -1 })
            .limit(parseInt(limit))
            .lean();

        // Manually fetch user details
        const patientIds = [...new Set(appointments.map(a => a.patientId).filter(Boolean))];
        const doctorIds = [...new Set(appointments.map(a => a.doctorId).filter(Boolean))];

        const patients = await User.find({ id: { $in: patientIds } }).select('id username email');
        const doctors = await User.find({ id: { $in: doctorIds } }).select('id username email');

        const patientMap = {};
        patients.forEach(p => { patientMap[p.id] = p; });
        const doctorMap = {};
        doctors.forEach(d => { doctorMap[d.id] = d; });

        // Attach user data to appointments
        const enrichedAppointments = appointments.map(apt => ({
            ...apt,
            patientId: patientMap[apt.patientId] || null,
            doctorId: doctorMap[apt.doctorId] || null
        }));

        const stats = await Appointment.aggregate([
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 }
                }
            }
        ]);

        res.json({ appointments: enrichedAppointments, stats });
    } catch (error) {
        console.error("Get All Appointments Error:", error);
        res.status(500).json({ error: "Failed to fetch appointments" });
    }
};

/**
 * Get analytics data
 */
exports.getAnalytics = async (req, res) => {
    try {
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        // User growth
        const userGrowth = await User.aggregate([
            {
                $group: {
                    _id: {
                        year: { $year: "$createdAt" },
                        month: { $month: "$createdAt" },
                        role: "$role"
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { "_id.year": 1, "_id.month": 1 } }
        ]);

        // Active users (last 30 days)
        const activeUsers = await User.countDocuments({
            updatedAt: { $gte: thirtyDaysAgo }
        });

        // New signups (last 7 days)
        const newSignups = await User.countDocuments({
            createdAt: { $gte: sevenDaysAgo }
        });

        // Doctor specialization distribution
        const DoctorDetail = require('../models/DoctorDetail');
        const specializationDist = await DoctorDetail.aggregate([
            {
                $group: {
                    _id: "$specialization",
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } }
        ]);

        res.json({
            userGrowth,
            activeUsers,
            newSignups,
            specializationDistribution: specializationDist
        });
    } catch (error) {
        console.error("Get Analytics Error:", error);
        res.status(500).json({ error: "Failed to fetch analytics" });
    }
};

/**
 * Update user (suspend, activate, change role)
 */
exports.updateUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const { action, role, verificationStatus } = req.body;

        if (!isValidUserId(userId)) {
            return res.status(400).json({ error: "Invalid user ID" });
        }

        const user = await User.findOne({ id: userId });
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // Handle different actions
        if (action === 'suspend') {
            user.verificationStatus = 'rejected';
        } else if (action === 'activate') {
            user.verificationStatus = 'verified';
        }

        if (role && ['patient', 'doctor', 'admin'].includes(role)) {
            user.role = role;
        }

        if (verificationStatus) {
            user.verificationStatus = verificationStatus;
        }

        await user.save();

        res.json({
            message: "User updated successfully",
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                verificationStatus: user.verificationStatus
            }
        });
    } catch (error) {
        console.error("Update User Error:", error);
        res.status(500).json({ error: "Failed to update user" });
    }
};

/**
 * Delete user
 */
exports.deleteUser = async (req, res) => {
    try {
        const { userId } = req.params;

        if (!isValidUserId(userId)) {
            return res.status(400).json({ error: "Invalid user ID" });
        }

        const user = await User.findOne({ id: userId });
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // Prevent deleting admins
        if (user.role === 'admin') {
            return res.status(403).json({ error: "Cannot delete admin users" });
        }

        await User.deleteOne({ id: userId });

        res.json({ message: "User deleted successfully" });
    } catch (error) {
        console.error("Delete User Error:", error);
        res.status(500).json({ error: "Failed to delete user" });
    }
};

/**
 * Bulk verify doctors
 */
exports.bulkVerifyDoctors = async (req, res) => {
    try {
        const { userIds, action } = req.body;

        if (!Array.isArray(userIds) || userIds.length === 0) {
            return res.status(400).json({ error: "userIds array required" });
        }

        if (!['approve', 'reject'].includes(action)) {
            return res.status(400).json({ error: "Action must be 'approve' or 'reject'" });
        }

        const newStatus = action === 'approve' ? 'verified' : 'rejected';

        const result = await User.updateMany(
            { id: { $in: userIds }, role: 'doctor' },
            { $set: { verificationStatus: newStatus } }
        );

        res.json({
            message: `${result.modifiedCount} doctors ${action}d successfully`,
            count: result.modifiedCount
        });
    } catch (error) {
        console.error("Bulk Verify Error:", error);
        res.status(500).json({ error: "Failed to bulk verify doctors" });
    }
};

/**
 * Get activity logs
 */
exports.getActivityLogs = async (req, res) => {
    try {
        const ActivityLog = require('../models/ActivityLog');
        const { startDate, endDate, action, adminId, limit = 100 } = req.query;

        const match = {};
        if (startDate || endDate) {
            match.timestamp = {};
            if (startDate) match.timestamp.$gte = new Date(startDate);
            if (endDate) match.timestamp.$lte = new Date(endDate);
        }
        if (action) match.action = action;
        if (adminId) match.adminId = adminId;

        const logs = await ActivityLog.find(match)
            .sort({ timestamp: -1 })
            .limit(parseInt(limit));

        res.json({ logs, count: logs.length });
    } catch (error) {
        console.error("Get Activity Logs Error:", error);
        res.status(500).json({ error: "Failed to fetch activity logs" });
    }
};

/**
 * Export activity logs to CSV
 */
exports.exportActivityLogs = async (req, res) => {
    try {
        const ActivityLog = require('../models/ActivityLog');
        const logs = await ActivityLog.find({}).sort({ timestamp: -1 }).limit(1000);

        const csv = [
            ['Timestamp', 'Admin Email', 'Action', 'Target Type', 'Target ID', 'Details'].join(','),
            ...logs.map(log => [
                new Date(log.timestamp).toISOString(),
                log.adminEmail,
                log.action,
                log.targetType || 'N/A',
                log.targetId || 'N/A',
                `"${log.details}"`
            ].join(','))
        ].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=activity-logs.csv');
        res.send(csv);
    } catch (error) {
        console.error("Export Logs Error:", error);
        res.status(500).json({ error: "Failed to export logs" });
    }
};

/**
 * Send announcement
 */
exports.sendAnnouncement = async (req, res) => {
    try {
        const Announcement = require('../models/Announcement');
        const { v4: uuidv4 } = require('uuid');
        const { sendAnnouncementNotification } = require('../services/pushNotificationService');
        const { title, message, targetAudience, priority } = req.body;

        if (!title || !message) {
            return res.status(400).json({ error: "Title and message required" });
        }

        const announcement = await Announcement.create({
            id: uuidv4(),
            title,
            message,
            targetAudience: targetAudience || 'all',
            priority: priority || 'medium',
            createdBy: req.user.id,
            createdByEmail: req.user.email
        });

        // Send push notifications to targeted users
        try {
            // Build query based on target audience
            let userQuery = {};

            if (targetAudience === 'patients') {
                userQuery.role = 'patient';
            } else if (targetAudience === 'doctors') {
                userQuery.role = 'doctor';
            } else if (targetAudience === 'verified_doctors') {
                userQuery = { role: 'doctor', verificationStatus: 'verified' };
            }
            // 'all' means no filter, so userQuery remains {}

            // Fetch users with FCM tokens
            const users = await User.find({
                ...userQuery,
                fcmToken: { $exists: true, $ne: null }
            }).select('fcmToken');

            const fcmTokens = users.map(u => u.fcmToken).filter(Boolean);

            if (fcmTokens.length > 0) {
                console.log(`📢 Sending announcement to ${fcmTokens.length} users...`);

                const notificationResult = await sendAnnouncementNotification(fcmTokens, {
                    title,
                    message,
                    priority: priority || 'medium',
                    announcementId: announcement.id
                });

                console.log(`📢 Notification results: ${notificationResult.successCount} succeeded, ${notificationResult.failureCount} failed`);

                res.json({
                    message: "Announcement sent successfully",
                    announcement,
                    notificationStats: {
                        totalUsers: fcmTokens.length,
                        successCount: notificationResult.successCount,
                        failureCount: notificationResult.failureCount
                    }
                });
            } else {
                console.log('📢 No users with FCM tokens found for this announcement');
                res.json({
                    message: "Announcement created successfully (no users with FCM tokens)",
                    announcement,
                    notificationStats: {
                        totalUsers: 0,
                        successCount: 0,
                        failureCount: 0
                    }
                });
            }
        } catch (notificationError) {
            // Log error but don't fail the announcement creation
            console.error('❌ Failed to send push notifications:', notificationError);
            res.json({
                message: "Announcement created but push notifications failed",
                announcement,
                notificationError: notificationError.message
            });
        }
    } catch (error) {
        console.error("Send Announcement Error:", error);
        res.status(500).json({ error: "Failed to send announcement" });
    }
};

/**
 * Get announcements
 */
exports.getAnnouncements = async (req, res) => {
    try {
        const Announcement = require('../models/Announcement');
        const { limit = 50 } = req.query;

        const announcements = await Announcement.find({})
            .sort({ sentAt: -1 })
            .limit(parseInt(limit));

        res.json({ announcements, count: announcements.length });
    } catch (error) {
        console.error("Get Announcements Error:", error);
        res.status(500).json({ error: "Failed to fetch announcements" });
    }
};

/**
 * Get user-specific announcements based on role
 */
exports.getUserAnnouncements = async (req, res) => {
    try {
        const Announcement = require('../models/Announcement');
        const { limit = 50 } = req.query;
        const userRole = req.user.role;

        // Build query to fetch announcements for this user
        let query = {
            $or: [
                { targetAudience: 'all' }
            ]
        };

        // Add role-specific announcements
        if (userRole === 'patient') {
            query.$or.push({ targetAudience: 'patients' });
        } else if (userRole === 'doctor') {
            query.$or.push({ targetAudience: 'doctors' });

            // If doctor is verified, also include verified_doctors announcements
            if (req.user.verificationStatus === 'verified') {
                query.$or.push({ targetAudience: 'verified_doctors' });
            }
        }

        const announcements = await Announcement.find(query)
            .select('id title message priority sentAt targetAudience')
            .sort({ sentAt: -1 })
            .limit(parseInt(limit));

        res.json({ announcements, count: announcements.length });
    } catch (error) {
        console.error("Get User Announcements Error:", error);
        res.status(500).json({ error: "Failed to fetch announcements" });
    }
};

/**
 * Export users to CSV
 */
exports.exportUsers = async (req, res) => {
    try {
        const users = await User.find({}).select('-password -otp -otpExpires');

        const csv = [
            ['ID', 'Username', 'Email', 'Role', 'Status', 'Created'].join(','),
            ...users.map(u => [
                u.id,
                u.username,
                u.email,
                u.role,
                u.verificationStatus,
                new Date(u.createdAt).toISOString()
            ].join(','))
        ].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=users-report.csv');
        res.send(csv);
    } catch (error) {
        console.error("Export Users Error:", error);
        res.status(500).json({ error: "Failed to export users" });
    }
};
