const ollamaService = require('../services/ollamaService');
const Appointment = require('../models/Appointment');
const DoctorDetail = require('../models/DoctorDetail');
const User = require('../models/User');
const AiChatSession = require('../models/AiChatSession');

/**
 * Get all chat sessions for a user
 */
exports.getSessions = async (req, res) => {
    try {
        const userId = req.user.id;

        const sessions = await AiChatSession.find({ userId })
            .sort({ lastMessageAt: -1 })
            .select('sessionId title lastMessageAt createdAt')
            .limit(50);

        res.json(sessions);
    } catch (error) {
        console.error('Get Sessions Error:', error);
        res.status(500).json({ error: 'Failed to fetch chat sessions' });
    }
};

/**
 * Create a new chat session
 */
exports.createSession = async (req, res) => {
    try {
        const userId = req.user.id;

        const session = await AiChatSession.create({
            userId,
            title: 'New Chat',
            messages: []
        });

        res.json({
            sessionId: session.sessionId,
            title: session.title,
            createdAt: session.createdAt
        });
    } catch (error) {
        console.error('Create Session Error:', error);
        res.status(500).json({ error: 'Failed to create chat session' });
    }
};

/**
 * Get messages from a specific session
 */
exports.getSessionMessages = async (req, res) => {
    try {
        const userId = req.user.id;
        const { sessionId } = req.params;

        const session = await AiChatSession.findOne({ sessionId, userId });

        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        res.json({
            sessionId: session.sessionId,
            title: session.title,
            messages: session.messages,
            createdAt: session.createdAt,
            lastMessageAt: session.lastMessageAt
        });
    } catch (error) {
        console.error('Get Session Messages Error:', error);
        res.status(500).json({ error: 'Failed to fetch session messages' });
    }
};

/**
 * Rename a chat session
 */
exports.renameSession = async (req, res) => {
    try {
        const userId = req.user.id;
        const { sessionId } = req.params;
        const { title } = req.body;

        if (!title || title.trim().length === 0) {
            return res.status(400).json({ error: 'Title is required' });
        }

        const session = await AiChatSession.findOneAndUpdate(
            { sessionId, userId },
            { title: title.trim() },
            { new: true }
        );

        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        res.json({ sessionId: session.sessionId, title: session.title });
    } catch (error) {
        console.error('Rename Session Error:', error);
        res.status(500).json({ error: 'Failed to rename session' });
    }
};

/**
 * Delete a chat session
 */
exports.deleteSession = async (req, res) => {
    try {
        const userId = req.user.id;
        const { sessionId } = req.params;

        const session = await AiChatSession.findOneAndDelete({ sessionId, userId });

        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        res.json({ message: 'Session deleted successfully' });
    } catch (error) {
        console.error('Delete Session Error:', error);
        res.status(500).json({ error: 'Failed to delete session' });
    }
};

/**
 * Generate session title from first message
 */
function generateSessionTitle(firstMessage) {
    // Take first 50 characters of the message
    let title = firstMessage.trim().substring(0, 50);

    // If truncated, add ellipsis
    if (firstMessage.length > 50) {
        title += '...';
    }

    // Capitalize first letter
    title = title.charAt(0).toUpperCase() + title.slice(1);

    return title || 'New Chat';
}

/**
 * Execute tool calls from the AI
 */
async function executeToolCall(toolCall, userId) {
    const { name, arguments: args } = toolCall.function;
    const parsedArgs = typeof args === 'string' ? JSON.parse(args) : args;

    try {
        switch (name) {
            case 'book_appointment':
                return await bookAppointment(parsedArgs, userId);

            case 'search_doctors':
                return await searchDoctors(parsedArgs);

            case 'get_appointments':
                return await getAppointments(parsedArgs, userId);

            case 'cancel_appointment':
                return await cancelAppointment(parsedArgs, userId);

            case 'get_doctor_info':
                return await getDoctorInfo(parsedArgs);

            default:
                return { error: `Unknown tool: ${name}` };
        }
    } catch (error) {
        console.error(`Tool execution error (${name}):`, error);
        return { error: error.message || 'Tool execution failed' };
    }
}

