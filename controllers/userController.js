const User = require("../models/User");
const PatientDetail = require("../models/PatientDetail");
const DoctorDetail = require("../models/DoctorDetail");

exports.completeProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const role = req.user.role;
        const profileData = { ...req.body };

        // Handle file uploads (Cloudinary URLs)
        if (req.files) {
            console.log("Files received:", Object.keys(req.files));
            if (req.files.profilePicUrl) {
                // Use Cloudinary URL from req.files.path
                console.log("Profile pic uploaded:", req.files.profilePicUrl[0].path);
                profileData.profilePicUrl = req.files.profilePicUrl[0].path;
                // Update user profile pic
                await User.findOneAndUpdate({ id: userId }, { profilePicUrl: profileData.profilePicUrl });
            }
            if (role === "patient" && req.files.treatmentFileUrl) {
                console.log("Treatment file uploaded:", req.files.treatmentFileUrl[0].path);
                profileData.treatmentFileUrl = req.files.treatmentFileUrl[0].path;
            }
            if (role === "doctor" && req.files.proofFileUrl) {
                console.log("Proof file uploaded:", req.files.proofFileUrl[0].path);
                profileData.proofFileUrl = req.files.proofFileUrl[0].path;
            }
        } else {
            console.log("No files received in request");
        }

        // Trim strings
        ["dateOfBirth", "phoneNumber", "address", "allergies", "specialization", "experience", "gender"].forEach(field => {
            if (profileData[field] && typeof profileData[field] === "string") {
                profileData[field] = profileData[field].trim();
            }
        });

        let saved;
        if (role === "patient") {
            saved = await PatientDetail.findOneAndUpdate(
                { userId },
                { ...profileData, userId },
                { upsert: true, new: true }
            );
        } else if (role === "doctor") {
            saved = await DoctorDetail.findOneAndUpdate(
                { userId },
                { ...profileData, userId },
                { upsert: true, new: true }
            );
        } else {
            return res.status(400).json({ error: "Invalid role" });
        }

        await User.findOneAndUpdate({ id: userId }, { profileCompleted: true });

        res.status(201).json({
            message: "Profile saved successfully",
            details: saved
        });
    } catch (error) {
        console.error("Profile Complete Error:", error);
        res.status(500).json({ error: error.message || "Failed to complete profile" });
    }
};

exports.getProfileDetails = async (req, res) => {
    try {
        const userId = req.user.id;
        const role = req.user.role;

        if (role === "patient") {
            const details = await PatientDetail.findOne({ userId });
            // Get username and email from User model
            const user = await User.findOne({ id: userId });
            const patientData = details ? details.toObject() : {};
            return res.json({
                patient: {
                    ...patientData,
                    username: user?.username,
                    email: user?.email
                }
            });
        } else if (role === "doctor") {
            const details = await DoctorDetail.findOne({ userId });
            const user = await User.findOne({ id: userId });
            const doctorData = details ? details.toObject() : {};
            return res.json({
                doctor: {
                    ...doctorData,
                    username: user?.username,
                    email: user?.email
                }
            });
        } else {
            return res.status(400).json({ error: "Invalid role" });
        }
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch profile details" });
    }
};

exports.getPatientById = async (req, res) => {
    try {
        const { id } = req.params;
        const role = req.user.role;

        if (role === "patient" && id !== req.user.id) {
            return res.status(403).json({ error: "Access denied" });
        }

        // Get patient details
        const details = await PatientDetail.findOne({ userId: id });
        if (!details) return res.status(404).json({ error: "Patient not found" });

        // Get user data for username, email, profilePicUrl
        const user = await User.findOne({ id });
        if (!user) return res.status(404).json({ error: "User not found" });

        const patientData = details.toObject();

        // Merge user data with patient details
        res.json({
            patient: {
                ...patientData,
                id: user.id,
                username: user.username,
                email: user.email,
                profilePicUrl: user.profilePicUrl || patientData.profilePicUrl,
            }
        });
    } catch (error) {
        console.error("Get Patient By ID Error:", error);
        res.status(500).json({ error: "Failed to fetch patient details" });
    }
};

exports.updateCompletionStatus = async (req, res) => {
    try {
        const { profileCompleted } = req.body;
        if (typeof profileCompleted !== "boolean") {
            return res.status(400).json({ error: "Must be boolean" });
        }

        const updated = await User.findOneAndUpdate(
            { id: req.user.id },
            { profileCompleted },
            { new: true }
        );
        res.json({ message: "Updated", user: updated });
    } catch (error) {
        res.status(500).json({ error: "Failed update" });
    }
};

