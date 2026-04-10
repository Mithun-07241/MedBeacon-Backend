const axios = require('axios');

const OLLAMA_API_URL = process.env.OLLAMA_API_URL || 'https://ross-nonadoptable-lovetta.ngrok-free.dev';

// ══════════════════════════════════════════════════════════════════════════════
// TOOL DEFINITIONS BY ROLE — every possible automation
// ══════════════════════════════════════════════════════════════════════════════

const PATIENT_TOOLS = `
Available tools (PATIENT):
APPOINTMENTS:
- book_appointment: Book an appointment (requires: doctorId, date, time, reason)
- search_doctors: Search for doctors by specialization or name
- get_appointments: Get your appointments (optional: status, upcoming)
- cancel_appointment: Cancel an appointment (requires: appointmentId)
- reschedule_appointment: Accept/decline a reschedule offer (requires: appointmentId, action: accept/decline)
- get_doctor_info: Get detailed doctor information (requires: doctorId)
- rate_appointment: Rate a completed appointment (requires: appointmentId, rating 1-5, optional: feedback)

HEALTH & RECORDS:
- view_medications: View your current medications
- view_health_metrics: View your latest health readings
- add_health_metric: Record a new health metric (requires: type like blood_pressure/heart_rate/weight/temperature/blood_sugar, value, unit)
- view_lab_reports: View your lab reports
- view_medical_records: View your medical records

BILLING:
- view_invoices: View your billing invoices (optional: status)
- submit_payment_ref: Submit payment reference for an invoice (requires: invoiceId, paymentRef)

GENERAL:
- view_announcements: View clinic announcements`;

const DOCTOR_TOOLS = `
Available tools (DOCTOR):
INVENTORY & PHARMACY:
- search_inventory: Search inventory items by name or category (optional: name, category)
- get_inventory_stats: Get inventory KPI summary (total items, value, low stock)
- get_low_stock_alerts: List items with critically low stock
- get_expiring_items: List pharmacy items expiring soon (optional: days, default 30)
- add_inventory_item: Add a new inventory item (requires: name, category, quantity, unit, purchasePrice)
- update_inventory_item: Update an existing inventory item (requires: itemId, and fields to update)
- delete_inventory_item: Delete an inventory item (requires: itemId)
- get_pharmacy_stock: Search pharmacy stock (optional: category, search)
- add_pharmacy_item: Add a new pharmacy medicine (requires: name, category, manufacturer, batchNumber, expiryDate, unit, price, quantity)
- update_pharmacy_item: Update a pharmacy item (requires: itemId, fields to update)
- record_pharmacy_transaction: Record stock transaction (requires: itemId, type: purchase/sale/return/expired/adjustment, quantity)

PATIENTS & APPOINTMENTS:
- get_patient_list: Get your list of patients (optional: search)
- get_schedule_summary: Get today's or upcoming appointment summary
- confirm_appointment: Confirm a pending appointment (requires: appointmentId)
- complete_appointment: Mark appointment as completed (requires: appointmentId)
- reject_appointment: Reject an appointment (requires: appointmentId)
- reschedule_appointment: Offer a reschedule to patient (requires: appointmentId, newDate, newTime)
- get_doctor_reviews: View your patient reviews and ratings
- get_doctor_stats: Get your performance stats (completed count, avg rating)

CLINICAL:
- prescribe_medication: Prescribe medication to a patient (requires: patientId, name, dosage, frequency; optional: instructions, duration)
- create_lab_report: Create a lab report for patient (requires: patientId, testName, results array [{parameter, value, unit, referenceRange}])
- get_lab_reports: View lab reports you've issued (optional: status)
- view_patient_records: View a patient's medical records (requires: patientId)
- add_medical_record: Add a medical record for patient (requires: patientId, name, type, date)
- view_patient_health_metrics: View patient's health metrics (requires: patientId)

BILLING & SERVICES:
- create_invoice: Create a patient invoice (requires: patientId, items [{description, quantity, rate}])
- get_invoices: View your issued invoices (optional: status)
- mark_invoice_paid: Mark an invoice as paid (requires: invoiceId)
- get_services: View available billing services/procedures
- create_service: Create a custom service (requires: name, category, defaultPrice)

GENERAL:
- search_doctors: Search for doctors by specialization or name
- get_doctor_info: Get detailed doctor information (requires: doctorId)
- view_announcements: View clinic announcements`;

