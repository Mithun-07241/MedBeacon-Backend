const {
    validateBookingParams,
    isValidNumber,
    sanitizeString
} = require('../utils/validation');

const appointmentPipeline = (match) => [
    { $match: match },
    { $lookup: { from: 'users', localField: 'patientId', foreignField: 'id', as: 'patientUser' } },
    { $unwind: { path: '$patientUser', preserveNullAndEmptyArrays: true } },
    { $lookup: { from: 'patientdetails', localField: 'patientId', foreignField: 'userId', as: 'patientDetails' } },
    { $unwind: { path: '$patientDetails', preserveNullAndEmptyArrays: true } },
    { $lookup: { from: 'users', localField: 'doctorId', foreignField: 'id', as: 'doctorUser' } },
    { $unwind: { path: '$doctorUser', preserveNullAndEmptyArrays: true } },
    { $lookup: { from: 'doctordetails', localField: 'doctorId', foreignField: 'userId', as: 'doctorDetails' } },
    { $unwind: { path: '$doctorDetails', preserveNullAndEmptyArrays: true } },
    {
        $project: {
            _id: 1, patientId: 1, doctorId: 1, date: 1, time: 1, reason: 1,
            notes: 1, status: 1, rating: 1, feedback: 1, rated: 1, createdAt: 1, updatedAt: 1,
            patient: {
                id: '$patientUser.id', username: '$patientUser.username',
                email: '$patientUser.email', profilePicUrl: '$patientUser.profilePicUrl',
                phoneNumber: '$patientDetails.phoneNumber', age: '$patientDetails.age',
                gender: '$patientDetails.gender'
            },
            doctor: {
                id: '$doctorUser.id', username: '$doctorUser.username',
                email: '$doctorUser.email', profilePicUrl: '$doctorUser.profilePicUrl',
                phoneNumber: '$doctorDetails.phoneNumber', specialization: '$doctorDetails.specialization',
                experience: '$doctorDetails.experience', address: '$doctorDetails.address'
            }
        }
    }
];

exports.getAppointments = async (req, res) => {
    try {
        const { Appointment } = req.models;
        const userId = req.user.id;
        const role = req.user.role;

        let match = {};
        if (req.params.id) {
            if (role === 'doctor') match = { patientId: req.params.id };
            else return res.status(403).json({ error: 'Access denied' });
        } else {
            if (role === 'patient') match = { patientId: userId };
            else if (role === 'doctor') match = { doctorId: userId };
            else if (role === 'admin' || role === 'clinic_admin') match = {};
            else return res.status(400).json({ error: 'Invalid role' });
        }

        const pipeline = [...appointmentPipeline(match), { $sort: { date: -1, time: -1 } }];
        const appointments = await Appointment.aggregate(pipeline);
        res.json(appointments);
    } catch (error) {
        console.error('Get Appointments Error:', error);
        res.status(500).json({ error: 'Failed to fetch appointments' });
    }
};

exports.getAppointmentById = async (req, res) => {
    try {
        const { Appointment } = req.models;
        const { id } = req.params;
        const userId = req.user.id;
        const role = req.user.role;
        const { ObjectId } = require('mongoose').Types;

        const pipeline = appointmentPipeline({ _id: new ObjectId(id) });
        const results = await Appointment.aggregate(pipeline);
        const appointment = results[0];

        if (!appointment) return res.status(404).json({ error: 'Appointment not found' });
        if (role === 'patient' && appointment.patientId !== userId) return res.status(403).json({ error: 'Denied' });
        if (role === 'doctor' && appointment.doctorId !== userId) return res.status(403).json({ error: 'Denied' });

        res.json(appointment);
    } catch (error) {
        console.error('Get Appointment By Id Error:', error);
        res.status(500).json({ error: 'Failed to fetch appointment' });
    }
};

exports.createAppointment = async (req, res) => {
    try {
        const { Appointment } = req.models;
        const { doctorId, date, time, reason, notes } = req.body;

        if (req.user.role !== 'patient') return res.status(403).json({ error: 'Only patients can book' });

        const validation = validateBookingParams({ doctorId, date, time, reason, notes });
        if (!validation.isValid) return res.status(400).json({ error: validation.errors.join(', ') });

        const appointment = await Appointment.create({
            patientId: req.user.id,
            ...validation.sanitized,
            status: 'pending'
        });

        res.status(201).json(appointment);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create appointment' });
    }
};

