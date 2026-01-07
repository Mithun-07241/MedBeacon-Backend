const Appointment = require("../models/Appointment");
const User = require("../models/User");

// Helper to fully populate appointment data
const populateAppointment = async (query) => {
    return query
        .aggregate([
            // Lookup Patient User
            {
                $lookup: {
                    from: "users",
                    localField: "patientId",
                    foreignField: "id",
                    as: "patientUser"
                }
            },
            { $unwind: "$patientUser" },
            // Lookup Patient Details
            {
                $lookup: {
                    from: "patientdetails",
                    localField: "patientId",
                    foreignField: "userId",
                    as: "patientDetails"
                }
            },
            { $unwind: "$patientDetails" },
            // Lookup Doctor User
            {
                $lookup: {
                    from: "users",
                    localField: "doctorId",
                    foreignField: "id",
                    as: "doctorUser"
                }
            },
            { $unwind: "$doctorUser" },
            // Lookup Doctor Details
            {
                $lookup: {
                    from: "doctordetails",
                    localField: "doctorId",
                    foreignField: "userId",
                    as: "doctorDetails"
                }
            },
            { $unwind: "$doctorDetails" },
            // Project
            {
                $project: {
                    _id: 1,
                    patientId: 1,
                    doctorId: 1,
                    date: 1,
                    time: 1,
                    reason: 1,
                    notes: 1,
                    status: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    patient: {
                        id: "$patientUser.id",
                        username: "$patientUser.username",
                        email: "$patientUser.email",
                        profilePicUrl: "$patientUser.profilePicUrl",
                        phoneNumber: "$patientDetails.phoneNumber",
                        age: "$patientDetails.age",
                        gender: "$patientDetails.gender"
                    },
                    doctor: {
                        id: "$doctorUser.id",
                        username: "$doctorUser.username",
                        email: "$doctorUser.email",
                        profilePicUrl: "$doctorUser.profilePicUrl",
                        phoneNumber: "$doctorDetails.phoneNumber",
                        specialization: "$doctorDetails.specialization",
                        experience: "$doctorDetails.experience",
                        address: "$doctorDetails.address"
                    }
                }
            }
        ]);
};


exports.getAppointments = async (req, res) => {
    try {
        const userId = req.user.id;
        const role = req.user.role;

        let match = {};

        // Handle /patient/:id route
        if (req.params.id) {
            if (role === "doctor") {
                // Doctor viewing specific patient's appointments
                match = { patientId: req.params.id };
            } else {
                return res.status(403).json({ error: "Access denied" });
            }
        } else {
            // Regular route - show user's own appointments
            if (role === "patient") {
                match = { patientId: userId };
            } else if (role === "doctor") {
                match = { doctorId: userId };
            } else {
                return res.status(400).json({ error: "Invalid role" });
            }
        }

        const pipeline = [
            { $match: match },
            // ... Same lookups as above
            {
                $lookup: {
                    from: "users",
                    localField: "patientId",
                    foreignField: "id",
                    as: "patientUser"
                }
            },
            { $unwind: "$patientUser" },
            {
                $lookup: {
                    from: "patientdetails",
                    localField: "patientId",
                    foreignField: "userId",
                    as: "patientDetails"
                }
            },
            { $unwind: "$patientDetails" },
            {
                $lookup: {
                    from: "users",
                    localField: "doctorId",
                    foreignField: "id",
                    as: "doctorUser"
                }
            },
            { $unwind: "$doctorUser" },
            {
                $lookup: {
                    from: "doctordetails",
                    localField: "doctorId",
                    foreignField: "userId",
                    as: "doctorDetails"
                }
            },
            { $unwind: "$doctorDetails" },
            {
                $project: {
                    _id: 1,
                    patientId: 1,
                    doctorId: 1,
                    date: 1,
                    time: 1,
                    reason: 1,
                    notes: 1,
                    status: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    patient: {
                        id: "$patientUser.id",
                        username: "$patientUser.username",
                        email: "$patientUser.email",
                        profilePicUrl: "$patientUser.profilePicUrl",
                        phoneNumber: "$patientDetails.phoneNumber",
                        age: "$patientDetails.age",
                        gender: "$patientDetails.gender"
                    },
                    doctor: {
                        id: "$doctorUser.id",
                        username: "$doctorUser.username",
                        email: "$doctorUser.email",
                        profilePicUrl: "$doctorUser.profilePicUrl",
                        phoneNumber: "$doctorDetails.phoneNumber",
                        specialization: "$doctorDetails.specialization",
                        experience: "$doctorDetails.experience",
                        address: "$doctorDetails.address"
                    }
                }
            },
            { $sort: { date: -1, time: -1 } }
        ];

        const appointments = await Appointment.aggregate(pipeline);
        res.json(appointments);

    } catch (error) {
        console.error("Get Appointments Error:", error);
        res.status(500).json({ error: "Failed to fetch appointments" });
    }
};