exports.getPatients = async (req, res) => {
    try {
        if (req.user.role !== "doctor") return res.status(403).json({ error: "Access denied" });

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
            { $unwind: "$details" },
            {
                $project: {
                    _id: 0,
                    id: 1,
                    username: 1,
                    email: 1,
                    role: 1,
                    profilePicUrl: 1,
                    firstName: "$details.firstName",
                    lastName: "$details.lastName",
                    phoneNumber: "$details.phoneNumber",
                    age: "$details.age",
                    gender: "$details.gender",
                    dateOfBirth: "$details.dateOfBirth",
                    address: "$details.address",
                    allergies: "$details.allergies",
                    treatmentFileUrl: "$details.treatmentFileUrl",
                    bio: "$details.bio",
                    emergencyContactName: "$details.emergencyContactName",
                    emergencyContactPhone: "$details.emergencyContactPhone",
                    bloodType: "$details.bloodType",
                    medicalHistory: "$details.medicalHistory"
                }
            }
        ]);

        res.json(patients);
    } catch (error) {
        console.error("Get Patients Error:", error);
        res.status(500).json({ error: "Failed to fetch patients" });
    }
};

exports.getDoctors = async (req, res) => {
    try {
        const doctors = await User.aggregate([
            { $match: { role: "doctor" } },
            {
                $lookup: {
                    from: "doctordetails",
                    localField: "id",
                    foreignField: "userId",
                    as: "details"
                }
            },
            { $unwind: "$details" },
            {
                $project: {
                    _id: 0,
                    id: 1,
                    username: 1,
                    email: 1,
                    role: 1,
                    profilePicUrl: 1,
                    firstName: "$details.firstName",
                    lastName: "$details.lastName",
                    phoneNumber: "$details.phoneNumber",
                    age: "$details.age",
                    gender: "$details.gender",
                    experience: "$details.experience",
                    dateOfBirth: "$details.dateOfBirth",
                    address: "$details.address",
                    specialization: "$details.specialization",
                    proofFileUrl: "$details.proofFileUrl",
                    bio: "$details.bio",
                    education: "$details.education",
                    graduationYear: "$details.graduationYear",
                    certifications: "$details.certifications",
                    hospital: "$details.hospital",
                    languages: "$details.languages",
                    availability: "$details.availability",
                    expertise: "$details.expertise"
                }
            }
        ]);
        res.json(doctors);
    } catch (error) {
        console.error("Get Doctors Error:", error);
        res.status(500).json({ error: "Failed to fetch doctors" });
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const role = req.user.role;
        const updateData = { ...req.body };

        // Remove fields that shouldn't be updated directly
        delete updateData.userId;
        delete updateData._id;
        delete updateData.createdAt;
        delete updateData.updatedAt;

        // Trim string fields
        ["firstName", "lastName", "dateOfBirth", "phoneNumber", "address", "allergies", "specialization", "experience", "gender", "bio", "education", "certifications", "hospital", "languages"].forEach(field => {
            if (updateData[field] && typeof updateData[field] === "string") {
                updateData[field] = updateData[field].trim();
            }
        });

        let updated;
        if (role === "patient") {
            updated = await PatientDetail.findOneAndUpdate(
                { userId },
                updateData,
                { new: true, runValidators: true }
            );

            // Also update User model if username, firstName, or lastName changed
            const userUpdates = {};
            if (updateData.username) userUpdates.username = updateData.username;
            if (updateData.firstName) userUpdates.firstName = updateData.firstName;
            if (updateData.lastName) userUpdates.lastName = updateData.lastName;

            if (Object.keys(userUpdates).length > 0) {
                await User.findOneAndUpdate(
                    { id: userId },
                    userUpdates
                );
            }
        } else if (role === "doctor") {
            updated = await DoctorDetail.findOneAndUpdate(
                { userId },
                updateData,
                { new: true, runValidators: true }
            );

            // Also update User model if username, firstName, or lastName changed
            const userUpdates = {};
            if (updateData.username) userUpdates.username = updateData.username;
            if (updateData.firstName) userUpdates.firstName = updateData.firstName;
            if (updateData.lastName) userUpdates.lastName = updateData.lastName;

            if (Object.keys(userUpdates).length > 0) {
                await User.findOneAndUpdate(
                    { id: userId },
                    userUpdates
                );
            }
        } else {
            return res.status(400).json({ error: "Invalid role" });
        }

        if (!updated) {
            return res.status(404).json({ error: "Profile not found" });
        }

        res.json({
            message: "Profile updated successfully",
            [role]: updated
        });
    } catch (error) {
        console.error("Update Profile Error:", error);
        res.status(500).json({ error: error.message || "Failed to update profile" });
    }
};

exports.uploadTreatmentFile = async (req, res) => {
    try {
        const userId = req.user.id;
        const role = req.user.role;

        if (role !== "patient") {
            return res.status(403).json({ error: "Only patients can upload treatment files" });
        }

        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        // File is uploaded to Cloudinary via multer middleware
        const treatmentFileUrl = req.file.path;

        // Update patient details with new treatment file URL
        const updated = await PatientDetail.findOneAndUpdate(
            { userId },
            { treatmentFileUrl },
            { new: true }
        );

        if (!updated) {
            return res.status(404).json({ error: "Patient profile not found" });
        }

        res.json({
            message: "Treatment file uploaded successfully",
            treatmentFileUrl
        });
    } catch (error) {
        console.error("Upload Treatment File Error:", error);
        res.status(500).json({ error: error.message || "Failed to upload treatment file" });
    }
};

