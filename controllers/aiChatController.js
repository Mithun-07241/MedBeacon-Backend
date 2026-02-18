const ollamaService = require('../services/ollamaService');
const {
    isValidSessionId,
    isValidMessage,
    isValidSessionTitle,
    sanitizeString,
    validateBookingParams,
    validateSearchParams
} = require('../utils/validation');

exports.getSessions = async (req, res) => {
    try {
        const { AiChatSession } = req.models;
        const sessions = await AiChatSession.find({ userId: req.user.id })
            .sort({ lastMessageAt: -1 })
            .select('sessionId title lastMessageAt createdAt')
            .limit(50);
        res.json(sessions);
    } catch (error) {
        console.error('Get Sessions Error:', error);
        res.status(500).json({ error: 'Failed to fetch chat sessions' });
    }
};

exports.createSession = async (req, res) => {
    try {
        const { AiChatSession } = req.models;
        const session = await AiChatSession.create({ userId: req.user.id, title: 'New Chat', messages: [] });
        res.json({ sessionId: session.sessionId, title: session.title, createdAt: session.createdAt });
    } catch (error) {
        console.error('Create Session Error:', error);
        res.status(500).json({ error: 'Failed to create chat session' });
    }
};

exports.getSessionMessages = async (req, res) => {
    try {
        const { AiChatSession } = req.models;
        const { sessionId } = req.params;
        const session = await AiChatSession.findOne({ sessionId, userId: req.user.id });
        if (!session) return res.status(404).json({ error: 'Session not found' });
        res.json({ sessionId: session.sessionId, title: session.title, messages: session.messages, createdAt: session.createdAt, lastMessageAt: session.lastMessageAt });
    } catch (error) {
        console.error('Get Session Messages Error:', error);
        res.status(500).json({ error: 'Failed to fetch session messages' });
    }
};

exports.renameSession = async (req, res) => {
    try {
        const { AiChatSession } = req.models;
        const { sessionId } = req.params;
        const { title } = req.body;

        if (!isValidSessionId(sessionId)) return res.status(400).json({ error: 'Invalid session ID format' });
        if (!isValidSessionTitle(title)) return res.status(400).json({ error: 'Title must be between 1 and 100 characters' });

        const session = await AiChatSession.findOneAndUpdate(
            { sessionId, userId: req.user.id },
            { title: sanitizeString(title) },
            { new: true }
        );
        if (!session) return res.status(404).json({ error: 'Session not found' });
        res.json({ sessionId: session.sessionId, title: session.title });
    } catch (error) {
        console.error('Rename Session Error:', error);
        res.status(500).json({ error: 'Failed to rename session' });
    }
};

exports.deleteSession = async (req, res) => {
    try {
        const { AiChatSession } = req.models;
        const { sessionId } = req.params;
        if (!isValidSessionId(sessionId)) return res.status(400).json({ error: 'Invalid session ID format' });
        const session = await AiChatSession.findOneAndDelete({ sessionId, userId: req.user.id });
        if (!session) return res.status(404).json({ error: 'Session not found' });
        res.json({ message: 'Session deleted successfully' });
    } catch (error) {
        console.error('Delete Session Error:', error);
        res.status(500).json({ error: 'Failed to delete session' });
    }
};

function generateSessionTitle(firstMessage) {
    let title = firstMessage.trim().substring(0, 50);
    if (firstMessage.length > 50) title += '...';
    return (title.charAt(0).toUpperCase() + title.slice(1)) || 'New Chat';
}

async function executeToolCall(toolCall, userId, models) {
    const { name, arguments: args } = toolCall.function;
    const parsedArgs = typeof args === 'string' ? JSON.parse(args) : args;
    try {
        switch (name) {
            case 'book_appointment': return await bookAppointment(parsedArgs, userId, models);
            case 'search_doctors': return await searchDoctors(parsedArgs, models);
            case 'get_appointments': return await getAppointments(parsedArgs, userId, models);
            case 'cancel_appointment': return await cancelAppointment(parsedArgs, userId, models);
            case 'get_doctor_info': return await getDoctorInfo(parsedArgs, models);
            default: return { error: `Unknown tool: ${name}` };
        }
    } catch (error) {
        console.error(`Tool execution error (${name}):`, error);
        return { error: error.message || 'Tool execution failed' };
    }
}

async function bookAppointment(args, userId, models) {
    const { Appointment, DoctorDetail, User } = models;
    const validation = validateBookingParams(args);
    if (!validation.isValid) return { success: false, error: validation.errors.join(', ') };

    const { doctorId, date, time, reason, notes } = validation.sanitized;
    const doctor = await DoctorDetail.findOne({ userId: doctorId });
    if (!doctor) return { success: false, error: 'Doctor not found. Please search for available doctors first.' };

    const user = await User.findOne({ id: doctorId });
    const appointment = await Appointment.create({ patientId: userId, doctorId, date, time, reason, notes: notes || '', status: 'pending' });

    return {
        success: true,
        message: 'Appointment booked successfully! The doctor will confirm shortly.',
        appointment: {
            id: appointment._id,
            doctorName: doctor.firstName && doctor.lastName ? `Dr. ${doctor.firstName} ${doctor.lastName}` : user?.username || 'Doctor',
            specialization: doctor.specialization, date, time, reason, status: 'pending'
        }
    };
}