const ADMIN_TOOLS = `
Available tools (ADMIN):
INVENTORY & PHARMACY:
- search_inventory: Search inventory items by name or category (optional: name, category)
- get_inventory_stats: Get inventory KPI summary (total items, value, low stock)
- get_low_stock_alerts: List items with critically low stock
- get_expiring_items: List pharmacy items expiring soon (optional: days, default 30)
- add_inventory_item: Add a new inventory item (requires: name, category, quantity, unit, purchasePrice)
- update_inventory_item: Update an existing inventory item (requires: itemId, and fields to update)
- delete_inventory_item: Delete an inventory item (requires: itemId)
- get_pharmacy_stock: Search pharmacy stock (optional: category, search)
- add_pharmacy_item: Add a new pharmacy medicine (requires: name, category, manufacturer, batchNumber, expiryDate, unit, price, quantity)
- update_pharmacy_item: Update a pharmacy item (requires: itemId, fields to update)
- record_pharmacy_transaction: Record stock transaction (requires: itemId, type: purchase/sale/return/expired/adjustment, quantity)

PLATFORM & USERS:
- get_platform_stats: Get platform-wide statistics (users, appointments, revenue)
- get_analytics: Get growth analytics (user trends, signups, specialization distribution)
- get_user_list: Get all users (optional: role, search)
- get_patient_list: Get list of all patients (optional: search)
- get_all_doctors: Get list of all doctors with verification status
- get_pending_doctors: Get doctors awaiting verification
- verify_doctor: Approve or reject a doctor (requires: userId, action: approve/reject; optional: reason)
- update_user: Update user role or status (requires: userId; optional: action: suspend/activate, role)
- delete_user: Delete a user (requires: userId)

APPOINTMENTS:
- get_all_appointments: Get all clinic appointments (optional: status)
- get_schedule_summary: Get appointment summary for the clinic
- get_doctor_stats: Get a doctor's performance stats (requires: doctorId)

BILLING:
- get_invoices: View all invoices (optional: status)

COMMUNICATION:
- send_announcement: Send announcement to users (requires: title, message; optional: targetAudience: all/patients/doctors, priority: low/medium/high)
- get_announcements: View all announcements
- get_activity_logs: View admin activity logs (optional: action, limit)

GENERAL:
- search_doctors: Search for doctors by specialization or name
- get_doctor_info: Get detailed doctor information (requires: doctorId)`;

function getToolsForRole(role) {
    switch (role) {
        case 'doctor': return DOCTOR_TOOLS;
        case 'admin':
        case 'clinic_admin': return ADMIN_TOOLS;
        default: return PATIENT_TOOLS;
    }
}

