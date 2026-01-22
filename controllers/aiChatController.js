const ollamaService = require('../services/ollamaService');
const Appointment = require('../models/Appointment');
const DoctorDetail = require('../models/DoctorDetail');
const User = require('../models/User');

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
                : 'Doctor',
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
        .limit(10)
        .select('userId firstName lastName specialization experience availability profilePicUrl hospital');

    // If name is provided, filter by name
    if (name) {
        const nameRegex = new RegExp(name, 'i');
        doctors = doctors.filter(doc =>
            (doc.firstName && nameRegex.test(doc.firstName)) ||
            (doc.lastName && nameRegex.test(doc.lastName))
        );
    }

    // Get user details for each doctor
    const doctorsWithDetails = await Promise.all(
        doctors.map(async (doc) => {
            const user = await User.findOne({ id: doc.userId });
            return {
                id: doc.userId,
                name: doc.firstName && doc.lastName
                    ? `Dr. ${doc.firstName} ${doc.lastName}`
                    : user?.username || 'Doctor',
                specialization: doc.specialization || 'General Practitioner',
                experience: doc.experience || 'N/A',
                availability: doc.availability || 'available',
                hospital: doc.hospital || doc.hospitalAffiliation || 'N/A',
                profilePicUrl: doc.profilePicUrl || null
            };
        })
    );

    if (doctorsWithDetails.length === 0) {
        return {
            success: false,
            message: 'No doctors found matching your criteria. Try a different specialization or remove filters.',
            doctors: []
        };
    }

    return {
        success: true,
        message: `Found ${doctorsWithDetails.length} doctor(s)`,
        doctors: doctorsWithDetails
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
 * Main chat endpoint
 */
exports.sendMessage = async (req, res) => {
    try {
        const { message, conversationHistory = [] } = req.body;
        const userId = req.user.id;

        if (!message || typeof message !== 'string') {
            return res.status(400).json({ error: 'Message is required' });
        }

        // Add user message to conversation history
        const updatedHistory = [
            ...conversationHistory,
            { role: 'user', content: message }
        ];

        // Get AI response
        let aiResponse = await ollamaService.processMessage(updatedHistory);

        // If AI wants to call tools, execute them
        if (aiResponse.toolCalls && aiResponse.toolCalls.length > 0) {
            // Execute all tool calls
            const toolResults = await Promise.all(
                aiResponse.toolCalls.map(async (toolCall) => {
                    const result = await executeToolCall(toolCall, userId);
                    return {
                        tool_call_id: toolCall.id,
                        role: 'tool',
                        name: toolCall.function.name,
                        content: JSON.stringify(result)
                    };
                })
            );

            // Add assistant message with tool calls to history
            updatedHistory.push({
                role: 'assistant',
                content: aiResponse.content || '',
                tool_calls: aiResponse.toolCalls
            });

            // Add tool results to history
            updatedHistory.push(...toolResults);

            // Get final response from AI after tool execution
            aiResponse = await ollamaService.continueAfterToolExecution(updatedHistory);

            // Add final assistant response to history
            updatedHistory.push({
                role: 'assistant',
                content: aiResponse.content
            });

            return res.json({
                message: aiResponse.content,
                conversationHistory: updatedHistory,
                toolsExecuted: toolResults.map(tr => tr.name)
            });
        }

        // No tool calls, just return the response
        updatedHistory.push({
            role: 'assistant',
            content: aiResponse.content
        });

        res.json({
            message: aiResponse.content,
            conversationHistory: updatedHistory
        });

    } catch (error) {
        console.error('AI Chat Error:', error);
        res.status(500).json({
            error: 'Failed to process message',
            details: error.message
        });
    }
};