exports.getAppointmentById = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const role = req.user.role;
        const { ObjectId } = require("mongoose").Types;

        const pipeline = [
            { $match: { _id: new ObjectId(id) } },
            // ... Same lookups
            {
                $lookup: {
                    from: "users",
                    localField: "patientId",
                    foreignField: "id",
                    as: "patientUser"
                }
            },
            { $unwind: "$patientUser" },
            {
                $lookup: {
                    from: "patientdetails",
                    localField: "patientId",
                    foreignField: "userId",
                    as: "patientDetails"
                }
            },
            { $unwind: "$patientDetails" },
            {
                $lookup: {
                    from: "users",
                    localField: "doctorId",
                    foreignField: "id",
                    as: "doctorUser"
                }
            },
            { $unwind: "$doctorUser" },
            {
                $lookup: {
                    from: "doctordetails",
                    localField: "doctorId",
                    foreignField: "userId",
                    as: "doctorDetails"
                }
            },
            { $unwind: "$doctorDetails" },
            {
                $project: {
                    _id: 1,
                    patientId: 1,
                    doctorId: 1,
                    date: 1,
                    time: 1,
                    reason: 1,
                    notes: 1,
                    status: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    patient: {
                        id: "$patientUser.id",
                        username: "$patientUser.username",
                        email: "$patientUser.email",
                        profilePicUrl: "$patientUser.profilePicUrl",
                        phoneNumber: "$patientDetails.phoneNumber",
                        age: "$patientDetails.age",
                        gender: "$patientDetails.gender"
                    },
                    doctor: {
                        id: "$doctorUser.id",
                        username: "$doctorUser.username",
                        email: "$doctorUser.email",
                        profilePicUrl: "$doctorUser.profilePicUrl",
                        phoneNumber: "$doctorDetails.phoneNumber",
                        specialization: "$doctorDetails.specialization",
                        experience: "$doctorDetails.experience",
                        address: "$doctorDetails.address"
                    }
                }
            }
        ];

        const results = await Appointment.aggregate(pipeline);
        const appointment = results[0];

        if (!appointment) return res.status(404).json({ error: "Appointment not found" });

        // Authorization
        if (role === "patient" && appointment.patientId !== userId) return res.status(403).json({ error: "Denied" });
        if (role === "doctor" && appointment.doctorId !== userId) return res.status(403).json({ error: "Denied" });

        res.json(appointment);
    } catch (error) {
        console.error("Get Appointment By Id Error:", error);
        res.status(500).json({ error: "Failed to fetch appointment" });
    }
};

exports.createAppointment = async (req, res) => {
    try {
        const { doctorId, date, time, reason, notes } = req.body;

        if (req.user.role !== "patient") return res.status(403).json({ error: "Only patients can book" });
        if (!doctorId || !date || !time) return res.status(400).json({ error: "Missing fields" });

        const appointment = await Appointment.create({
            patientId: req.user.id,
            doctorId,
            date,
            time,
            reason: reason || "",
            notes: notes || "",
            status: "pending"
        });

        res.status(201).json(appointment);
    } catch (error) {
        res.status(500).json({ error: "Failed to create appointment" });
    }
};

exports.updateAppointment = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, notes } = req.body;
        const role = req.user.role;

        const appointment = await Appointment.findById(id);
        if (!appointment) return res.status(404).json({ error: "Not found" });

        if (role === "patient" && appointment.patientId !== req.user.id) return res.status(403).json({ error: "Denied" });
        if (role === "doctor" && appointment.doctorId !== req.user.id) return res.status(403).json({ error: "Denied" });

        const allowedStatuses = role === "patient"
            ? ["cancelled"]
            : ["confirmed", "rejected", "completed", "cancelled"];

        if (status && !allowedStatuses.includes(status)) {
            return res.status(400).json({ error: "Invalid status update" });
        }

        if (status) appointment.status = status;
        if (notes !== undefined) appointment.notes = notes;

        await appointment.save();
        res.json(appointment);
    } catch (error) {
        res.status(500).json({ error: "Failed update" });
    }
};

exports.deleteAppointment = async (req, res) => {
    try {
        const { id } = req.params;
        const appointment = await Appointment.findById(id);

        if (!appointment) return res.status(404).json({ error: "Not found" });

        if (req.user.role !== "patient" || appointment.patientId !== req.user.id) {
            return res.status(403).json({ error: "Denied" });
        }

        if (appointment.status !== "pending") {
            return res.status(400).json({ error: "Can only delete pending" });
        }

        await Appointment.findByIdAndDelete(id);
        res.json({ message: "Deleted" });
    } catch (error) {
        res.status(500).json({ error: "Failed delete" });
    }
};