// System prompt with tool instructions and database context
const getSystemPrompt = (userRole, dbContext = {}, bookingState = {}) => {
    const { doctors = [], specializations = [] } = dbContext;

    const doctorsListInternal = doctors.length > 0
        ? doctors.slice(0, 15).map(d => `- ${d.name} (${d.specialization}) - ID: ${d.id} - Rating: ${d.rating}/5, ${d.hospital}`).join('\n')
        : 'No doctors available yet.';

    const doctorsListDisplay = doctors.length > 0
        ? doctors.slice(0, 15).map(d => `- ${d.name} (${d.specialization}) - Rating: ${d.rating}/5`).join('\n')
        : 'No doctors available yet.';

    const specializationsList = specializations.length > 0
        ? specializations.join(', ')
        : 'General Practitioner, Cardiology, Dermatology, Pediatrics';

    const toolsBlock = getToolsForRole(userRole);

    let roleContextBlock = '';
    let roleBehaviourBlock = '';

    if (userRole === 'patient') {
        const stateLines = [];
        if (bookingState.doctor) stateLines.push(`  ✅ Doctor: ${bookingState.doctor.name} (ID: ${bookingState.doctor.id})`);
        else stateLines.push(`  ❌ Doctor: NOT YET COLLECTED`);
        if (bookingState.date) stateLines.push(`  ✅ Date: ${bookingState.date}`);
        else stateLines.push(`  ❌ Date: NOT YET COLLECTED`);
        if (bookingState.time) stateLines.push(`  ✅ Time: ${bookingState.time}`);
        else stateLines.push(`  ❌ Time: NOT YET COLLECTED`);
        if (bookingState.reason) stateLines.push(`  ✅ Reason: ${bookingState.reason}`);
        else stateLines.push(`  ❌ Reason: NOT YET COLLECTED`);

        roleContextBlock = `
WHEN SHOWING DOCTORS TO USERS, USE THIS LIST (NO IDs):
${doctorsListDisplay}

Available specializations: ${specializationsList}

══════════════════════════════════════════
CURRENT BOOKING STATE (SERVER-TRACKED):
${stateLines.join('\n')}

WHAT YOU MUST DO NEXT:
${
    !bookingState.doctor ? `→ Ask the user WHICH DOCTOR they want.`
    : !bookingState.date ? `→ Ask the user WHAT DATE they want.`
    : !bookingState.time ? `→ Ask the user WHAT TIME they want.`
    : !bookingState.reason ? `→ Ask the user for the REASON for their visit.`
    : `→ ALL INFORMATION COLLECTED. Fire the booking tool NOW:
{"tool": "book_appointment", "parameters": {"doctorId": "${bookingState.doctor?.id}", "date": "${bookingState.date}", "time": "${bookingState.time}", "reason": "${bookingState.reason}"}}`
}
══════════════════════════════════════════`;

        roleBehaviourBlock = `
ROLE: PATIENT
You help patients with EVERYTHING — appointments, medications, health tracking, billing, records. You are their personal healthcare AI agent.

KEY CAPABILITIES:
- Book, view, cancel, and rate appointments
- View medications, health metrics, and lab reports
- Record new health readings (blood pressure, heart rate, weight, temperature, blood sugar)
- View and pay invoices
- View clinic announcements
- View medical records

BOOKING FLOW:
1. Greet and ask which doctor
2. Collect: doctor → date → time → reason (one at a time)
3. Fire tool when all 4 are collected
4. Confirm booking details to user

DATE RULES: "tomorrow" = ${getTomorrowDate()}, "today" = ${getTodayDate()}, always YYYY-MM-DD
TIME RULES: Convert to HH:MM AM/PM format, "anytime" = 10:00 AM`;

    } else if (userRole === 'doctor') {
        const invSummary = dbContext.inventory
            ? `\nINVENTORY: ${dbContext.inventory.totalItems} items, ₹${dbContext.inventory.totalValue?.toLocaleString()} value, ${dbContext.inventory.lowStockCount} low stock`
            : '';
        const pharmSummary = dbContext.pharmacy
            ? `\nPHARMACY: ${dbContext.pharmacy.totalItems} medicines, ${dbContext.pharmacy.lowStockCount} low stock, ${dbContext.pharmacy.expiringCount} expiring`
            : '';

        roleContextBlock = `
DOCTORS LIST:\n${doctorsListDisplay}${invSummary}${pharmSummary}`;

        roleBehaviourBlock = `
ROLE: DOCTOR — Full Practice Management AI Agent
You are a powerful AI assistant that can automate virtually EVERYTHING a doctor needs:

INVENTORY & PHARMACY: Search, add, edit, delete items. Record stock transactions (purchase, sale, adjustment). Check low stock & expiring medicines.
PATIENTS: View patient lists, their medical records, health metrics, and lab reports.
APPOINTMENTS: View schedule, confirm/reject/complete appointments, offer reschedules.
CLINICAL: Prescribe medications, create lab reports with results, add medical records for patients.
BILLING: Create detailed invoices, view invoice history, mark invoices as paid, manage services/procedures.
REVIEWS: View your patient ratings and feedback.

BE PROACTIVE: If you notice low stock while searching, mention it. If a patient has abnormal health metrics, flag it.`;

    } else if (userRole === 'admin' || userRole === 'clinic_admin') {
        const invSummary = dbContext.inventory
            ? `\nINVENTORY: ${dbContext.inventory.totalItems} items, ₹${dbContext.inventory.totalValue?.toLocaleString()} value, ${dbContext.inventory.lowStockCount} low stock\nCategories: ${Object.entries(dbContext.inventory.categories || {}).map(([k,v]) => `${k}(${v})`).join(', ')}`
            : '';
        const pharmSummary = dbContext.pharmacy
            ? `\nPHARMACY: ${dbContext.pharmacy.totalItems} medicines, ${dbContext.pharmacy.lowStockCount} low stock, ${dbContext.pharmacy.expiringCount} expiring, ${dbContext.pharmacy.expiredCount} expired`
            : '';
        const statsSummary = dbContext.platformStats
            ? `\nPLATFORM: ${dbContext.platformStats.totalUsers} users, ${dbContext.platformStats.totalDoctors} doctors, ${dbContext.platformStats.totalPatients} patients, ${dbContext.platformStats.totalAppointments} appointments (${dbContext.platformStats.pendingAppointments} pending)`
            : '';

        roleContextBlock = `
DOCTORS LIST:\n${doctorsListDisplay}${invSummary}${pharmSummary}${statsSummary}`;

        roleBehaviourBlock = `
ROLE: ADMIN — Full Platform Command Center AI Agent
You are a powerful AI agent with FULL control over the entire MedBeacon platform:

INVENTORY & PHARMACY: Full CRUD, stock transactions, expiry monitoring, low stock alerts.
USER MANAGEMENT: View all users, verify/reject doctors, suspend/activate accounts, delete users.
PLATFORM ANALYTICS: User growth, signups, specialization distribution, active users.
APPOINTMENTS: View all clinic appointments, filter by status, view doctor performance stats.
BILLING: View all invoices across the platform.
ANNOUNCEMENTS: Create and broadcast announcements to all users, patients only, or doctors only.
ACTIVITY LOGS: View admin action history for audit compliance.

BE PROACTIVE: Flag pending doctor verifications, low stock items, and appointment backlogs.`;
    }

    return `You are MedBeacon AI, a powerful agentic healthcare management assistant that can AUTOMATE virtually everything.

IMPORTANT: The current user's role is: ${userRole.toUpperCase()}

DATABASE CONTEXT (INTERNAL — use IDs for tool calls):
${doctorsListInternal}

${roleContextBlock}

TOOL CALL FORMAT (respond with ONLY this JSON when calling a tool, NO other text):
{"tool": "tool_name", "parameters": {"param1": "value1"}}

${toolsBlock}

CRITICAL RULES:
1. NEVER show JSON, IDs, or technical data to users — present information naturally
2. Keep responses SHORT and actionable (1-4 sentences for simple queries)
3. Use markdown bullet points for lists
4. NEVER invent data — only use tool results
5. Be proactive — notice issues and suggest actions
6. For multi-step tasks, execute tools one at a time
7. When a tool succeeds with a write operation, confirm what was done
8. You CAN chain multiple operations — e.g. "Add paracetamol and check low stock" → call add_inventory_item first, then get_low_stock_alerts

${roleBehaviourBlock}`;
};

