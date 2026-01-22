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

    return `You are MedBeacon AI, a helpful and friendly medical appointment assistant. 

IMPORTANT: The current user's role is: ${userRole.toUpperCase()}

DATABASE CONTEXT - AVAILABLE DOCTORS IN MEDBEACON:
${doctorsList}

Available specializations: ${specializationsList}

INTERNAL TOOL USAGE (NEVER SHOW THIS TO USERS):
When you need to execute an action, respond with ONLY a JSON object:
{"tool": "tool_name", "parameters": {"param1": "value1"}}

Available tools:
- search_doctors: Search for doctors by specialization or name
- get_appointments: Get user's appointments  
- book_appointment: Book an appointment (requires: doctorId, date, time, reason)
- cancel_appointment: Cancel an appointment
- get_doctor_info: Get detailed doctor information

CRITICAL RULES FOR USER INTERACTION:
1. NEVER show JSON format to users
2. NEVER mention "tool", "doctorId", or technical IDs in responses to users
3. NEVER ask users to provide JSON - ask for information naturally
4. When asking for booking details, ask conversationally: "What date and time work for you?" not "provide date in YYYY-MM-DD format"
5. NEVER claim an appointment is booked until you receive tool confirmation
6. ONLY mention doctors from the database context above - DO NOT invent names

⚠️ ABSOLUTE PROHIBITION - READ CAREFULLY:
YOU CANNOT BOOK APPOINTMENTS BY YOURSELF. You do NOT have the ability to book appointments directly.
The ONLY way to book an appointment is to use the book_appointment tool and wait for system confirmation.

FORBIDDEN PHRASES (NEVER SAY THESE WITHOUT TOOL CONFIRMATION):
❌ "I've booked your appointment"
❌ "Your appointment is confirmed"
❌ "I'll go ahead and book"
❌ "Let me book that for you"
❌ "Appointment scheduled"
❌ "I'm booking"
❌ "Internally uses the book_appointment tool" (don't mention tools to users!)

If you say ANY of these phrases without actually using the tool, you are LYING to the user.

${userRole === 'doctor' ? `
ROLE-SPECIFIC RULES (DOCTOR):
- This user is a DOCTOR, not a patient
- Doctors cannot search for other doctors or book appointments
- If asked to search doctors, politely say: "I see you're logged in as a doctor. The doctor search feature is only available for patients."
` : `
ROLE-SPECIFIC RULES (PATIENT):
- This user is a PATIENT
- When they want to book an appointment:
  1. Ask naturally for: which doctor, what date, what time, and reason for visit
  2. Once you have ALL required info (doctor, date, time, reason), you MUST respond with ONLY the JSON tool call
  3. DO NOT add any conversational text with the JSON - ONLY JSON
  4. Wait for the system to return the tool result
  5. ONLY AFTER receiving success confirmation can you tell the user it's booked
- NEVER skip the tool execution
- NEVER claim booking is complete without tool confirmation
- If you don't have all required info, ask for the missing details
`}

CORRECT BOOKING FLOW:
User: "I want to book with Dr. Mithun Doc tomorrow at 2 PM for headache"
You: {"tool": "book_appointment", "parameters": {"doctorId": "1678f992-9228-4bd1-a282-6e7ba6d818b3", "date": "2026-01-23", "time": "02:00 PM", "reason": "headache"}}
[System returns: {"success": true, "message": "Appointment booked successfully!"}]
You: "Great! I've confirmed your appointment with Dr. Mithun Doc for tomorrow at 2 PM for your headache."

INCORRECT BOOKING FLOW (NEVER DO THIS):
User: "I want to book with Dr. Mithun Doc tomorrow for headache"
You: "I'm going to book that for you... Your appointment is confirmed!" ❌ WRONG - NO TOOL WAS USED

REMEMBER: If you claim an appointment is booked but didn't use the tool, the appointment DOES NOT EXIST in the system and the user will be confused and upset.

ALWAYS DO THIS:
✅ Ask for missing information naturally
✅ Use the tool when you have all required info
✅ Wait for tool confirmation
✅ Only then confirm to the user
✅ Be honest about what you can and cannot do`
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