/**
 * Book an appointment
 */
async function bookAppointment(args, userId) {
    const { doctorId, date, time, reason, notes } = args;

    // Validate required fields
    if (!doctorId || !date || !time || !reason) {
        return {
            success: false,
            error: 'Missing required fields. Please provide doctor ID, date, time, and reason.'
        };
    }

    // Verify doctor exists
    const doctor = await DoctorDetail.findOne({ userId: doctorId });
    if (!doctor) {
        return {
            success: false,
            error: 'Doctor not found. Please search for available doctors first.'
        };
    }

    // Get user for username fallback
    const user = await User.findOne({ id: doctorId });

    // Create appointment
    const appointment = await Appointment.create({
        patientId: userId,
        doctorId,
        date,
        time,
        reason,
        notes: notes || '',
        status: 'pending'
    });

    return {
        success: true,
        message: 'Appointment booked successfully! The doctor will confirm shortly.',
        appointment: {
            id: appointment._id,
            doctorName: doctor.firstName && doctor.lastName
                ? `Dr. ${doctor.firstName} ${doctor.lastName}`
                : user?.username || 'Doctor',
            specialization: doctor.specialization,
            date,
            time,
            reason,
            status: 'pending'
        }
    };
}

/**
 * Search for doctors
 */
async function searchDoctors(args) {
    const { specialization, name, availability } = args;

    let query = {};

    if (specialization) {
        query.specialization = new RegExp(specialization, 'i');
    }

    if (availability) {
        query.availability = availability;
    }

    // Find doctors
    let doctors = await DoctorDetail.find(query)
        .limit(20)
        .select('userId firstName lastName specialization experience availability profilePicUrl hospital');

    // If name is provided, filter by name
    if (name) {
        const nameRegex = new RegExp(name, 'i');
        doctors = doctors.filter(doc =>
            (doc.firstName && nameRegex.test(doc.firstName)) ||
            (doc.lastName && nameRegex.test(doc.lastName))
        );
    }

    // Get user details and ratings for each doctor
    const doctorsWithDetails = await Promise.all(
        doctors.map(async (doc) => {
            const user = await User.findOne({ id: doc.userId });

            // Get doctor's rating stats
            const stats = await Appointment.aggregate([
                { $match: { doctorId: doc.userId, status: 'completed' } },
                {
                    $group: {
                        _id: null,
                        completedCount: { $sum: 1 },
                        totalRatings: {
                            $sum: { $cond: [{ $eq: ['$rated', true] }, 1, 0] }
                        },
                        sumRatings: {
                            $sum: { $cond: [{ $eq: ['$rated', true] }, '$rating', 0] }
                        }
                    }
                }
            ]);

            const doctorStats = stats[0] || { completedCount: 0, totalRatings: 0, sumRatings: 0 };
            const averageRating = doctorStats.totalRatings > 0
                ? (doctorStats.sumRatings / doctorStats.totalRatings)
                : 0;

            return {
                id: doc.userId,
                name: doc.firstName && doc.lastName
                    ? `Dr. ${doc.firstName} ${doc.lastName}`
                    : user?.username || 'Doctor',
                specialization: doc.specialization || 'General Practitioner',
                experience: doc.experience || 'N/A',
                availability: doc.availability || 'available',
                hospital: doc.hospital || doc.hospitalAffiliation || 'N/A',
                profilePicUrl: doc.profilePicUrl || null,
                rating: parseFloat(averageRating.toFixed(1)),
                totalRatings: doctorStats.totalRatings,
                patientsServed: doctorStats.completedCount
            };
        })
    );

    // Sort by rating (highest first), then by patients served
    const sortedDoctors = doctorsWithDetails
        .sort((a, b) => {
            if (b.rating !== a.rating) {
                return b.rating - a.rating;
            }
            return b.patientsServed - a.patientsServed;
        })
        .slice(0, 10);

    if (sortedDoctors.length === 0) {
        return {
            success: false,
            message: 'No doctors found matching your criteria. Try a different specialization or remove filters.',
            doctors: []
        };
    }

    return {
        success: true,
        message: `Found ${sortedDoctors.length} top-rated doctor(s)`,
        doctors: sortedDoctors
    };
}

