# MedBeacon — Agentic AI Tools & Autonomous Automation

> **Complete Technical Documentation**  
> Last Updated: April 11, 2026

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Part 1: AI Tools Reference](#part-1-ai-tools-reference)
   - [Patient Tools (15)](#patient-tools-15)
   - [Doctor Tools (38)](#doctor-tools-38)
   - [Admin / Clinic Admin Tools (40+)](#admin--clinic-admin-tools-40)
   - [Shared Tools (3)](#shared-tools-3)
3. [Part 2: Autonomous Automation](#part-2-autonomous-automation)
   - [Agentic Loop Architecture](#agentic-loop-architecture)
   - [Compound Workflow Tools (9)](#compound-workflow-tools-9)
   - [Background Cron Scheduler](#background-cron-scheduler)
   - [Permission Enforcement](#permission-enforcement)
   - [System Prompt Engineering](#system-prompt-engineering)
4. [File Reference](#file-reference)

---

## System Overview

MedBeacon's AI system is a **fully autonomous agentic framework** that can:

- Execute **55+ backend tools** directly against the MongoDB database
- **Chain up to 8 tool calls** per user message without asking for permission
- Run **compound workflows** that aggregate multiple data sources in a single call
- Operate **proactively on a schedule** (cron job) — generating reports without any human input
- Enforce **strict role-based permissions** so patients can't access admin tools, etc.

```
┌─────────────────────────────────────────────────────────┐
│                   MedBeacon AI Agent                     │
│                                                         │
│  ┌──────────┐    ┌──────────┐    ┌───────────────────┐  │
│  │  Patient  │    │  Doctor  │    │  Admin/ClinicAdmin │  │
│  │ 15 tools  │    │ 38 tools │    │     40+ tools     │  │
│  └──────────┘    └──────────┘    └───────────────────┘  │
│                        │                                 │
│            ┌───────────┴───────────┐                     │
│            │   Agentic Loop        │                     │
│            │   (max 8 iterations)  │                     │
│            └───────────┬───────────┘                     │
│                        │                                 │
│  ┌─────────────────────┴──────────────────────────────┐  │
│  │  9 Compound Workflow Tools (multi-step autonomous) │  │
│  └─────────────────────┬──────────────────────────────┘  │
│                        │                                 │
│            ┌───────────┴───────────┐                     │
│            │  Background Cron Job  │                     │
│            │  (8 AM Daily Auto)    │                     │
│            └───────────────────────┘                     │
└─────────────────────────────────────────────────────────┘
```

---

# Part 1: AI Tools Reference

## Patient Tools (15)

### Appointments (7 tools)

| Tool | Description | Required Parameters | Optional Parameters |
|------|-------------|--------------------|--------------------|
| `book_appointment` | Book a new appointment with a doctor | `doctorId`, `date` (YYYY-MM-DD), `time` (HH:MM AM/PM), `reason` | — |
| `search_doctors` | Search doctors by specialization or name | — | `specialization`, `name` |
| `get_doctor_info` | Get detailed info about a specific doctor | `doctorId` | — |
| `get_appointments` | View own appointments | — | `status` (pending/confirmed/completed/cancelled), `upcoming` (bool) |
| `cancel_appointment` | Cancel an existing appointment | `appointmentId` | — |
| `reschedule_appointment` | Accept or decline a reschedule offer from a doctor | `appointmentId`, `action` (accept/decline) | — |
| `rate_appointment` | Rate a completed appointment 1–5 stars | `appointmentId`, `rating` (1–5) | `feedback` (text) |

**Booking Flow (Conversational):**

The AI uses a state machine to guide patients through booking step-by-step:

```
Step 1: Ask which doctor (uses search_doctors internally)
Step 2: Ask for date (converts "tomorrow" → YYYY-MM-DD)
Step 3: Ask for time (converts "3pm" → 03:00 PM)
Step 4: Ask for reason
Step 5: Auto-fires book_appointment with all collected data
```

### Health & Records (5 tools)

| Tool | Description | Required Parameters | Optional Parameters |
|------|-------------|--------------------|--------------------|
| `view_medications` | View current prescribed medications | — | — |
| `view_health_metrics` | View latest health readings (BP, heart rate, weight, etc.) | — | — |
| `add_health_metric` | Record a new health reading | `type` (blood_pressure / heart_rate / weight / temperature / blood_sugar), `value`, `unit` | — |
| `view_lab_reports` | View lab test results | — | — |
| `view_medical_records` | View full medical history | — | — |

### Billing (2 tools)

| Tool | Description | Required Parameters | Optional Parameters |
|------|-------------|--------------------|--------------------|
| `view_invoices` | View billing invoices | — | `status` (draft/sent/paid) |
| `submit_payment_ref` | Submit a payment reference number for an invoice | `invoiceId`, `paymentRef` | — |

### Compound Workflows (1 tool)

| Tool | Description | What it chains internally |
|------|-------------|--------------------------|
| `patient_health_summary` | Complete health overview in one shot | `view_medications` → `view_health_metrics` → `view_lab_reports` → `view_medical_records` |

---

## Doctor Tools (38)

### Inventory Management (7 tools)

| Tool | Description | Required Parameters | Optional Parameters |
|------|-------------|--------------------|--------------------|
| `search_inventory` | Search items by name or category | — | `name`, `category` |
| `get_inventory_stats` | Get KPI summary (total items, total value, low stock count) | — | — |
| `get_low_stock_alerts` | List all items below their reorder threshold | — | — |
| `get_expiring_items` | List pharmacy items expiring within N days | — | `days` (default: 30) |
| `add_inventory_item` | Add a new item to inventory | `name`, `category`, `quantity`, `unit`, `purchasePrice` | `description`, `reorderLevel`, `supplier` |
| `update_inventory_item` | Update fields on an existing item | `itemId` | `name`, `category`, `quantity`, `unit`, `purchasePrice`, `reorderLevel` |
| `delete_inventory_item` | Remove an item from inventory | `itemId` | — |

### Pharmacy Management (4 tools)

| Tool | Description | Required Parameters | Optional Parameters |
|------|-------------|--------------------|--------------------|
| `get_pharmacy_stock` | Browse pharmacy medicine stock | — | `category`, `search` |
| `add_pharmacy_item` | Add a new medicine to the pharmacy | `name`, `category`, `manufacturer`, `batchNumber`, `expiryDate`, `unit`, `price`, `quantity` | — |
| `update_pharmacy_item` | Update a pharmacy medicine record | `itemId` | Any updatable fields |
| `record_pharmacy_transaction` | Record a stock movement | `itemId`, `type` (purchase/sale/return/expired/adjustment), `quantity` | `notes` |

### Patient & Appointment Management (11 tools)

| Tool | Description | Required Parameters | Optional Parameters |
|------|-------------|--------------------|--------------------|
| `get_patient_list` | View your associated patients | — | `search` |
| `get_patient_by_id` | Get full patient details (demographics, allergies, medical history) | `patientId` | — |
| `get_treated_patients` | Get list of patients with completed appointments | — | — |
| `get_schedule_summary` | Today's appointment schedule overview | — | — |
| `confirm_appointment` | Approve a pending appointment | `appointmentId` | — |
| `complete_appointment` | Mark an appointment as completed | `appointmentId` | — |
| `reject_appointment` | Decline an appointment | `appointmentId` | — |
| `reschedule_appointment_doctor` | Offer a new date/time to patient | `appointmentId`, `newDate`, `newTime` | — |
| `bulk_confirm_appointments` | Confirm ALL pending appointments at once | — | — |
| `get_doctor_reviews` | View patient ratings and written feedback | — | — |
| `get_doctor_stats` | Performance stats (completed count, average rating) | — | — |

### Clinical Tools (6 tools)

| Tool | Description | Required Parameters | Optional Parameters |
|------|-------------|--------------------|--------------------|
| `prescribe_medication` | Prescribe a medication to a patient | `patientId`, `name`, `dosage`, `frequency` | `instructions`, `duration` |
| `create_lab_report` | Create a lab report with test results | `patientId`, `testName`, `results` (array of `{parameter, value, unit, referenceRange}`) | — |
| `get_lab_reports` | View lab reports you've issued | — | `status` |
| `view_patient_records` | View a specific patient's medical records | `patientId` | — |
| `add_medical_record` | Create a medical record entry for a patient | `patientId`, `name`, `type`, `date` | — |
| `view_patient_health_metrics` | View a patient's health readings | `patientId` | — |

### Billing & Services (7 tools)

| Tool | Description | Required Parameters | Optional Parameters |
|------|-------------|--------------------|--------------------|
| `create_invoice` | Generate a patient invoice | `patientId`, `items` (array of `{description, quantity, rate}`) | — |
| `get_invoices` | View issued invoices | — | `status` (draft/sent/paid) |
| `mark_invoice_paid` | Mark an invoice as paid | `invoiceId` | — |
| `get_services` | View available billing services/procedures | — | — |
| `create_service` | Create a custom service entry | `name`, `category`, `defaultPrice` | — |
| `get_revenue_report` | Full revenue summary (total, monthly, pending, collection rate) | — | — |
| `get_billing_analytics` | Overdue invoices and aged receivables breakdown | — | — |

**Revenue Report Output Example:**

```json
{
  "totalInvoices": 42,
  "totalRevenue": 185000,
  "pendingAmount": 32000,
  "monthlyRevenue": 45200,
  "breakdown": { "paid": 35, "unpaid": 5, "draft": 2 },
  "collectionRate": "83%"
}
```

**Billing Analytics Output Example:**

```json
{
  "unpaidCount": 5,
  "overdueCount": 2,
  "totalUnpaidAmount": 32000,
  "overdueAmount": 18000,
  "overdue": [
    { "invoiceNumber": "INV-0019", "patient": "John", "amount": 10000, "daysPending": 45 }
  ]
}
```

### Compound Workflows — Doctor (5 tools)

| Tool | Description | What it chains internally |
|------|-------------|--------------------------|
| `morning_briefing` | ☀️ Ultimate daily opener | `getScheduleSummary` → `getLowStockAlerts` → `getExpiringItems` → `getRevenueReport` → `getBillingAnalytics` → `getDoctorStats` → `getDoctorReviews` |
| `daily_clinic_report` | Full daily report | `getScheduleSummary` → `getInventoryStats` → `getLowStockAlerts` → `getExpiringItems` |
| `pharmacy_audit` | Complete pharmacy audit | `getPharmacyStock` → expired items → expiring items → `getLowStockAlerts` → recommendations |
| `inventory_restock_report` | Restock recommendations | Scans all items → identifies out-of-stock → identifies critically low → assigns urgency tags |
| `complete_and_invoice` | Complete appointment + auto-bill | `completeAppointment` → `createInvoice` (2 steps, single tool) |

---

## Admin / Clinic Admin Tools (40+)

Admins inherit **all inventory & pharmacy tools** from the Doctor role, plus:

### Platform & User Management (10 tools)

| Tool | Description | Required Parameters | Optional Parameters |
|------|-------------|--------------------|--------------------|
| `get_platform_stats` | Platform-wide statistics (users, appointments, revenue) | — | — |
| `get_analytics` | Growth analytics (trends, signups, specialization distribution) | — | — |
| `get_user_list` | List all users across the platform | — | `role`, `search` |
| `get_patient_list` | List all patients | — | `search` |
| `get_patient_by_id` | Detailed patient info | `patientId` | — |
| `get_all_doctors` | All doctors with verification status | — | — |
| `get_pending_doctors` | Doctors awaiting admin approval | — | — |
| `verify_doctor` | Approve or reject a doctor registration | `userId`, `action` (approve/reject) | `reason` |
| `update_user` | Change user role or suspend/activate account | `userId` | `action` (suspend/activate), `role` |
| `delete_user` | Permanently delete a user | `userId` | — |

### Clinic Profile Management (2 tools)

| Tool | Description | Required Parameters | Optional Parameters |
|------|-------------|--------------------|--------------------|
| `get_clinic_profile` | View clinic name, address, contact info, UPI status | — | — |
| `update_clinic_profile` | Update clinic information | — (at least one field) | `clinicName`, `address`, `city`, `state`, `zipCode`, `phone`, `email`, `website`, `description`, `upiId` |

### Appointment Management (4 tools)

| Tool | Description | Required Parameters | Optional Parameters |
|------|-------------|--------------------|--------------------|
| `get_all_appointments` | View all clinic appointments | — | `status` |
| `get_schedule_summary` | Appointment overview for the clinic | — | — |
| `get_doctor_stats` | A specific doctor's performance | `doctorId` | — |
| `bulk_confirm_appointments` | Confirm ALL pending appointments at once | — | — |

### Billing & Revenue (3 tools)

| Tool | Description | Required Parameters | Optional Parameters |
|------|-------------|--------------------|--------------------|
| `get_invoices` | View all invoices across the platform | — | `status` |
| `get_revenue_report` | Full revenue summary (total, monthly, pending, collection rate) | — | — |
| `get_billing_analytics` | Overdue invoices and aged receivables | — | — |

### Communication (3 tools)

| Tool | Description | Required Parameters | Optional Parameters |
|------|-------------|--------------------|--------------------|
| `send_announcement` | Broadcast an announcement | `title`, `message` | `targetAudience` (all/patients/doctors), `priority` (low/medium/high) |
| `get_announcements` | View all announcements | — | — |
| `get_activity_logs` | View admin audit trail | — | `action`, `limit` |

### Compound Workflows — Admin (6 tools)

| Tool | Description | What it chains internally |
|------|-------------|--------------------------|
| `morning_briefing` | ☀️ Ultimate daily opener | `getScheduleSummary` → `getLowStockAlerts` → `getExpiringItems` → `getRevenueReport` → `getBillingAnalytics` → `getPlatformStats` → `getPendingDoctors` |
| `daily_clinic_report` | Full daily report | `getScheduleSummary` → `getInventoryStats` → `getLowStockAlerts` → `getExpiringItems` |
| `pharmacy_audit` | Complete pharmacy audit | stock check → expired → expiring → low stock → recommendations |
| `inventory_restock_report` | Restock recommendations | out-of-stock + critically low + urgency tags |
| `clinic_overview_report` | FULL platform dashboard | `getPlatformStats` → `getAnalytics` → `getAllDoctors` → `getPendingDoctors` → `getAllAppointments` → `getInventoryStats` → `getPharmacyStock` |
| `auto_verify_pending_doctors` | Batch-approve all pending doctors | `getPendingDoctors` → loops `verifyDoctor(approve)` for each |

---

## Shared Tools (3)

These tools are accessible to **all roles** (patient, doctor, admin):

| Tool | Description |
|------|-------------|
| `search_doctors` | Search doctors by specialization or name |
| `get_doctor_info` | Get detailed doctor profile |
| `view_announcements` | View clinic announcements |

---

# Part 2: Autonomous Automation

## Agentic Loop Architecture

The AI does not just answer questions — it **autonomously executes actions**. When a user sends a message, the system enters an iterative loop that allows the AI to chain multiple tool calls without human intervention.

### How the Loop Works

```
User Message
    │
    ▼
┌──────────────────────────────────┐
│  LLM receives message +         │
│  system prompt + tool list       │
│  + live database context         │
└──────────┬───────────────────────┘
           │
           ▼
    ┌──────────────┐
    │ LLM Decision │
    └──────┬───────┘
           │
     ┌─────┴─────┐
     │           │
  text       tool_call
     │           │
     ▼           ▼
  Return    ┌──────────────────────┐
  to user   │ executeToolCall()    │
            │ - Permission check   │
            │ - Parse arguments    │
            │ - Run tool function  │
            │ - Return result JSON │
            └──────────┬───────────┘
                       │
                       ▼
            ┌──────────────────────┐
            │ Feed result back to  │
            │ LLM as system msg    │
            └──────────┬───────────┘
                       │
                       ▼
              iteration < 8?
              ┌─────┴─────┐
              │           │
             YES          NO
              │           │
              ▼           ▼
         LLM decides    Force stop,
         next action    return last
              │         response
              │
        ┌─────┴─────┐
        │           │
     tool_call    text
        │           │
        ▼           ▼
     Loop back   Return final
     to execute  summary to user
```

### Key Implementation Details

- **File:** `controllers/aiChatController.js` → `exports.sendMessage`
- **Max iterations:** 8 tool calls per user message
- **Sequential execution:** One tool at a time (result feeds into next decision)
- **System injection:** After each tool result, a system message instructs the AI:

```
"If you need MORE data or actions to fully complete the user's request,
 call another tool NOW. Chain tools as needed — do NOT ask the user
 for permission between steps."
```

### Example: Multi-Step Autonomous Chain

**User says:** _"Check my pharmacy and restock what's needed"_

```
Iteration 1: LLM calls → pharmacy_audit
  └─ Result: 3 expired, 5 low stock, 2 expiring within 7 days
  └─ Fed back to LLM

Iteration 2: LLM sees low stock → calls → inventory_restock_report
  └─ Result: prioritized reorder list with urgency tags
  └─ Fed back to LLM

Iteration 3: LLM has all data → generates final markdown summary
  └─ Returns to user: combined audit + restock report with recommendations

Total tool calls: 2 (internally each compound tool ran 5-6 DB queries)
User interaction required: 0 (just the initial message)
```

---

## Compound Workflow Tools (9)

Compound tools are special tools that internally chain multiple simple tools in a single execution, eliminating the need for the AI to make multiple round-trips to the LLM.

### 1. `morning_briefing` ☀️

**The ultimate daily opener.** Aggregates everything a doctor or admin needs to start their day.

| Internal Sub-Tool | What it fetches |
|-------------------|----------------|
| `getScheduleSummary()` | Today's appointments, pending count |
| `getLowStockAlerts()` | Items below reorder level |
| `getExpiringItems({ days: 7 })` | Items expiring within 1 week |
| `getRevenueReport()` | Total revenue, monthly, pending, collection rate |
| `getBillingAnalytics()` | Overdue invoices, aged receivables |
| `getDoctorStats()` _(doctor only)_ | Completed count, average rating |
| `getDoctorReviews()` _(doctor only)_ | Recent patient reviews |
| `getPlatformStats()` _(admin only)_ | Total users, appointments, revenue |
| `getPendingDoctors()` _(admin only)_ | Doctors awaiting verification |

**Output includes urgent alerts:**

```
🔴 3 low stock items
🟡 5 items expiring within 7 days
🔴 2 overdue invoices
🟠 4 pending appointments
```

### 2. `daily_clinic_report`

| Sub-Tool | Data |
|----------|------|
| `getScheduleSummary()` | Appointment overview |
| `getInventoryStats()` | Item count, total value, low stock |
| `getLowStockAlerts()` | Critical stock items |
| `getExpiringItems()` | Expiring medicines |

### 3. `pharmacy_audit`

| Sub-Tool | Data |
|----------|------|
| `getPharmacyStock()` | Full stock snapshot |
| Expired filter | Items past expiry date |
| `getExpiringItems({ days: 30 })` | Expiring within 30 days |
| `getLowStockAlerts()` | Below reorder level |
| Recommendations engine | Auto-generated restock suggestions |

### 4. `inventory_restock_report`

| Sub-Tool | Data |
|----------|------|
| Full inventory scan | All items with quantity = 0 |
| Critical threshold scan | Items below 20% of reorder level |
| Urgency tagger | Tags: 🔴 CRITICAL / 🟡 LOW / 🟢 ADEQUATE |

### 5. `patient_health_summary`

| Sub-Tool | Data |
|----------|------|
| `viewMedications()` | Active prescriptions |
| `viewHealthMetrics()` | Latest vitals |
| `viewLabReports()` | Test results |
| `viewMedicalRecords()` | Full medical history |

### 6. `clinic_overview_report`

| Sub-Tool | Data |
|----------|------|
| `getPlatformStats()` | Users, appointments, revenue |
| `getAnalytics()` | Growth trends |
| `getAllDoctors()` | All doctors + verification status |
| `getPendingDoctors()` | Pending verifications |
| `getAllAppointments()` | Appointment status distribution |
| `getInventoryStats()` | Inventory overview |
| `getPharmacyStock()` | Medicine inventory |

### 7. `auto_verify_pending_doctors`

| Step | Action |
|------|--------|
| 1 | `getPendingDoctors()` → fetch all unverified doctors |
| 2 | Loop: `verifyDoctor({ action: 'approve' })` for each |
| 3 | Return summary with names, emails, specializations |

### 8. `complete_and_invoice`

| Step | Action |
|------|--------|
| 1 | `completeAppointment(appointmentId)` → mark appointment done |
| 2 | Retrieve `patientId` from appointment record |
| 3 | `createInvoice(patientId, items)` → auto-generate billing |

### 9. `get_revenue_report`

| Data Point | Source |
|------------|--------|
| Total revenue | Sum of all paid invoices |
| Monthly revenue | Paid invoices from current month only |
| Pending amount | Sum of all unpaid (sent) invoices |
| Collection rate | (paid / total) × 100% |
| Breakdown | Count by status (paid, unpaid, draft) |

---

## Background Cron Scheduler

### What It Does

The `autonomousCronJob.js` service runs as a **background process** that triggers AI actions without any human interaction. It is the only component that makes the system **truly autonomous**.

### Schedule

| Cron Expression | When | Action |
|----------------|------|--------|
| `0 8 * * *` | Every day at 8:00 AM | Run proactive morning briefings for all clinics |

### Execution Flow

```
⏰ 8:00 AM → Cron triggers
    │
    ▼
📋 Connect to Clinic Registry DB
    │
    ▼
🏥 Loop through each active clinic
    │
    ├── Connect to clinic's isolated database
    ├── Find all doctors + admins
    │
    ▼
👤 For each doctor/admin:
    │
    ├── 1. Create AI Chat session titled "☀️ Auto Briefing: 4/11/2026"
    ├── 2. Inject internal prompt: "Execute my full morning briefing"
    ├── 3. Send to LLM → LLM calls morning_briefing tool
    ├── 4. Execute tool → get schedule, stock, revenue, billing
    ├── 5. Feed results back to LLM → LLM formats beautiful summary
    ├── 6. Save AI response to the chat session in MongoDB
    │
    ▼
✅ When user opens AI Chat later, the briefing is already waiting for them
```

### Key Code: `autonomousCronJob.js`

```javascript
// Triggered by cron at 8 AM daily
cron.schedule('0 8 * * *', async () => {
    await runProactiveBriefings();
});

// The autonomous runner
const runProactiveBriefings = async () => {
    // 1. Get all active clinics from registry
    const activeClinics = await ClinicRegistry.find({ isActive: true });

    for (const clinic of activeClinics) {
        // 2. Connect to this clinic's isolated DB
        const tenantConn = await getClinicConnection(clinic.dbName);
        const models = getModels(tenantConn, clinic.dbName);
        
        // 3. Find all doctors and admins
        const targetUsers = await models.User.find({
            role: { $in: ['doctor', 'admin', 'clinic_admin'] }
        });

        for (const user of targetUsers) {
            // 4. Create a new chat session (proactive — no human input)
            const session = await models.AiChatSession.create({
                sessionId: uuidv4(),
                userId: user.id,
                title: `☀️ Auto Briefing: ${new Date().toLocaleDateString()}`,
                messages: [{ role: 'user', content: internalPrompt }]
            });

            // 5. Run the agentic loop (same engine as user-driven loop)
            //    LLM calls morning_briefing → tool executes → result formatted

            // 6. Save the AI's formatted response
            session.messages.push({
                role: 'assistant',
                content: aiResponse.content,
                toolsExecuted: allToolsExecuted
            });
            await session.save();
        }
    }
};
```

### Multi-Tenant Isolation

Each clinic has its own MongoDB database. The cron job respects this:

```
Clinic Registry DB
    │
    ├── Clinic "Apollo" → medbeacon_apollo_1234567890
    │       ├── Doctor A → gets own briefing
    │       └── Admin B  → gets own briefing
    │
    ├── Clinic "Care Plus" → medbeacon_careplus_9876543210
    │       ├── Doctor C → gets own briefing
    │       └── Doctor D → gets own briefing
    │
    └── Clinic "MedFirst" → medbeacon_medfirst_5555555555
            └── Admin E  → gets own briefing
```

### Server Initialization

The cron job starts automatically when the backend boots. In `index.js`:

```javascript
const { initAutonomy } = require("./services/autonomousCronJob");
initAutonomy();
// Console output: "🤖 Autonomous Agent Scheduler initialized."
```

---

## Permission Enforcement

Every tool call passes through a **permission gate** before execution. The system uses a role-based access control (RBAC) map defined in `aiChatController.js`.

### Permission Matrix

| Category | Patient | Doctor | Admin |
|----------|:-------:|:------:|:-----:|
| Book / View / Cancel appointments | ✅ | — | — |
| Rate appointments | ✅ | — | — |
| View own health data | ✅ | — | — |
| Add health metrics | ✅ | — | — |
| View / Pay invoices | ✅ | — | — |
| Patient health summary | ✅ | — | — |
| Search / Add / Edit / Delete inventory | — | ✅ | ✅ |
| Pharmacy CRUD + transactions | — | ✅ | ✅ |
| View patient list | — | ✅ | ✅ |
| Lookup patient by ID | — | ✅ | ✅ |
| View treated patients | — | ✅ | — |
| Confirm / Complete / Reject appointments | — | ✅ | ✅ |
| Bulk confirm appointments | — | ✅ | ✅ |
| Prescribe medications | — | ✅ | — |
| Create lab reports | — | ✅ | — |
| Add medical records | — | ✅ | — |
| Create invoices | — | ✅ | ✅ |
| Mark invoice paid | — | ✅ | — |
| Revenue report | — | ✅ | ✅ |
| Billing analytics | — | ✅ | ✅ |
| Complete + invoice combo | — | ✅ | — |
| Morning briefing | — | ✅ | ✅ |
| Daily clinic report | — | ✅ | ✅ |
| Pharmacy audit | — | ✅ | ✅ |
| Inventory restock report | — | ✅ | ✅ |
| Clinic profile management | — | — | ✅ |
| User management (CRUD) | — | — | ✅ |
| Doctor verification | — | — | ✅ |
| Platform stats / analytics | — | — | ✅ |
| Send announcements | — | — | ✅ |
| Activity logs | — | — | ✅ |
| Clinic overview report | — | — | ✅ |
| Auto-verify doctors | — | — | ✅ |

### How Permission Check Works

```javascript
// In executeToolCall():
const allowed = TOOL_PERMISSIONS[toolName];
if (!allowed || !allowed.includes(userRole)) {
    return { error: `Permission denied: ${toolName} is not available for ${userRole}` };
}
// Tool execution only reaches here if role is authorized
```

---

## System Prompt Engineering

The AI's behavior is controlled by a carefully designed system prompt injected into every LLM call. This prompt enforces autonomous, proactive behavior.

### Core Agentic Instructions

```
AGENTIC BEHAVIOR (IMPORTANT):
- You are an AUTONOMOUS AGENT. You can chain up to 8 tool calls in
  sequence WITHOUT asking the user between steps.
- For broad requests like "give me a report", use COMPOUND WORKFLOW TOOLS
  which gather all data in one call.
- For multi-step tasks, call the first tool, then AUTOMATICALLY call the
  next tool after getting results. Do NOT ask permission.
- When you receive tool results and the task needs more data, call
  another tool immediately.
- Only present the final summary to the user AFTER all tools have
  been executed.
- Prefer compound tools over individual tools when the user asks for
  something broad.
```

### Role-Specific Behavior Prompts

| Role | Behavior Instruction |
|------|---------------------|
| **Patient** | "You help patients with EVERYTHING — appointments, medications, health tracking, billing, records. You are their personal healthcare AI agent." |
| **Doctor** | "You are a powerful AI assistant that can automate virtually EVERYTHING a doctor needs. BE PROACTIVE: If you notice low stock while searching, mention it. If a patient has abnormal health metrics, flag it." |
| **Admin** | "You are a powerful AI agent with FULL control over the entire MedBeacon platform. BE PROACTIVE: Flag pending doctor verifications, low stock items, and appointment backlogs." |

### Database Context Injection

Before every LLM call, the system loads live database context and injects it into the prompt so the AI has real-time awareness:

| Data Injected | Source |
|---------------|--------|
| Doctor list (names, specializations, IDs, ratings) | `User` + `DoctorDetail` models |
| Inventory summary (total items, value, low stock count) | `InventoryItem` model |
| Pharmacy summary (total, low stock, expiring, expired) | `PharmacyItem` model |
| Platform stats (users, doctors, patients, appointments) | Aggregated from all models |

This gives the AI **real-time awareness** of the clinic's state before it even receives the user's message.

---

## File Reference

| File | Purpose |
|------|---------|
| `controllers/aiChatController.js` | Master tool executor, agentic loop, all 55+ tool functions, permission map, compound workflows |
| `services/ollamaService.js` | System prompts, tool definitions per role, LLM API communication, agentic behavior rules |
| `services/autonomousCronJob.js` | Background cron scheduler, proactive morning briefing generator |
| `services/dbContextLoader.js` | Loads live database context (inventory, pharmacy, stats) for prompt injection |
| `index.js` | Server entry point, initializes the autonomous cron job on boot |
| `config/clinicDb.js` | Multi-tenant clinic database connection manager |
| `models/factory.js` | Model factory for multi-tenant database isolation |
| `config/registry.js` | Clinic registry database connection |

---

> **Total tool count:** 55+ unique tools across 3 roles  
> **Compound workflows:** 9 multi-step autonomous tools  
> **Max autonomy depth:** 8 chained tool calls per user message  
> **Background automation:** Daily 8 AM cron job for proactive briefings  
> **Multi-tenant:** Each clinic gets isolated briefings from its own database
