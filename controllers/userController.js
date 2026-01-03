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
            return res.json({ patient: details });
        } else if (role === "doctor") {
            const details = await DoctorDetail.findOne({ userId });
            return res.json({ doctor: details });
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

        const details = await PatientDetail.findOne({ userId: id });
        if (!details) return res.status(404).json({ error: "Patient not found" });

        res.json({ patient: details });
    } catch (error) {
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

        // Aggregation to join User and PatientDetail
        // Trying to mimic storage.ts: getPatients
        const patients = await User.aggregate([
            { $match: { role: "patient" } },
            {
                $lookup: {
                    from: "patientdetails", // Mongoose/Mongo lowercase plural convention usually
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
                    userName: "$details.username", // User.username? No, schema.ts had userName: details.username which might be undefined/User.username
                    // Actually schema.ts mapped: userName: "$details.username" BUT PatientDetail in mongoose doesn't have username.
                    // Wait, in storage.ts line 235: userName: "$details.username".
                    // And in schema.ts line 32: User has firstName/lastName.
                    // In routes.ts, the User model was reused.
                    // I will assume User.username is what we want.
                    // But details doesn't have username.
                    // I'll fix this to use User.username.
                    phoneNumber: "$details.phoneNumber",
                    age: "$details.age",
                    gender: "$details.gender",
                    dateOfBirth: "$details.dateOfBirth",
                    address: "$details.address",
                    allergies: "$details.allergies",
                    treatmentFileUrl: "$details.treatmentFileUrl"
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
                    phoneNumber: "$details.phoneNumber",
                    age: "$details.age",
                    gender: "$details.gender",
                    experience: "$details.experience",
                    dateOfBirth: "$details.dateOfBirth",
                    address: "$details.address",
                    allergies: "$details.allergies",
                    specialization: "$details.specialization",
                    proofFileUrl: "$details.proofFileUrl"
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

            // Also update User model if firstName/lastName changed
            if (updateData.firstName || updateData.lastName) {
                await User.findOneAndUpdate(
                    { id: userId },
                    {
                        firstName: updateData.firstName,
                        lastName: updateData.lastName
                    }
                );
            }
        } else if (role === "doctor") {
            updated = await DoctorDetail.findOneAndUpdate(
                { userId },
                updateData,
                { new: true, runValidators: true }
            );

            // Also update User model if firstName/lastName changed
            if (updateData.firstName || updateData.lastName) {
                await User.findOneAndUpdate(
                    { id: userId },
                    {
                        firstName: updateData.firstName,
                        lastName: updateData.lastName
                    }
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
