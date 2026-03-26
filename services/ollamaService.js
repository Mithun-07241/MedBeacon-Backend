const axios = require('axios');

const OLLAMA_API_URL = process.env.OLLAMA_API_URL || 'https://ross-nonadoptable-lovetta.ngrok-free.dev';

// System prompt with tool instructions and database context
const getSystemPrompt = (userRole, dbContext = {}, bookingState = {}) => {
    const { doctors = [], specializations = [] } = dbContext;

    // Internal doctor list with IDs (for AI to use when calling tools)
    const doctorsListInternal = doctors.length > 0
        ? doctors.slice(0, 15).map(d => `- ${d.name} (${d.specialization}) - ID: ${d.id} - Rating: ${d.rating}/5, ${d.hospital}`).join('\n')
        : 'No doctors available yet.';

    // User-facing doctor list without IDs (for display to users)
    const doctorsListDisplay = doctors.length > 0
        ? doctors.slice(0, 15).map(d => `- ${d.name} (${d.specialization}) - Rating: ${d.rating}/5`).join('\n')
        : 'No doctors available yet.';

    const specializationsList = specializations.length > 0
        ? specializations.join(', ')
        : 'General Practitioner, Cardiology, Dermatology, Pediatrics';

    // Build current booking state block
    const stateLines = [];
    if (bookingState.doctor) stateLines.push(`  ✅ Doctor: ${bookingState.doctor.name} (ID: ${bookingState.doctor.id})`);
    else stateLines.push(`  ❌ Doctor: NOT YET COLLECTED`);
    if (bookingState.date) stateLines.push(`  ✅ Date: ${bookingState.date}`);
    else stateLines.push(`  ❌ Date: NOT YET COLLECTED`);
    if (bookingState.time) stateLines.push(`  ✅ Time: ${bookingState.time}`);
    else stateLines.push(`  ❌ Time: NOT YET COLLECTED`);
    if (bookingState.reason) stateLines.push(`  ✅ Reason: ${bookingState.reason}`);
    else stateLines.push(`  ❌ Reason: NOT YET COLLECTED`);

    const bookingStateBlock = `
══════════════════════════════════════════
CURRENT BOOKING STATE (SERVER-TRACKED):
${stateLines.join('\n')}

WHAT YOU MUST DO NEXT:
${
    !bookingState.doctor ? `→ Ask the user WHICH DOCTOR they want from the list below.`
    : !bookingState.date ? `→ Ask the user WHAT DATE they want.`
    : !bookingState.time ? `→ Ask the user WHAT TIME they want.`
    : !bookingState.reason ? `→ Ask the user for the REASON for their visit.`
    : `→ ALL INFORMATION COLLECTED. Fire the booking tool NOW:
{"tool": "book_appointment", "parameters": {"doctorId": "${bookingState.doctor?.id}", "date": "${bookingState.date}", "time": "${bookingState.time}", "reason": "${bookingState.reason}"}}`
}
══════════════════════════════════════════`;

    return `You are MedBeacon AI, a concise and friendly medical appointment assistant.

IMPORTANT: The current user's role is: ${userRole.toUpperCase()}

DATABASE CONTEXT - AVAILABLE DOCTORS (INTERNAL IDs - USE FOR BOOKING):
${doctorsListInternal}

WHEN SHOWING DOCTORS TO USERS, USE THIS LIST (NO IDs):
${doctorsListDisplay}

Available specializations: ${specializationsList}
${bookingStateBlock}

TOOL CALL FORMAT (respond with ONLY this JSON when calling a tool, NO other text):
{"tool": "tool_name", "parameters": {"param1": "value1"}}

Available tools:
- book_appointment: Book an appointment (requires: doctorId, date, time, reason)
- search_doctors: Search for doctors by specialization or name
- get_appointments: Get user's appointments
- cancel_appointment: Cancel an appointment (requires: appointmentId)
- get_doctor_info: Get detailed doctor information (requires: doctorId)

CRITICAL BEHAVIOUR RULES:
1. NEVER show JSON or technical IDs to users in conversation text
2. LOOK AT "CURRENT BOOKING STATE" ABOVE - it is authoritative. DO NOT ask for info already marked ✅
3. Ask for ONLY the ONE missing item marked ❌ at a time
4. When ALL items are ✅, respond ONLY with the JSON tool call - no other text
5. NEVER claim a booking is confirmed without receiving tool success confirmation
6. NEVER invent doctor names - only use doctors from the list above
7. Keep responses SHORT (1-3 sentences max). Do not repeat yourself.
8. If the user says 'yes' or confirms a doctor already shown, treat that as selecting that doctor

APPOINTMENT DATE RULES:
- "tomorrow" = ${getTomorrowDate()}
- "today" = ${getTodayDate()}
- Always store dates as YYYY-MM-DD format

APPOINTMENT TIME RULES:
- Convert to HH:MM AM/PM format (e.g. "14:30" → "02:30 PM", "2pm" → "02:00 PM")
- If user says "anytime" or "any time", pick 10:00 AM

${userRole === 'doctor' ? `
ROLE: DOCTOR
- You are speaking to a DOCTOR, not a patient
- Doctors cannot book appointments as patients
- Redirect politely if they try to book: "As a doctor, appointment booking is for patients only."
` : `
ROLE: PATIENT
BOOKING FLOW (FOLLOW THIS EXACTLY):
1. Greet and ask which doctor they'd like first time
2. Each reply, collect the ONE missing piece of info (check booking state above)
3. Once you have everything, output ONLY the JSON tool call
4. After tool confirms success, congratulate the user with the appointment details
`}

GOOD EXAMPLE:
User: "book appointment with mithun tomorrow 2pm headache"
State: doctor=✅ date=✅ time=✅ reason=✅
You: {"tool": "book_appointment", "parameters": {"doctorId": "abc123", "date": "${getTomorrowDate()}", "time": "02:00 PM", "reason": "headache"}}

BAD EXAMPLE (NEVER DO THIS):
User: "yes" (after you showed Mithun as only option)
You: "Which doctor would you like?" ← WRONG, user confirmed the only option`;
};