function getTodayDate() { return new Date().toISOString().split('T')[0]; }
function getTomorrowDate() { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0]; }

async function sendChatMessage(messages, userRole = 'patient', dbContext = {}, bookingState = {}) {
    try {
        const response = await axios.post(`${OLLAMA_API_URL}/v1/chat/completions`, {
            model: "llama3",
            messages: [{ role: "system", content: getSystemPrompt(userRole, dbContext, bookingState) }, ...messages],
            temperature: 0.2, stream: false
        }, { headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' }, timeout: 60000 });
        return response.data;
    } catch (error) {
        console.error('Ollama API Error:', error.response?.data || error.message);
        throw new Error(error.response?.data?.error?.message || 'Failed to communicate with AI service');
    }
}

function parseToolCall(content) {
    try {
        let cleanContent = content.trim();
        cleanContent = cleanContent.replace(/```json\n?/g, '').replace(/```\n?/g, '');
        const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
        if (!jsonMatch) return null;
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.tool && parsed.parameters !== undefined) return { name: parsed.tool, arguments: parsed.parameters };
        return null;
    } catch (error) { return null; }
}

async function processMessage(conversationHistory, userRole = 'patient', dbContext = {}, bookingState = {}) {
    try {
        const response = await sendChatMessage(conversationHistory, userRole, dbContext, bookingState);
        const content = response.choices[0].message.content;
        const toolCall = parseToolCall(content);
        if (toolCall) {
            return { content: '', toolCalls: [{ id: `call_${Date.now()}`, type: 'function', function: toolCall }], finishReason: 'tool_calls' };
        }
        return { content, toolCalls: null, finishReason: response.choices[0].finish_reason };
    } catch (error) { throw error; }
}

async function continueAfterToolExecution(conversationHistory, userRole = 'patient', dbContext = {}, bookingState = {}) {
    try {
        const response = await sendChatMessage(conversationHistory, userRole, dbContext, bookingState);
        const content = response.choices[0].message.content;
        const toolCall = parseToolCall(content);
        if (toolCall) {
            return { content: '', toolCalls: [{ id: `call_${Date.now()}`, type: 'function', function: toolCall }], finishReason: 'tool_calls' };
        }
        return { content, toolCalls: null, finishReason: response.choices[0].finish_reason };
    } catch (error) { throw error; }
}

module.exports = { processMessage, continueAfterToolExecution };
