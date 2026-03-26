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

/**
 * Extract booking state from the full conversation history.
 * Scans every message to accumulate doctor/date/time/reason.
 * The state is the source of truth – the LLM only needs to ask for what is still missing.
 */
function extractBookingState(messages, currentMessage, dbContext) {
    const state = { doctor: null, date: null, time: null, reason: null };
    const doctors = dbContext.doctors || [];

    // Helper: parse a date string fragment into YYYY-MM-DD
    const parseDate = (text) => {
        const t = text.toLowerCase();
        const today = new Date();
        const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
        if (/\btomorrow\b|tmrw|tom\b/.test(t)) return tomorrow.toISOString().split('T')[0];
        if (/\btoday\b/.test(t)) return today.toISOString().split('T')[0];
        // YYYY-MM-DD
        const iso = t.match(/\b(\d{4}-\d{2}-\d{2})\b/);
        if (iso) return iso[1];
        // DD/MM/YYYY or DD-MM-YYYY
        const dmy = t.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\b/);
        if (dmy) {
            const d = new Date(`${dmy[3]}-${dmy[2].padStart(2,'0')}-${dmy[1].padStart(2,'0')}`);
            if (!isNaN(d)) return d.toISOString().split('T')[0];
        }
        // "March 27" / "27 March"
        const months = ['january','february','march','april','may','june','july','august','september','october','november','december'];
        const monthMatch = t.match(/(\d{1,2})\s+(january|february|march|april|may|june|july|august|september|october|november|december)/i) ||
                           t.match(/(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})/i);
        if (monthMatch) {
            const day = monthMatch[1] || monthMatch[2];
            const month = (monthMatch[2] || monthMatch[1]).toLowerCase();
            const monthIdx = months.indexOf(month);
            if (monthIdx >= 0) {
                const yr = today.getFullYear();
                return `${yr}-${String(monthIdx + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
            }
        }
        return null;
    };

    // Helper: parse a time string to HH:MM AM/PM
    const parseTime = (text) => {
        const t = text.toLowerCase();
        // HH:MM
        const hhmm = t.match(/\b(\d{1,2}):(\d{2})\s*(am|pm)?\b/i);
        if (hhmm) {
            let h = parseInt(hhmm[1]);
            const m = hhmm[2];
            const ampm = hhmm[3];
            if (ampm) {
                if (ampm.toLowerCase() === 'pm' && h < 12) h += 12;
                if (ampm.toLowerCase() === 'am' && h === 12) h = 0;
            }
            const period = h >= 12 ? 'PM' : 'AM';
            const h12 = h > 12 ? h - 12 : (h === 0 ? 12 : h);
            return `${String(h12).padStart(2,'0')}:${m} ${period}`;
        }
        // "2pm" / "14"
        const simple = t.match(/\b(\d{1,2})\s*(am|pm)\b/i);
        if (simple) {
            let h = parseInt(simple[1]);
            const p = simple[2].toLowerCase();
            if (p === 'pm' && h < 12) h += 12;
            if (p === 'am' && h === 12) h = 0;
            const period = h >= 12 ? 'PM' : 'AM';
            const h12 = h > 12 ? h - 12 : (h === 0 ? 12 : h);
            return `${String(h12).padStart(2,'0')}:00 ${period}`;
        }
        // "anytime" → 10:00 AM
        if (/\bany\s*time\b|\banytime\b/.test(t)) return '10:00 AM';
        return null;
    };

    // Helper: match a doctor name from text
    const findDoctor = (text) => {
        if (!doctors.length) return null;
        const t = text.toLowerCase();
        return doctors.find(d => {
            const name = d.name.toLowerCase().replace(/^dr\.?\s*/i, '');
            const parts = name.split(/\s+/);
            return parts.some(p => p.length > 2 && t.includes(p));
        }) || null;
    };

    // Scan all historical messages + current message
    const allMessages = [
        ...messages.map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: currentMessage }
    ];

    for (const msg of allMessages) {
        if (msg.role !== 'user') continue;
        const text = msg.content;

        if (!state.doctor) {
            const doc = findDoctor(text);
            if (doc) state.doctor = { id: doc.id, name: doc.name };
        }

        // If only one doctor exists and user says "yes" / "him" / "her" / confirms
        if (!state.doctor && doctors.length === 1 && /\b(yes|yeah|ok|sure|him|her|that.one|confirm|book)\b/i.test(text)) {
            state.doctor = { id: doctors[0].id, name: doctors[0].name };
        }

        if (!state.date) {
            const d = parseDate(text);
            if (d) state.date = d;
        }

        if (!state.time) {
            const t = parseTime(text);
            if (t) state.time = t;
        }

        // Reason: capture after "for", "because", "reason:", or common symptom words
        if (!state.reason) {
            const reasonPatterns = [
                /\bfor\s+(?:a\s+|an\s+|my\s+)?([a-z][a-z\s]{2,40}?)(?:\s*\.|,|$)/i,
                /\breason[:\s]+([a-z][a-z\s]{2,40?}?)(?:\s*\.|,|$)/i,
                /\b(headache|fever|cold|cough|pain|checkup|check.?up|consultation|follow.?up|chest\s+pain|back\s+pain|stomach|nausea|dizziness|injury|fracture|rash|allergy|diabetes|hypertension|stress|anxiety|depression)\b/i,
            ];
            for (const pat of reasonPatterns) {
                const m = text.match(pat);
                if (m && m[1] && m[1].trim().length > 1) {
                    const candidate = m[1].trim().toLowerCase();
                    // Avoid capturing date/time/names as reason
                    if (!/\d{4}|\btomorrow\b|\btoday\b|pmrw/.test(candidate)) {
                        state.reason = candidate;
                        break;
                    }
                }
            }
        }
    }

    return state;
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
        const dbContext = await loadDatabaseContext(req.models);

        // ─── Server-side booking state extraction ────────────────────────
        const userRole = req.user.role || 'patient';
        const historyMessages = session.messages.slice(-30);
        const bookingState = userRole === 'patient'
            ? extractBookingState(historyMessages, sanitizedMessage, dbContext)
            : { doctor: null, date: null, time: null, reason: null };

        // ─── AUTO-FIRE: if all 4 fields are ready, skip LLM and book directly ─
        if (userRole === 'patient' &&
            bookingState.doctor && bookingState.date && bookingState.time && bookingState.reason) {

            console.log('[AI Chat] Auto-firing book_appointment from state:', bookingState);

            const bookResult = await bookAppointment(
                { doctorId: bookingState.doctor.id, date: bookingState.date, time: bookingState.time, reason: bookingState.reason },
                userId,
                req.models
            );

            let confirmMsg;
            if (bookResult.success) {
                const apt = bookResult.appointment;
                confirmMsg = `✅ Your appointment has been booked!\n\n` +
                    `**Doctor:** ${apt.doctorName}\n` +
                    `**Specialization:** ${apt.specialization}\n` +
                    `**Date:** ${apt.date}\n` +
                    `**Time:** ${apt.time}\n` +
                    `**Reason:** ${apt.reason}\n` +
                    `**Status:** Pending confirmation\n\n` +
                    `The doctor will confirm your appointment shortly.`;
            } else {
                confirmMsg = `I wasn't able to book that appointment. ${bookResult.error || 'Please try again.'}`;
            }

            session.messages.push({ role: 'user', content: sanitizedMessage, timestamp: new Date() });
            session.messages.push({ role: 'assistant', content: confirmMsg, timestamp: new Date(), toolsExecuted: ['book_appointment'] });
            await session.save();

            return res.json({ message: confirmMsg, sessionId: session.sessionId, toolsExecuted: ['book_appointment'] });
        }

        // ─── Normal LLM flow ─────────────────────────────────────────────
        const conversationHistory = historyMessages.map(msg => ({ role: msg.role, content: msg.content }));
        conversationHistory.push({ role: 'user', content: sanitizedMessage });

        let aiResponse = await ollamaService.processMessage(conversationHistory, userRole, dbContext, bookingState);

        if (aiResponse.toolCalls && aiResponse.toolCalls.length > 0) {
            const toolResults = await Promise.all(aiResponse.toolCalls.map(async (toolCall) => {
                const result = await executeToolCall(toolCall, userId, req.models);
                return { name: toolCall.function.name, result };
            }));

            const toolResultsMessage = toolResults.map(tr =>
                `Tool: ${tr.name}\nResult: ${JSON.stringify(tr.result, null, 2)}`
            ).join('\n\n');

            conversationHistory.push({
                role: 'user',
                content: `[SYSTEM: TOOL EXECUTION RESULTS]\n\n${toolResultsMessage}\n\nINSTRUCTIONS:\n1. Present ONLY information from the results above\n2. DO NOT invent names, IDs, or details\n3. DO NOT use JSON in your response - speak naturally\n4. Keep your response SHORT (2-4 sentences max)`
            });

            aiResponse = await ollamaService.continueAfterToolExecution(conversationHistory, userRole, dbContext, bookingState);

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

