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
