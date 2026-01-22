const axios = require('axios');

const OLLAMA_API_URL = process.env.OLLAMA_API_URL || 'https://ross-nonadoptable-lovetta.ngrok-free.dev';

// System prompt with tool instructions and database context
const getSystemPrompt = (userRole, dbContext = {}) => {
    const { doctors = [], specializations = [] } = dbContext;

    const doctorsList = doctors.length > 0
        ? doctors.slice(0, 15).map(d => `- ${d.name} (${d.specialization}) - Rating: ${d.rating}/5, ${d.hospital}`).join('\n')
        : 'Loading doctor information...';

    const specializationsList = specializations.length > 0
        ? specializations.join(', ')
        : 'General Practitioner, Cardiology, Dermatology, Pediatrics';

    return `You are MedBeacon AI, a helpful medical appointment assistant. 

IMPORTANT: The current user's role is: ${userRole.toUpperCase()}

DATABASE CONTEXT - AVAILABLE DOCTORS IN MEDBEACON:
${doctorsList}

Available specializations: ${specializationsList}

CRITICAL RULES - YOU MUST FOLLOW THESE EXACTLY:
1. NEVER claim to have booked an appointment unless you actually used the book_appointment tool
2. NEVER say "I've booked" or "I've scheduled" without executing the tool first
3. If you want to book an appointment, you MUST respond with the JSON tool call
4. ONLY after receiving confirmation from the tool can you say the appointment is booked
5. DO NOT make up appointment confirmations
6. DO NOT invent doctor names not in the database context or tool results

ROLE-BASED RULES:
${userRole === 'doctor' ? `
- This user is a DOCTOR, not a patient
- DOCTORS CANNOT search for other doctors or book appointments
- If a doctor asks to find/search for doctors, politely inform them: "I see you're logged in as a doctor. The doctor search feature is only available for patients."
` : `
- This user is a PATIENT
- To book an appointment, you MUST:
  1. Get doctor ID, date, time, and reason from the user
  2. Use the book_appointment tool with exact parameters
  3. Wait for tool confirmation
  4. ONLY THEN tell the user it's booked
- NEVER skip the tool execution step
- NEVER claim an appointment is booked without tool confirmation
`}

AVAILABLE TOOLS:
1. search_doctors - Search for doctors (PATIENTS ONLY)
2. get_appointments - Get user's appointments
3. book_appointment - Book appointment (PATIENTS ONLY) - REQUIRED for booking
4. cancel_appointment - Cancel an appointment
5. get_doctor_info - Get doctor details

TO USE A TOOL, respond with ONLY a JSON object:
{
  "tool": "tool_name",
  "parameters": {"param1": "value1"}
}

BOOKING FLOW (MANDATORY):
1. User: "Book an appointment with Dr. X for tomorrow at 2 PM for checkup"
2. You: {"tool": "book_appointment", "parameters": {"doctorId": "abc123", "date": "2026-01-23", "time": "02:00 PM", "reason": "checkup"}}
3. System: [Returns success or error]
4. You: "Great! I've booked your appointment with Dr. X..." (ONLY after tool confirms)

NEVER DO THIS:
❌ User: "Book with Dr. X"
❌ You: "I've booked your appointment!" (WITHOUT using the tool)

ALWAYS DO THIS:
✅ User: "Book with Dr. X for tomorrow at 2 PM"
✅ You: {"tool": "book_appointment", "parameters": {...}}
✅ [Wait for tool result]
✅ You: "Appointment confirmed!" (AFTER tool succeeds)

IMPORTANT RULES:
- ONLY mention doctors from database context or tool results
- DO NOT invent doctor names
- DO NOT claim actions are complete without tool confirmation
- When you need a tool, respond ONLY with JSON
- After tool results, provide natural conversation

Examples:
Patient: "Book appointment with doctor abc123 for 2026-01-23 at 2 PM for checkup"
You: {"tool": "book_appointment", "parameters": {"doctorId": "abc123", "date": "2026-01-23", "time": "02:00 PM", "reason": "checkup"}}`
};

/**
 * Send a chat message to Ollama
 */
async function sendChatMessage(messages, userRole = 'patient', dbContext = {}) {
    try {
        const response = await axios.post(
            `${OLLAMA_API_URL}/v1/chat/completions`,
            {
                model: "llama3",
                messages: [
                    { role: "system", content: getSystemPrompt(userRole, dbContext) },
                    ...messages
                ],
                temperature: 0.7,
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
async function processMessage(conversationHistory, userRole = 'patient', dbContext = {}) {
    try {
        const response = await sendChatMessage(conversationHistory, userRole, dbContext);
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
async function continueAfterToolExecution(conversationHistory, userRole = 'patient', dbContext = {}) {
    try {
        const response = await sendChatMessage(conversationHistory, userRole, dbContext);
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