function getTodayDate() {
    return new Date().toISOString().split('T')[0];
}

function getTomorrowDate() {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
}

/**
 * Send a chat message to Ollama
 */
async function sendChatMessage(messages, userRole = 'patient', dbContext = {}, bookingState = {}) {
    try {
        const response = await axios.post(
            `${OLLAMA_API_URL}/v1/chat/completions`,
            {
                model: "llama3",
                messages: [
                    { role: "system", content: getSystemPrompt(userRole, dbContext, bookingState) },
                    ...messages
                ],
                temperature: 0.2,
                stream: false
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'ngrok-skip-browser-warning': 'true'
                },
                timeout: 60000
            }
        );

        return response.data;
    } catch (error) {
        console.error('Ollama API Error:', error.response?.data || error.message);
        throw new Error(error.response?.data?.error?.message || 'Failed to communicate with AI service');
    }
}

/**
 * Parse AI response to detect tool calls
 */
function parseToolCall(content) {
    try {
        let cleanContent = content.trim();
        cleanContent = cleanContent.replace(/```json\n?/g, '').replace(/```\n?/g, '');

        const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
        if (!jsonMatch) return null;

        const parsed = JSON.parse(jsonMatch[0]);

        if (parsed.tool && parsed.parameters !== undefined) {
            return {
                name: parsed.tool,
                arguments: parsed.parameters
            };
        }

        return null;
    } catch (error) {
        return null;
    }
}

/**
 * Process a user message and get AI response with tool calls
 */
async function processMessage(conversationHistory, userRole = 'patient', dbContext = {}, bookingState = {}) {
    try {
        const response = await sendChatMessage(conversationHistory, userRole, dbContext, bookingState);
        const message = response.choices[0].message;
        const content = message.content;

        const toolCall = parseToolCall(content);

        if (toolCall) {
            return {
                content: '',
                toolCalls: [{
                    id: `call_${Date.now()}`,
                    type: 'function',
                    function: toolCall
                }],
                finishReason: 'tool_calls'
            };
        }

        return {
            content: content,
            toolCalls: null,
            finishReason: response.choices[0].finish_reason
        };
    } catch (error) {
        throw error;
    }
}

/**
 * Continue conversation after tool execution
 */
async function continueAfterToolExecution(conversationHistory, userRole = 'patient', dbContext = {}, bookingState = {}) {
    try {
        const response = await sendChatMessage(conversationHistory, userRole, dbContext, bookingState);
        const message = response.choices[0].message;
        const content = message.content;

        const toolCall = parseToolCall(content);

        if (toolCall) {
            return {
                content: '',
                toolCalls: [{
                    id: `call_${Date.now()}`,
                    type: 'function',
                    function: toolCall
                }],
                finishReason: 'tool_calls'
            };
        }

        return {
            content: content,
            toolCalls: null,
            finishReason: response.choices[0].finish_reason
        };
    } catch (error) {
        throw error;
    }
}

module.exports = {
    processMessage,
    continueAfterToolExecution
};
