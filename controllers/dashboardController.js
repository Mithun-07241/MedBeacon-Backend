exports.getDoctorSummary = async (req, res) => {
    try {
        const { Appointment, User } = req.models;
        const doctorId = req.user.id;

        if (req.user.role !== 'doctor') {
            return res.status(403).json({ error: 'Access denied. Only doctors can access this summary.' });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Get stats in parallel
        const [
            totalAppointments,
            pendingAppointments,
            todayAppointments,
            upcomingAppointments,
            totalPatients
        ] = await Promise.all([
            Appointment.countDocuments({ doctorId }),
            Appointment.countDocuments({ doctorId, status: 'pending' }),
            Appointment.countDocuments({
                doctorId,
                date: {
                    $regex: new RegExp(`^${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`)
                }
            }),
            Appointment.countDocuments({ doctorId, status: 'confirmed' }),
            Appointment.distinct('patientId', { doctorId }).then(ids => ids.length)
        ]);

        // Get recent activity (last 5 appointments)
        const recentAppointments = await Appointment.aggregate([
            { $match: { doctorId } },
            { $sort: { createdAt: -1 } },
            { $limit: 5 },
            { $lookup: { from: 'users', localField: 'patientId', foreignField: 'id', as: 'patient' } },
            { $unwind: { path: '$patient', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    _id: 1,
                    date: 1,
                    time: 1,
                    status: 1,
                    patientName: '$patient.username',
                    patientId: 1
                }
            }
        ]);

        res.json({
            totalPatients: totalPatients || 0,
            appointmentsToday: todayAppointments || 0,
            pendingRecords: pendingAppointments || 0,
            recentPatients: recentAppointments.map(a => ({
                id: a.patientId,
                name: a.patientName || "Unknown Patient",
                lastVisit: a.date,
                condition: "Consultation",
                avatarUrl: null
            }))
        });
    } catch (error) {
        console.error('Get Doctor Summary Error:', error);
        res.status(500).json({ error: 'Failed to fetch doctor summary' });
    }
};