exports.updateAppointment = async (req, res) => {
    try {
        const { Appointment } = req.models;
        const { id } = req.params;
        const { status, notes } = req.body;
        const role = req.user.role;

        const appointment = await Appointment.findById(id);
        if (!appointment) return res.status(404).json({ error: 'Not found' });

        if (role === 'patient' && appointment.patientId !== req.user.id) return res.status(403).json({ error: 'Denied' });
        if (role === 'doctor' && appointment.doctorId !== req.user.id) return res.status(403).json({ error: 'Denied' });

        const allowedStatuses = role === 'patient' ? ['cancelled'] : ['confirmed', 'rejected', 'completed', 'cancelled'];
        if (status && !allowedStatuses.includes(status)) return res.status(400).json({ error: 'Invalid status update' });

        if (status) appointment.status = status;
        if (notes !== undefined) appointment.notes = notes;

        await appointment.save();
        res.json(appointment);
    } catch (error) {
        res.status(500).json({ error: 'Failed update' });
    }
};

exports.deleteAppointment = async (req, res) => {
    try {
        const { Appointment } = req.models;
        const { id } = req.params;
        const appointment = await Appointment.findById(id);

        if (!appointment) return res.status(404).json({ error: 'Not found' });
        if (req.user.role !== 'patient' || appointment.patientId !== req.user.id) return res.status(403).json({ error: 'Denied' });
        if (appointment.status !== 'pending') return res.status(400).json({ error: 'Can only delete pending' });

        await Appointment.findByIdAndDelete(id);
        res.json({ message: 'Deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Failed delete' });
    }
};

exports.submitRating = async (req, res) => {
    try {
        const { Appointment } = req.models;
        const { id } = req.params;
        const { rating, feedback } = req.body;
        const userId = req.user.id;
        const role = req.user.role;

        if (role !== 'patient') return res.status(403).json({ error: 'Only patients can rate appointments' });
        if (!rating || !isValidNumber(rating, 1, 5)) return res.status(400).json({ error: 'Rating must be between 1 and 5' });

        const sanitizedFeedback = feedback ? sanitizeString(feedback) : '';
        const appointment = await Appointment.findById(id);
        if (!appointment) return res.status(404).json({ error: 'Appointment not found' });
        if (appointment.patientId !== userId) return res.status(403).json({ error: 'Access denied' });
        if (appointment.status !== 'completed') return res.status(400).json({ error: 'Only completed appointments can be rated' });
        if (appointment.rated) return res.status(400).json({ error: 'Appointment already rated' });

        appointment.rating = rating;
        appointment.feedback = sanitizedFeedback;
        appointment.rated = true;
        await appointment.save();

        res.json({ success: true, message: 'Rating submitted successfully', appointment });
    } catch (error) {
        console.error('Submit Rating Error:', error);
        res.status(500).json({ error: 'Failed to submit rating' });
    }
};

exports.getDoctorStats = async (req, res) => {
    try {
        const { Appointment } = req.models;
        const { doctorId } = req.params;

        const stats = await Appointment.aggregate([
            { $match: { doctorId, status: 'completed' } },
            {
                $group: {
                    _id: null,
                    completedCount: { $sum: 1 },
                    totalRatings: { $sum: { $cond: [{ $eq: ['$rated', true] }, 1, 0] } },
                    sumRatings: { $sum: { $cond: [{ $eq: ['$rated', true] }, '$rating', 0] } }
                }
            },
            {
                $project: {
                    _id: 0, completedCount: 1, totalRatings: 1,
                    averageRating: { $cond: [{ $gt: ['$totalRatings', 0] }, { $divide: ['$sumRatings', '$totalRatings'] }, 0] }
                }
            }
        ]);

        res.json(stats[0] || { completedCount: 0, totalRatings: 0, averageRating: 0 });
    } catch (error) {
        console.error('Get Doctor Stats Error:', error);
        res.status(500).json({ error: 'Failed to fetch doctor stats' });
    }
};
