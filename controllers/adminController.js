const { isValidUserId } = require('../utils/validation');
const { v4: uuidv4 } = require('uuid');
const { sendAnnouncementNotification } = require('../services/pushNotificationService');
const { getIO } = require('../utils/socket');

exports.getPendingDoctors = async (req, res) => {
    try {
        const { User } = req.models;
        const pendingDoctors = await User.aggregate([
            { $match: { role: 'doctor', verificationStatus: 'under_review' } },
            { $lookup: { from: 'doctordetails', localField: 'id', foreignField: 'userId', as: 'details' } },
            { $unwind: { path: '$details', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    _id: 0, id: 1, username: 1, email: 1, verificationStatus: 1, createdAt: 1, profilePicUrl: 1,
                    firstName: '$details.firstName', lastName: '$details.lastName', phoneNumber: '$details.phoneNumber',
                    specialization: '$details.specialization', experience: '$details.experience',
                    education: '$details.education', hospital: '$details.hospital',
                    proofFileUrl: '$details.proofFileUrl', bio: '$details.bio'
                }
            },
            { $sort: { createdAt: -1 } }
        ]);
        res.json({ count: pendingDoctors.length, doctors: pendingDoctors });
    } catch (error) {
        console.error('Get Pending Doctors Error:', error);
        res.status(500).json({ error: 'Failed to fetch pending doctors' });
    }
};

exports.verifyDoctor = async (req, res) => {
    try {
        const { User } = req.models;
        const { userId } = req.params;
        const { action, reason } = req.body;

        if (!isValidUserId(userId)) return res.status(400).json({ error: 'Invalid user ID format' });
        if (!['approve', 'reject'].includes(action)) return res.status(400).json({ error: "Action must be 'approve' or 'reject'" });

        const doctor = await User.findOne({ id: userId, role: 'doctor' });
        if (!doctor) return res.status(404).json({ error: 'Doctor not found' });
        if (doctor.verificationStatus === 'verified') return res.status(400).json({ error: 'Doctor is already verified' });

        doctor.verificationStatus = action === 'approve' ? 'verified' : 'rejected';
        if (action === 'reject' && reason) doctor.rejectionReason = reason;
        await doctor.save();

        res.json({ message: `Doctor ${action === 'approve' ? 'approved' : 'rejected'} successfully`, doctor: { id: doctor.id, email: doctor.email, verificationStatus: doctor.verificationStatus } });
    } catch (error) {
        console.error('Verify Doctor Error:', error);
        res.status(500).json({ error: 'Failed to verify doctor' });
    }
};

