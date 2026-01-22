const axios = require('axios');

const OLLAMA_API_URL = process.env.OLLAMA_API_URL || 'https://ross-nonadoptable-lovetta.ngrok-free.dev';

// System prompt with tool instructions using prompt engineering
const SYSTEM_PROMPT = `You are MedBeacon AI, a helpful medical appointment assistant. Your role is to help users:
- Book medical appointments with doctors
- Search for doctors by specialization
- View and manage their appointments
- Get information about doctors

You have access to the following tools that you can use by responding in a specific JSON format:

AVAILABLE TOOLS:
1. book_appointment - Book a medical appointment
   Required: doctorId, date (YYYY-MM-DD), time (HH:MM AM/PM), reason
   Optional: notes

2. search_doctors - Search for doctors
   Optional: specialization, name, availability

3. get_appointments - Get user's appointments
   Optional: status (pending/confirmed/completed/cancelled), upcoming (true/false)

4. cancel_appointment - Cancel an appointment
   Required: appointmentId

5. get_doctor_info - Get doctor information
   Required: doctorId

TO USE A TOOL, respond with ONLY a JSON object in this exact format:
{
  "tool": "tool_name",
  "parameters": {
    "param1": "value1",
    "param2": "value2"
  }
}

IMPORTANT RULES:
- When you need to use a tool, respond ONLY with the JSON object, nothing else
- After receiving tool results, provide a natural, conversational response to the user
- Always be professional, empathetic, and clear
- Ask for missing information politely before using tools
- Confirm important actions before executing them

Examples:
User: "Find me a cardiologist"
You: {"tool": "search_doctors", "parameters": {"specialization": "Cardiology"}}

User: "Show my appointments"
You: {"tool": "get_appointments", "parameters": {}}

User: "Book an appointment with doctor ID abc123 for tomorrow at 2 PM for a checkup"
You: {"tool": "book_appointment", "parameters": {"doctorId": "abc123", "date": "2026-01-23", "time": "02:00 PM", "reason": "General Checkup"}}`;

/**
 * Send a chat message to Ollama
 * @param {Array} messages - Array of message objects with role and content
 * @returns {Promise} - Ollama API response
 */
async function sendChatMessage(messages) {
    try {
        const response = await axios.post(
            `${OLLAMA_API_URL}/v1/chat/completions`,
            {
                model: "llama3",
                messages: [
                    { role: "system", content: SYSTEM_PROMPT },
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
 * Parse AI response to detect tool calls
 * @param {String} content - AI response content
 * @returns {Object} - Parsed tool call or null
 */
function parseToolCall(content) {
    try {
        // Remove markdown code blocks if present
        let cleanContent = content.trim();
        cleanContent = cleanContent.replace(/```json\n?/g, '').replace(/```\n?/g, '');

        // Try to find JSON in the response
        const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
        if (!jsonMatch) return null;

        const parsed = JSON.parse(jsonMatch[0]);

        // Check if it's a tool call
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
 * @param {Array} conversationHistory - Full conversation history
 * @returns {Promise} - AI response with potential tool calls
 */
async function processMessage(conversationHistory) {
    try {
        const response = await sendChatMessage(conversationHistory);
        const message = response.choices[0].message;
        const content = message.content;

        // Try to parse tool call from response
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
 * @param {Array} conversationHistory - Conversation history including tool results
 * @returns {Promise} - AI response after processing tool results
 */
async function continueAfterToolExecution(conversationHistory) {
    try {
        const response = await sendChatMessage(conversationHistory);
        const message = response.choices[0].message;
        const content = message.content;

        // Check if AI wants to call another tool
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