async function searchDoctors(args, models) {
    const { Appointment, DoctorDetail, User } = models;
    const validation = validateSearchParams(args);
    if (!validation.isValid) return { success: false, error: validation.errors.join(', '), doctors: [] };

    const { specialization, name, availability } = validation.sanitized;
    let query = {};
    if (specialization) query.specialization = new RegExp(specialization, 'i');
    if (availability) query.availability = availability;

    let doctors = await DoctorDetail.find(query).limit(20).select('userId firstName lastName specialization experience availability profilePicUrl hospital');

    if (name) {
        const nameRegex = new RegExp(name, 'i');
        doctors = doctors.filter(doc => (doc.firstName && nameRegex.test(doc.firstName)) || (doc.lastName && nameRegex.test(doc.lastName)));
    }

    const doctorsWithDetails = await Promise.all(doctors.map(async (doc) => {
        const user = await User.findOne({ id: doc.userId });
        const stats = await Appointment.aggregate([
            { $match: { doctorId: doc.userId, status: 'completed' } },
            { $group: { _id: null, completedCount: { $sum: 1 }, totalRatings: { $sum: { $cond: [{ $eq: ['$rated', true] }, 1, 0] } }, sumRatings: { $sum: { $cond: [{ $eq: ['$rated', true] }, '$rating', 0] } } } }
        ]);
        const s = stats[0] || { completedCount: 0, totalRatings: 0, sumRatings: 0 };
        const averageRating = s.totalRatings > 0 ? s.sumRatings / s.totalRatings : 0;
        return {
            id: doc.userId,
            name: doc.firstName && doc.lastName ? `Dr. ${doc.firstName} ${doc.lastName}` : user?.username || 'Doctor',
            specialization: doc.specialization || 'General Practitioner', experience: doc.experience || 'N/A',
            availability: doc.availability || 'available', hospital: doc.hospital || doc.hospitalAffiliation || 'N/A',
            profilePicUrl: doc.profilePicUrl || null, rating: parseFloat(averageRating.toFixed(1)),
            totalRatings: s.totalRatings, patientsServed: s.completedCount
        };
    }));

    const sortedDoctors = doctorsWithDetails.sort((a, b) => b.rating !== a.rating ? b.rating - a.rating : b.patientsServed - a.patientsServed).slice(0, 10);
    if (sortedDoctors.length === 0) return { success: false, message: 'No doctors found matching your criteria.', doctors: [] };
    return { success: true, message: `Found ${sortedDoctors.length} top-rated doctor(s)`, doctors: sortedDoctors };
}

async function getAppointments(args, userId, models) {
    const { Appointment, DoctorDetail, User } = models;
    const { status, upcoming } = args;
    let query = { patientId: userId };
    if (status) query.status = status;
    if (upcoming) query.date = { $gte: new Date().toISOString().split('T')[0] };

    const appointments = await Appointment.find(query).sort({ date: 1, time: 1 }).limit(20);
    const appointmentsWithDetails = await Promise.all(appointments.map(async (apt) => {
        const doctor = await DoctorDetail.findOne({ userId: apt.doctorId });
        const doctorUser = await User.findOne({ id: apt.doctorId });
        return {
            id: apt._id,
            doctorName: doctor?.firstName && doctor?.lastName ? `Dr. ${doctor.firstName} ${doctor.lastName}` : doctorUser?.username || 'Doctor',
            specialization: doctor?.specialization || 'General Practitioner',
            date: apt.date, time: apt.time, reason: apt.reason, status: apt.status, notes: apt.notes
        };
    }));

    if (appointmentsWithDetails.length === 0) return { success: true, message: 'You have no appointments matching the criteria.', appointments: [] };
    return { success: true, message: `Found ${appointmentsWithDetails.length} appointment(s)`, appointments: appointmentsWithDetails };
}

async function cancelAppointment(args, userId, models) {
    const { Appointment } = models;
    const { appointmentId } = args;
    if (!appointmentId) return { success: false, error: 'Please provide the appointment ID to cancel.' };

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) return { success: false, error: 'Appointment not found.' };
    if (appointment.patientId !== userId) return { success: false, error: 'You can only cancel your own appointments.' };
    if (appointment.status === 'cancelled') return { success: false, error: 'This appointment is already cancelled.' };
    if (appointment.status === 'completed') return { success: false, error: 'Cannot cancel a completed appointment.' };

    appointment.status = 'cancelled';
    await appointment.save();
    return { success: true, message: 'Appointment cancelled successfully.', appointment: { id: appointment._id, date: appointment.date, time: appointment.time, status: 'cancelled' } };
}

