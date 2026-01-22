const axios = require('axios');

const OLLAMA_API_URL = process.env.OLLAMA_API_URL || 'https://ross-nonadoptable-lovetta.ngrok-free.dev';

// Define available tools for the AI agent
const TOOLS = [
    {
        type: "function",
        function: {
            name: "book_appointment",
            description: "Book a medical appointment with a doctor. Use this when the user wants to schedule an appointment.",
            parameters: {
                type: "object",
                properties: {
                    doctorId: {
                        type: "string",
                        description: "The unique ID of the doctor"
                    },
                    date: {
                        type: "string",
                        description: "The appointment date in YYYY-MM-DD format"
                    },
                    time: {
                        type: "string",
                        description: "The appointment time in HH:MM AM/PM format (e.g., 09:00 AM, 02:30 PM)"
                    },
                    reason: {
                        type: "string",
                        description: "The reason for the visit (e.g., General Consultation, Follow-up, Routine Checkup)"
                    },
                    notes: {
                        type: "string",
                        description: "Additional notes or symptoms (optional)"
                    }
                },
                required: ["doctorId", "date", "time", "reason"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "search_doctors",
            description: "Search for doctors by specialization, name, or availability. Use this when the user wants to find a doctor.",
            parameters: {
                type: "object",
                properties: {
                    specialization: {
                        type: "string",
                        description: "The medical specialization (e.g., Cardiology, Dermatology, Pediatrics)"
                    },
                    name: {
                        type: "string",
                        description: "The doctor's name (partial match supported)"
                    },
                    availability: {
                        type: "string",
                        enum: ["available", "busy", "unavailable"],
                        description: "Filter by availability status"
                    }
                },
                required: []
            }
        }
    },
    {
        type: "function",
        function: {
            name: "get_appointments",
            description: "Get the user's appointments. Use this when the user wants to see their scheduled appointments.",
            parameters: {
                type: "object",
                properties: {
                    status: {
                        type: "string",
                        enum: ["pending", "confirmed", "completed", "cancelled"],
                        description: "Filter appointments by status"
                    },
                    upcoming: {
                        type: "boolean",
                        description: "If true, only show upcoming appointments"
                    }
                },
                required: []
            }
        }
    },
    {
        type: "function",
        function: {
            name: "cancel_appointment",
            description: "Cancel an existing appointment. Use this when the user wants to cancel their appointment.",
            parameters: {
                type: "object",
                properties: {
                    appointmentId: {
                        type: "string",
                        description: "The unique ID of the appointment to cancel"
                    }
                },
                required: ["appointmentId"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "get_doctor_info",
            description: "Get detailed information about a specific doctor including their specialization, experience, and availability.",
            parameters: {
                type: "object",
                properties: {
                    doctorId: {
                        type: "string",
                        description: "The unique ID of the doctor"
                    }
                },
                required: ["doctorId"]
            }
        }
    }
];

// System prompt for the AI agent
const SYSTEM_PROMPT = `You are MedBeacon AI, a helpful medical appointment assistant. Your role is to help users:
- Book medical appointments with doctors
- Search for doctors by specialization
- View and manage their appointments
- Get information about doctors

Always be professional, empathetic, and clear in your communication. When booking appointments:
1. Ask for all required information if not provided (doctor, date, time, reason)
2. Confirm the details before booking
3. Provide helpful suggestions for available time slots

When searching for doctors:
1. Ask about the user's specific needs or symptoms
2. Suggest appropriate specializations
3. Present doctor options clearly

Be conversational and friendly while maintaining professionalism. If you need information to complete a task, ask the user politely.`;

/**
 * Send a chat message to Ollama with function calling support
 * @param {Array} messages - Array of message objects with role and content
 * @param {Boolean} stream - Whether to stream the response
 * @returns {Promise} - Ollama API response
 */
async function sendChatMessage(messages, stream = false) {
    try {
        const response = await axios.post(
            `${OLLAMA_API_URL}/v1/chat/completions`,
            {
                model: "llama3",
                messages: [
                    { role: "system", content: SYSTEM_PROMPT },
                    ...messages
                ],
                tools: TOOLS,
                temperature: 0.7,
                stream: stream
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'ngrok-skip-browser-warning': 'true'
                },
                responseType: stream ? 'stream' : 'json',
                timeout: 60000 // 60 second timeout
            }
        );

        return response.data;
    } catch (error) {
        console.error('Ollama API Error:', error.response?.data || error.message);
        throw new Error(error.response?.data?.error?.message || 'Failed to communicate with AI service');
    }
}

/**
 * Process a user message and get AI response with tool calls
 * @param {Array} conversationHistory - Full conversation history
 * @returns {Promise} - AI response with potential tool calls
 */
async function processMessage(conversationHistory) {
    try {
        const response = await sendChatMessage(conversationHistory, false);

        // Check if the response includes tool calls
        const message = response.choices[0].message;

        return {
            content: message.content,
            toolCalls: message.tool_calls || null,
            finishReason: response.choices[0].finish_reason
        };
    } catch (error) {
        throw error;
    }
}

/**
 * Continue conversation after tool execution
 * @param {Array} conversationHistory - Conversation history including tool results
 * @returns {Promise} - AI response after processing tool results
 */
async function continueAfterToolExecution(conversationHistory) {
    try {
        const response = await sendChatMessage(conversationHistory, false);
        const message = response.choices[0].message;

        return {
            content: message.content,
            toolCalls: message.tool_calls || null,
            finishReason: response.choices[0].finish_reason
        };
    } catch (error) {
        throw error;
    }
}

module.exports = {
    processMessage,
    continueAfterToolExecution,
    TOOLS
};