/**
 * Get user's appointments
 */
async function getAppointments(args, userId) {
    const { status, upcoming } = args;

    let query = { patientId: userId };

    if (status) {
        query.status = status;
    }

    if (upcoming) {
        const today = new Date().toISOString().split('T')[0];
        query.date = { $gte: today };
    }

    const appointments = await Appointment.find(query)
        .sort({ date: 1, time: 1 })
        .limit(20);

    // Get doctor details for each appointment
    const appointmentsWithDetails = await Promise.all(
        appointments.map(async (apt) => {
            const doctor = await DoctorDetail.findOne({ userId: apt.doctorId });
            const doctorUser = await User.findOne({ id: apt.doctorId });

            return {
                id: apt._id,
                doctorName: doctor?.firstName && doctor?.lastName
                    ? `Dr. ${doctor.firstName} ${doctor.lastName}`
                    : doctorUser?.username || 'Doctor',
                specialization: doctor?.specialization || 'General Practitioner',
                date: apt.date,
                time: apt.time,
                reason: apt.reason,
                status: apt.status,
                notes: apt.notes
            };
        })
    );

    if (appointmentsWithDetails.length === 0) {
        return {
            success: true,
            message: 'You have no appointments matching the criteria.',
            appointments: []
        };
    }

    return {
        success: true,
        message: `Found ${appointmentsWithDetails.length} appointment(s)`,
        appointments: appointmentsWithDetails
    };
}

/**
 * Cancel an appointment
 */
async function cancelAppointment(args, userId) {
    const { appointmentId } = args;

    if (!appointmentId) {
        return {
            success: false,
            error: 'Please provide the appointment ID to cancel.'
        };
    }

    const appointment = await Appointment.findById(appointmentId);

    if (!appointment) {
        return {
            success: false,
            error: 'Appointment not found.'
        };
    }

    // Verify ownership
    if (appointment.patientId !== userId) {
        return {
            success: false,
            error: 'You can only cancel your own appointments.'
        };
    }

    // Check if already cancelled or completed
    if (appointment.status === 'cancelled') {
        return {
            success: false,
            error: 'This appointment is already cancelled.'
        };
    }

    if (appointment.status === 'completed') {
        return {
            success: false,
            error: 'Cannot cancel a completed appointment.'
        };
    }

    // Update status to cancelled
    appointment.status = 'cancelled';
    await appointment.save();

    return {
        success: true,
        message: 'Appointment cancelled successfully.',
        appointment: {
            id: appointment._id,
            date: appointment.date,
            time: appointment.time,
            status: 'cancelled'
        }
    };
}

/**
 * Get doctor information
 */
async function getDoctorInfo(args) {
    const { doctorId } = args;

    if (!doctorId) {
        return {
            success: false,
            error: 'Please provide a doctor ID.'
        };
    }

    const doctor = await DoctorDetail.findOne({ userId: doctorId });
    const user = await User.findOne({ id: doctorId });

    if (!doctor || !user) {
        return {
            success: false,
            error: 'Doctor not found.'
        };
    }

    // Get doctor stats
    const stats = await Appointment.aggregate([
        { $match: { doctorId, status: 'completed' } },
        {
            $group: {
                _id: null,
                completedCount: { $sum: 1 },
                totalRatings: {
                    $sum: { $cond: [{ $eq: ['$rated', true] }, 1, 0] }
                },
                sumRatings: {
                    $sum: { $cond: [{ $eq: ['$rated', true] }, '$rating', 0] }
                }
            }
        }
    ]);

    const doctorStats = stats[0] || { completedCount: 0, totalRatings: 0, sumRatings: 0 };
    const averageRating = doctorStats.totalRatings > 0
        ? (doctorStats.sumRatings / doctorStats.totalRatings).toFixed(1)
        : 'N/A';

    return {
        success: true,
        doctor: {
            id: doctorId,
            name: doctor.firstName && doctor.lastName
                ? `Dr. ${doctor.firstName} ${doctor.lastName}`
                : user.username,
            email: user.email,
            specialization: doctor.specialization || 'General Practitioner',
            experience: doctor.experience || 'N/A',
            hospital: doctor.hospital || doctor.hospitalAffiliation || 'N/A',
            availability: doctor.availability || 'available',
            bio: doctor.bio || 'No bio available',
            education: doctor.education || 'N/A',
            languages: doctor.languages || 'N/A',
            patientsServed: doctorStats.completedCount,
            averageRating: averageRating,
            profilePicUrl: doctor.profilePicUrl || null
        }
    };
}