async function getDoctorInfo(args, models) {
    const { Appointment, DoctorDetail, User } = models;
    const { doctorId } = args;
    if (!doctorId) return { success: false, error: 'Please provide a doctor ID.' };

    const [doctor, user] = await Promise.all([DoctorDetail.findOne({ userId: doctorId }), User.findOne({ id: doctorId })]);
    if (!doctor || !user) return { success: false, error: 'Doctor not found.' };

    const stats = await Appointment.aggregate([
        { $match: { doctorId, status: 'completed' } },
        { $group: { _id: null, completedCount: { $sum: 1 }, totalRatings: { $sum: { $cond: [{ $eq: ['$rated', true] }, 1, 0] } }, sumRatings: { $sum: { $cond: [{ $eq: ['$rated', true] }, '$rating', 0] } } } }
    ]);
    const s = stats[0] || { completedCount: 0, totalRatings: 0, sumRatings: 0 };
    const averageRating = s.totalRatings > 0 ? (s.sumRatings / s.totalRatings).toFixed(1) : 'N/A';

    return {
        success: true,
        doctor: {
            id: doctorId, name: doctor.firstName && doctor.lastName ? `Dr. ${doctor.firstName} ${doctor.lastName}` : user.username,
            email: user.email, specialization: doctor.specialization || 'General Practitioner', experience: doctor.experience || 'N/A',
            hospital: doctor.hospital || doctor.hospitalAffiliation || 'N/A', availability: doctor.availability || 'available',
            bio: doctor.bio || 'No bio available', education: doctor.education || 'N/A', languages: doctor.languages || 'N/A',
            patientsServed: s.completedCount, averageRating, profilePicUrl: doctor.profilePicUrl || null
        }
    };
}

exports.sendMessage = async (req, res) => {
    try {
        const { AiChatSession } = req.models;
        const { message, sessionId } = req.body;
        const userId = req.user.id;

        if (!isValidMessage(message)) return res.status(400).json({ error: 'Message must be between 1 and 5000 characters' });
        if (sessionId && !isValidSessionId(sessionId)) return res.status(400).json({ error: 'Invalid session ID format' });

        const sanitizedMessage = sanitizeString(message);

        let session;
        if (sessionId) {
            session = await AiChatSession.findOne({ sessionId, userId });
            if (!session) return res.status(404).json({ error: 'Session not found' });
        } else {
            session = await AiChatSession.create({ userId, title: generateSessionTitle(sanitizedMessage), messages: [] });
        }

        const { loadDatabaseContext } = require('../services/dbContextLoader');
        const dbContext = await loadDatabaseContext();

        const conversationHistory = session.messages.slice(-20).map(msg => ({ role: msg.role, content: msg.content }));
        conversationHistory.push({ role: 'user', content: sanitizedMessage });

        const userRole = req.user.role || 'patient';
        let aiResponse = await ollamaService.processMessage(conversationHistory, userRole, dbContext);

        if (aiResponse.toolCalls && aiResponse.toolCalls.length > 0) {
            const toolResults = await Promise.all(aiResponse.toolCalls.map(async (toolCall) => {
                const result = await executeToolCall(toolCall, userId, req.models);
                return { name: toolCall.function.name, result };
            }));

            const toolResultsMessage = toolResults.map(tr => `Tool: ${tr.name}\nResult: ${JSON.stringify(tr.result, null, 2)}`).join('\n\n');

            conversationHistory.push({
                role: 'user',
                content: `[SYSTEM: TOOL EXECUTION RESULTS - READ CAREFULLY]\n\n${toolResultsMessage}\n\nCRITICAL INSTRUCTIONS:\n1. Present ONLY the information shown in the results above\n2. DO NOT invent, make up, or hallucinate ANY doctor names, IDs, or details\n3. If results show "doctors: []", say "No doctors found"\n4. Use the EXACT names, ratings, and information from the results\n5. DO NOT use JSON format in your response - provide a natural conversation\n\nNow provide a helpful, natural response to the user based ONLY on the actual data above.`
            });

            aiResponse = await ollamaService.continueAfterToolExecution(conversationHistory, userRole, dbContext);

            session.messages.push({ role: 'user', content: sanitizedMessage, timestamp: new Date() });
            session.messages.push({ role: 'assistant', content: aiResponse.content, timestamp: new Date(), toolsExecuted: toolResults.map(tr => tr.name) });
            await session.save();

            return res.json({ message: aiResponse.content, sessionId: session.sessionId, toolsExecuted: toolResults.map(tr => tr.name) });
        }

        session.messages.push({ role: 'user', content: sanitizedMessage, timestamp: new Date() });
        session.messages.push({ role: 'assistant', content: aiResponse.content, timestamp: new Date() });
        await session.save();

        res.json({ message: aiResponse.content, sessionId: session.sessionId });
    } catch (error) {
        console.error('AI Chat Error:', error);
        res.status(500).json({ error: 'Failed to process message', details: error.message });
    }
};

module.exports = exports;