exports.getAdminStats = async (req, res) => {
    try {
        const { User } = req.models;
        const stats = await Promise.all([
            User.countDocuments({ role: 'doctor', verificationStatus: 'under_review' }),
            User.countDocuments({ role: 'doctor', verificationStatus: 'verified' }),
            User.countDocuments({ role: 'doctor', verificationStatus: 'rejected' }),
            User.countDocuments({ role: 'patient' })
        ]);
        res.json({ pendingDoctors: stats[0], verifiedDoctors: stats[1], rejectedDoctors: stats[2], totalPatients: stats[3] });
    } catch (error) {
        console.error('Get Admin Stats Error:', error);
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
};

exports.getAllDoctors = async (req, res) => {
    try {
        const { User } = req.models;
        const { status } = req.query;
        const match = { role: 'doctor' };
        if (status) match.verificationStatus = status;

        const doctors = await User.aggregate([
            { $match: match },
            { $lookup: { from: 'doctordetails', localField: 'id', foreignField: 'userId', as: 'details' } },
            { $unwind: { path: '$details', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    _id: 0, id: 1, username: 1, email: 1, verificationStatus: 1, createdAt: 1,
                    firstName: '$details.firstName', lastName: '$details.lastName',
                    specialization: '$details.specialization', experience: '$details.experience', hospital: '$details.hospital'
                }
            },
            { $sort: { createdAt: -1 } }
        ]);
        res.json({ doctors });
    } catch (error) {
        console.error('Get All Doctors Error:', error);
        res.status(500).json({ error: 'Failed to fetch doctors' });
    }
};

exports.getAllUsers = async (req, res) => {
    try {
        const { User } = req.models;
        const { role, status, search } = req.query;
        const match = {};
        if (role) match.role = role;
        if (status) match.verificationStatus = status;
        if (search) match.$or = [{ email: { $regex: search, $options: 'i' } }, { username: { $regex: search, $options: 'i' } }];

        const users = await User.find(match).select('-password -otp -otpExpires').sort({ createdAt: -1 }).limit(100);
        res.json({ users, count: users.length });
    } catch (error) {
        console.error('Get All Users Error:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
};

exports.getAllPatients = async (req, res) => {
    try {
        const { User } = req.models;
        const patients = await User.aggregate([
            { $match: { role: 'patient' } },
            { $lookup: { from: 'patientdetails', localField: 'id', foreignField: 'userId', as: 'details' } },
            { $unwind: { path: '$details', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    _id: 0, id: 1, username: 1, email: 1, verificationStatus: 1, createdAt: 1,
                    firstName: '$details.firstName', lastName: '$details.lastName',
                    phoneNumber: '$details.phoneNumber', dateOfBirth: '$details.dateOfBirth', gender: '$details.gender'
                }
            },
            { $sort: { createdAt: -1 } }
        ]);
        res.json({ patients, count: patients.length });
    } catch (error) {
        console.error('Get All Patients Error:', error);
        res.status(500).json({ error: 'Failed to fetch patients' });
    }
};

exports.getAllAppointments = async (req, res) => {
    try {
        const { Appointment, User } = req.models;
        const { status, limit = 50 } = req.query;
        const match = {};
        if (status) match.status = status;

        const appointments = await Appointment.find(match).sort({ date: -1, time: -1 }).limit(parseInt(limit)).lean();

        const patientIds = [...new Set(appointments.map(a => a.patientId).filter(Boolean))];
        const doctorIds = [...new Set(appointments.map(a => a.doctorId).filter(Boolean))];

        const [patients, doctors] = await Promise.all([
            User.find({ id: { $in: patientIds } }).select('id username email'),
            User.find({ id: { $in: doctorIds } }).select('id username email')
        ]);

        const patientMap = {};
        patients.forEach(p => { patientMap[p.id] = p; });
        const doctorMap = {};
        doctors.forEach(d => { doctorMap[d.id] = d; });

        const enrichedAppointments = appointments.map(apt => ({
            ...apt, patient: patientMap[apt.patientId] || null, doctor: doctorMap[apt.doctorId] || null
        }));

        const stats = await Appointment.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]);
        res.json({ appointments: enrichedAppointments, stats });
    } catch (error) {
        console.error('Get All Appointments Error:', error);
        res.status(500).json({ error: 'Failed to fetch appointments' });
    }
};

exports.getAnalytics = async (req, res) => {
    try {
        const { User, DoctorDetail } = req.models;
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        const [userGrowth, activeUsers, newSignups, specializationDist] = await Promise.all([
            User.aggregate([
                { $group: { _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' }, role: '$role' }, count: { $sum: 1 } } },
                { $sort: { '_id.year': 1, '_id.month': 1 } }
            ]),
            User.countDocuments({ updatedAt: { $gte: thirtyDaysAgo } }),
            User.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
            DoctorDetail.aggregate([{ $group: { _id: '$specialization', count: { $sum: 1 } } }, { $sort: { count: -1 } }])
        ]);

        res.json({ userGrowth, activeUsers, newSignups, specializationDistribution: specializationDist });
    } catch (error) {
        console.error('Get Analytics Error:', error);
        res.status(500).json({ error: 'Failed to fetch analytics' });
    }
};

exports.updateUser = async (req, res) => {
    try {
        const { User } = req.models;
        const { userId } = req.params;
        const { action, role, verificationStatus } = req.body;

        if (!isValidUserId(userId)) return res.status(400).json({ error: 'Invalid user ID' });

        const user = await User.findOne({ id: userId });
        if (!user) return res.status(404).json({ error: 'User not found' });

        if (action === 'suspend') user.verificationStatus = 'rejected';
        else if (action === 'activate') user.verificationStatus = 'verified';

        if (role && ['patient', 'doctor', 'admin', 'clinic_admin'].includes(role)) user.role = role;
        if (verificationStatus) user.verificationStatus = verificationStatus;

        await user.save();
        res.json({ message: 'User updated successfully', user: { id: user.id, email: user.email, role: user.role, verificationStatus: user.verificationStatus } });
    } catch (error) {
        console.error('Update User Error:', error);
        res.status(500).json({ error: 'Failed to update user' });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        const { User } = req.models;
        const { userId } = req.params;

        if (!isValidUserId(userId)) return res.status(400).json({ error: 'Invalid user ID' });

        const user = await User.findOne({ id: userId });
        if (!user) return res.status(404).json({ error: 'User not found' });
        if (user.role === 'admin' || user.role === 'clinic_admin') return res.status(403).json({ error: 'Cannot delete admin users' });

        await User.deleteOne({ id: userId });
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Delete User Error:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
};

exports.bulkVerifyDoctors = async (req, res) => {
    try {
        const { User } = req.models;
        const { userIds, action } = req.body;

        if (!Array.isArray(userIds) || userIds.length === 0) return res.status(400).json({ error: 'userIds array required' });
        if (!['approve', 'reject'].includes(action)) return res.status(400).json({ error: "Action must be 'approve' or 'reject'" });

        const newStatus = action === 'approve' ? 'verified' : 'rejected';
        const result = await User.updateMany({ id: { $in: userIds }, role: 'doctor' }, { $set: { verificationStatus: newStatus } });

        res.json({ message: `${result.modifiedCount} doctors ${action}d successfully`, count: result.modifiedCount });
    } catch (error) {
        console.error('Bulk Verify Error:', error);
        res.status(500).json({ error: 'Failed to bulk verify doctors' });
    }
};

exports.getActivityLogs = async (req, res) => {
    try {
        const { ActivityLog } = req.models;
        const { startDate, endDate, action, adminId, limit = 100 } = req.query;

        const match = {};
        if (startDate || endDate) {
            match.timestamp = {};
            if (startDate) match.timestamp.$gte = new Date(startDate);
            if (endDate) match.timestamp.$lte = new Date(endDate);
        }
        if (action) match.action = action;
        if (adminId) match.adminId = adminId;

        const logs = await ActivityLog.find(match).sort({ timestamp: -1 }).limit(parseInt(limit));
        res.json({ logs, count: logs.length });
    } catch (error) {
        console.error('Get Activity Logs Error:', error);
        res.status(500).json({ error: 'Failed to fetch activity logs' });
    }
};

exports.exportActivityLogs = async (req, res) => {
    try {
        const { ActivityLog } = req.models;
        const logs = await ActivityLog.find({}).sort({ timestamp: -1 }).limit(1000);

        const csv = [
            ['Timestamp', 'Admin Email', 'Action', 'Target Type', 'Target ID', 'Details'].join(','),
            ...logs.map(log => [
                new Date(log.timestamp).toISOString(), log.adminEmail, log.action,
                log.targetType || 'N/A', log.targetId || 'N/A', `"${log.details}"`
            ].join(','))
        ].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=activity-logs.csv');
        res.send(csv);
    } catch (error) {
        console.error('Export Logs Error:', error);
        res.status(500).json({ error: 'Failed to export logs' });
    }
};

exports.sendAnnouncement = async (req, res) => {
    try {
        const { Announcement, User } = req.models;
        const { title, message, targetAudience, priority } = req.body;

        if (!title || !message) return res.status(400).json({ error: 'Title and message required' });

        const announcement = await Announcement.create({
            id: uuidv4(), title, message,
            targetAudience: targetAudience || 'all', priority: priority || 'medium',
            createdBy: req.user.id, createdByEmail: req.user.email
        });

        try {
            const io = getIO();
            io.emit('new_announcement', { id: announcement.id, title: announcement.title, message: announcement.message, targetAudience: announcement.targetAudience, priority: announcement.priority, sentAt: announcement.sentAt });
        } catch (socketError) {
            console.error('Failed to emit WebSocket event:', socketError);
        }

        try {
            let userQuery = {};
            if (targetAudience === 'patients') userQuery.role = 'patient';
            else if (targetAudience === 'doctors') userQuery.role = 'doctor';
            else if (targetAudience === 'verified_doctors') userQuery = { role: 'doctor', verificationStatus: 'verified' };

            const users = await User.find({ ...userQuery, fcmToken: { $exists: true, $ne: null } }).select('fcmToken');
            const fcmTokens = users.map(u => u.fcmToken).filter(Boolean);

            if (fcmTokens.length > 0) {
                const notificationResult = await sendAnnouncementNotification(fcmTokens, { title, message, priority: priority || 'medium', announcementId: announcement.id });
                res.json({ message: 'Announcement sent successfully', announcement, notificationStats: { totalUsers: fcmTokens.length, successCount: notificationResult.successCount, failureCount: notificationResult.failureCount } });
            } else {
                res.json({ message: 'Announcement created successfully (no users with FCM tokens)', announcement, notificationStats: { totalUsers: 0, successCount: 0, failureCount: 0 } });
            }
        } catch (notificationError) {
            console.error('Failed to send push notifications:', notificationError);
            res.json({ message: 'Announcement created but push notifications failed', announcement, notificationError: notificationError.message });
        }
    } catch (error) {
        console.error('Send Announcement Error:', error);
        res.status(500).json({ error: 'Failed to send announcement' });
    }
};

exports.getAnnouncements = async (req, res) => {
    try {
        const { Announcement } = req.models;
        const { limit = 50 } = req.query;
        const announcements = await Announcement.find({}).sort({ sentAt: -1 }).limit(parseInt(limit));
        res.json({ announcements, count: announcements.length });
    } catch (error) {
        console.error('Get Announcements Error:', error);
        res.status(500).json({ error: 'Failed to fetch announcements' });
    }
};

exports.getUserAnnouncements = async (req, res) => {
    try {
        const { Announcement } = req.models;
        const { limit = 50 } = req.query;
        const userRole = req.user.role;

        const query = { $or: [{ targetAudience: 'all' }] };
        if (userRole === 'patient') query.$or.push({ targetAudience: 'patients' });
        else if (userRole === 'doctor') {
            query.$or.push({ targetAudience: 'doctors' });
            if (req.user.verificationStatus === 'verified') query.$or.push({ targetAudience: 'verified_doctors' });
        }

        const announcements = await Announcement.find(query).select('id title message priority sentAt targetAudience').sort({ sentAt: -1 }).limit(parseInt(limit));
        res.json({ announcements, count: announcements.length });
    } catch (error) {
        console.error('Get User Announcements Error:', error);
        res.status(500).json({ error: 'Failed to fetch announcements' });
    }
};

exports.exportUsers = async (req, res) => {
    try {
        const { User } = req.models;
        const users = await User.find({}).select('-password -otp -otpExpires');

        const csv = [
            ['ID', 'Username', 'Email', 'Role', 'Status', 'Created'].join(','),
            ...users.map(u => [u.id, u.username, u.email, u.role, u.verificationStatus, new Date(u.createdAt).toISOString()].join(','))
        ].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=users-report.csv');
        res.send(csv);
    } catch (error) {
        console.error('Export Users Error:', error);
        res.status(500).json({ error: 'Failed to export users' });
    }
};