/**
 * Main chat endpoint with session support
 */
exports.sendMessage = async (req, res) => {
    try {
        const { message, sessionId } = req.body;
        const userId = req.user.id;

        if (!message || typeof message !== 'string') {
            return res.status(400).json({ error: 'Message is required' });
        }

        // Get or create session
        let session;
        if (sessionId) {
            session = await AiChatSession.findOne({ sessionId, userId });
            if (!session) {
                return res.status(404).json({ error: 'Session not found' });
            }
        } else {
            // Create new session
            session = await AiChatSession.create({
                userId,
                title: generateSessionTitle(message),
                messages: []
            });
        }

        // Load database context for AI
        const { loadDatabaseContext } = require('../services/dbContextLoader');
        const dbContext = await loadDatabaseContext();

        // Build conversation history from session (last 20 messages)
        const conversationHistory = session.messages
            .slice(-20)
            .map(msg => ({ role: msg.role, content: msg.content }));

        // Add current user message
        conversationHistory.push({ role: 'user', content: message });

        // Get AI response
        const userRole = req.user.role || 'patient';
        let aiResponse = await ollamaService.processMessage(conversationHistory, userRole, dbContext);

        // If AI wants to call tools, execute them
        if (aiResponse.toolCalls && aiResponse.toolCalls.length > 0) {
            // Execute all tool calls
            const toolResults = await Promise.all(
                aiResponse.toolCalls.map(async (toolCall) => {
                    const result = await executeToolCall(toolCall, userId);
                    return {
                        name: toolCall.function.name,
                        result: result
                    };
                })
            );

            // Add tool results to conversation
            const toolResultsMessage = toolResults.map(tr =>
                `Tool: ${tr.name}\nResult: ${JSON.stringify(tr.result, null, 2)}`
            ).join('\n\n');

            conversationHistory.push({
                role: 'user',
                content: `[SYSTEM: TOOL EXECUTION RESULTS - READ CAREFULLY]

${toolResultsMessage}

CRITICAL INSTRUCTIONS:
1. The data above is the COMPLETE and ONLY information available
2. You MUST present ONLY the information shown in the results above
3. DO NOT invent, make up, or hallucinate ANY doctor names, IDs, or details
4. If the results show "doctors: []", say "No doctors found"
5. If the results show specific doctors, list ONLY those doctors with their EXACT names and details
6. DO NOT add example doctors or placeholder data
7. Use the EXACT names, ratings, and information from the results
8. DO NOT use JSON format in your response - provide a natural conversation

Now provide a helpful, natural response to the user based ONLY on the actual data above.`
            });

            // Get final response from AI after tool execution
            aiResponse = await ollamaService.continueAfterToolExecution(conversationHistory, userRole, dbContext);

            // Save messages to session
            session.messages.push({ role: 'user', content: message, timestamp: new Date() });
            session.messages.push({
                role: 'assistant',
                content: aiResponse.content,
                timestamp: new Date(),
                toolsExecuted: toolResults.map(tr => tr.name)
            });

            await session.save();

            return res.json({
                message: aiResponse.content,
                sessionId: session.sessionId,
                toolsExecuted: toolResults.map(tr => tr.name)
            });
        }

        // No tool calls, save messages and return response
        session.messages.push({ role: 'user', content: message, timestamp: new Date() });
        session.messages.push({ role: 'assistant', content: aiResponse.content, timestamp: new Date() });

        await session.save();

        res.json({
            message: aiResponse.content,
            sessionId: session.sessionId
        });

    } catch (error) {
        console.error('AI Chat Error:', error);
        res.status(500).json({
            error: 'Failed to process message',
            details: error.message
        });
    }
};

module.exports = exports;
