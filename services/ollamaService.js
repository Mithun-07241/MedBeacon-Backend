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

WORKFLOW AUTOMATIONS:
- patient_health_summary: Get a COMPLETE health overview (medications + metrics + lab reports + records) in one shot

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
- get_patient_by_id: Get detailed info for a specific patient (requires: patientId)
- get_treated_patients: Get list of patients you've treated (completed appointments)
- get_schedule_summary: Get today's or upcoming appointment summary
- confirm_appointment: Confirm a pending appointment (requires: appointmentId)
- complete_appointment: Mark appointment as completed (requires: appointmentId)
- reject_appointment: Reject an appointment (requires: appointmentId)
- reschedule_appointment: Offer a reschedule to patient (requires: appointmentId, newDate, newTime)
- bulk_confirm_appointments: Confirm ALL pending appointments at once
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
- get_revenue_report: Full revenue report (total revenue, monthly, pending, collection rate)
- get_billing_analytics: Billing analytics with overdue invoices and pending payments

WORKFLOW AUTOMATIONS (use these for broad requests):
- morning_briefing: ☀️ Complete morning briefing (schedule + stock + revenue + billing + alerts) — the ULTIMATE daily opener
- daily_clinic_report: Generate a complete daily report (schedule + stock + expiry + stats) in one shot
- pharmacy_audit: Run a full pharmacy audit (stock + expired + expiring + low stock + recommendations)
- inventory_restock_report: Generate restock report (out-of-stock + critically low + recommendations)
- complete_and_invoice: Complete an appointment AND auto-create its invoice in one step (requires: appointmentId, items)

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
- get_patient_by_id: Get detailed patient info (requires: patientId)
- get_all_doctors: Get list of all doctors with verification status
- get_pending_doctors: Get doctors awaiting verification
- verify_doctor: Approve or reject a doctor (requires: userId, action: approve/reject; optional: reason)
- update_user: Update user role or status (requires: userId; optional: action: suspend/activate, role)
- delete_user: Delete a user (requires: userId)

CLINIC MANAGEMENT:
- get_clinic_profile: View the clinic's profile (name, address, contact, UPI)
- update_clinic_profile: Update clinic info (optional: clinicName, address, city, state, phone, email, website, description, upiId)

APPOINTMENTS:
- get_all_appointments: Get all clinic appointments (optional: status)
- get_schedule_summary: Get appointment summary for the clinic
- get_doctor_stats: Get a doctor's performance stats (requires: doctorId)
- bulk_confirm_appointments: Confirm ALL pending appointments at once

BILLING & REVENUE:
- get_invoices: View all invoices (optional: status)
- get_revenue_report: Full revenue report (total revenue, monthly, pending, collection rate)
- get_billing_analytics: Billing analytics with overdue invoices and pending payments

COMMUNICATION:
- send_announcement: Send announcement to users (requires: title, message; optional: targetAudience: all/patients/doctors, priority: low/medium/high)
- get_announcements: View all announcements
- get_activity_logs: View admin activity logs (optional: action, limit)

WORKFLOW AUTOMATIONS (use these for broad requests):
- morning_briefing: ☀️ Complete morning briefing (schedule + stock + revenue + billing + alerts) — the ULTIMATE daily opener
- daily_clinic_report: Generate a complete daily report (schedule + stock + expiry + stats) in one shot
- pharmacy_audit: Run a full pharmacy audit (stock + expired + expiring + low stock + recommendations)
- inventory_restock_report: Generate restock report (out-of-stock + critically low + recommendations)
- clinic_overview_report: Generate a FULL clinic overview (platform stats + analytics + doctors + appointments + inventory + pharmacy)
- auto_verify_pending_doctors: Automatically approve ALL pending doctor verifications at once

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
        : 'No specializations registered yet — ask the user to check back later.';

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
4. ***ABSOLUTE ZERO-TOLERANCE RULE***: NEVER invent, fabricate, or hallucinate ANY data. You have NO data until you call a tool. If you have not called a tool, you MUST call one before responding. NEVER make up invoice numbers, amounts, dates, patient names, medication names, appointment details, or any other clinical/financial data.
5. Be proactive — notice issues and suggest actions
6. When a tool succeeds with a write operation, confirm what was done
7. CURRENCY: This is an Indian healthcare platform. ALL monetary amounts are in Indian Rupees (₹). NEVER use dollars ($) or USD. Always format as ₹amount (e.g. ₹500, ₹1,200). The dollar sign $ must NEVER appear in your responses.
8. For billing/invoice queries: ALWAYS call the view_invoices or get_invoices tool FIRST. NEVER respond with made-up invoice data.
9. NEVER output example/placeholder data like "Invoice #1234: $50.00" or "Dr. Smith" or fake dates. If there is no data, say "No records found" — do NOT invent examples.
10. When the user asks to VIEW, SHOW, LIST, or CHECK anything (invoices, appointments, medications, metrics, reports, records, stock), you MUST call the corresponding tool FIRST. Respond ONLY after you receive the tool result.

MANDATORY TOOL CALLS — You MUST call the tool BEFORE responding for these queries:
- "show/view invoices/bills" → call view_invoices (patient) or get_invoices (doctor/admin)
- "show/view appointments" → call get_appointments
- "show/view medications" → call view_medications
- "show/view health metrics/vitals" → call view_health_metrics
- "show/view lab reports" → call view_lab_reports
- "show/view medical records" → call view_medical_records
- "show/view patients" → call get_patient_list
- "show/view inventory/stock" → call search_inventory or get_inventory_stats
- "show/view pharmacy" → call get_pharmacy_stock
- "revenue/billing report" → call get_revenue_report or get_billing_analytics
- "health summary" → call patient_health_summary
- "morning briefing" → call morning_briefing
- "daily report" → call daily_clinic_report
If the user asks for ANY of the above, you MUST output ONLY the tool call JSON. Do NOT write any text before or after. Do NOT guess or make up data.

AGENTIC BEHAVIOR (IMPORTANT):
- You are an AUTONOMOUS AGENT. You can chain up to 8 tool calls in sequence WITHOUT asking the user between steps.
- For broad requests like "give me a report" or "how's things looking", use COMPOUND WORKFLOW TOOLS (daily_clinic_report, pharmacy_audit, clinic_overview_report, patient_health_summary) which gather all data in one call.
- For multi-step tasks (e.g. "add this item and check stock"), call the first tool, then AUTOMATICALLY call the next tool after getting results. Do NOT ask permission.
- When you receive tool results and the task needs more data, call another tool immediately.
- Only present the final summary to the user AFTER all tools have been executed.
- Prefer compound tools over individual tools when the user asks for something broad.
- REMINDER: You have ZERO knowledge of the user's data. ALL data comes from tools. Call the tool first, then present results.

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
