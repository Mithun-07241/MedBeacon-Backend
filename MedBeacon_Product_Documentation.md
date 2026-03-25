# 🏥 MedBeacon — Comprehensive Product Documentation

> **Version:** 1.0 · **Stack:** React 19 + Node.js/Express + MongoDB + Socket.IO + WebRTC + Ollama AI  
> **Last Updated:** March 2026

---

## 📑 Table of Contents

1. [Product Overview](#1-product-overview)
2. [Why MedBeacon? — Benefits & Use Case](#2-why-medbeacon--benefits--use-case)
3. [Target Users & Roles](#3-target-users--roles)
4. [Core Features](#4-core-features)
5. [System Architecture](#5-system-architecture)
6. [Tech Stack](#6-tech-stack)
7. [Data Models](#7-data-models)
8. [API Reference](#8-api-reference)
9. [Real-Time Events (Socket.IO)](#9-real-time-events-socketio)
10. [Authentication & Security](#10-authentication--security)
11. [Pages & Routing](#11-pages--routing)
12. [Workflow Diagrams](#12-workflow-diagrams)
13. [Repository Structure](#13-repository-structure)
14. [Environment Variables](#14-environment-variables)
15. [Getting Started](#15-getting-started)
16. [Platform Builds](#16-platform-builds)
17. [Deployment](#17-deployment)
18. [Novelty & Differentiators](#18-novelty--differentiators)
19. [Conclusion](#19-conclusion)

---

## 1. Product Overview

**MedBeacon** is a full-stack, AI-powered healthcare SaaS platform that unifies patients, doctors, and clinic administrators on a single seamless ecosystem. It tackles fragmented healthcare workflows — from appointment booking and real-time telemedicine to pharmacy management and intelligent AI diagnostics — under one secure, multi-tenant roof.

| Repository | Purpose |
|---|---|
| `MedBeacon-Backend` | Node.js / Express REST API + Socket.IO real-time server |
| `medbeacon-frontend-deploy` | React 19 + Vite SPA — Web / PWA / Desktop / Android |

### Key Value Propositions

- **Zero fragmentation** — one platform for scheduling, communication, billing, pharmacy, and analytics
- **Real-time everything** — live chat, WebRTC video calls, instant payment detection
- **On-premises AI** — locally-hosted Ollama LLM for medical assistance with full data privacy
- **True multi-tenancy** — per-clinic database isolation at the Mongoose ODM layer
- **Cross-platform** — browser PWA, Windows/macOS/Linux desktop, and Android APK from the same React codebase

---

## 2. Why MedBeacon? — Benefits & Use Case

### 🔴 The Problem with Traditional Clinic Software

Most clinics today operate with a patchwork of disconnected tools:

- A separate app for scheduling, another for billing, another for messaging
- Phone calls to book/cancel appointments leading to miscommunication
- Paper prescriptions that get lost or misread
- No remote consultation option — patients must physically visit for every query
- Pharmacy stock tracked in spreadsheets with no low-stock intelligence
- Patient health data scattered across paper files, USBs, and email attachments
- Zero AI assistance — doctors manually sift through records before every consultation

**The result:** wasted hours, medical errors, billing leakage, frustrated patients, and burned-out staff.

---

### ✅ Why Choose MedBeacon

MedBeacon replaces all of this with **one unified, AI-powered platform** that works across every device and benefits every stakeholder.

---

### 👩‍⚕️ Benefits for Patients

| Benefit | How MedBeacon Delivers It |
|---|---|
| **Convenience** | Book appointments online 24/7 — no phone calls, no queues |
| **Stay Connected** | Real-time chat and video calls with your doctor from anywhere |
| **Understand Your Health** | Interactive health metrics dashboard with trend graphs (BP, glucose, weight, SpO₂) |
| **AI Health Assistant** | Get intelligent symptom analysis and health guidance any time of day |
| **Digital Records** | Access all your medical records, lab reports, prescriptions, and invoices in one place |
| **Never Miss a Follow-up** | Email and push notification reminders for upcoming appointments |
| **Transparent Billing** | View itemised invoices and pay digitally via UPI — no surprise charges |
| **Privacy First** | Data is isolated per clinic; AI runs locally with no cloud exposure |

---

### 🩺 Benefits for Doctors

| Benefit | How MedBeacon Delivers It |
|---|---|
| **Instant Patient Context** | AI assistant pre-loads patient history before consultations — no manual record hunting |
| **Streamlined Appointments** | Clear daily queue with status indicators; confirm/reschedule with one click |
| **Remote Consultations** | WebRTC video calls built right into the patient records view — no external app needed |
| **Faster Billing** | Generate professional invoices in seconds with auto-calculated totals and UPI QR |
| **Prescription Tracking** | Issue and track digital prescriptions per patient; cross-reference pharmacy stock |
| **Lab Reports** | Create and share lab reports using standardised templates — patients receive them instantly |
| **Less Admin Overhead** | Socket.IO real-time chat replaces back-and-forth phone tag with patients |
| **Work from Any Device** | Fully functional on desktop, mobile browser, and native Android/desktop apps |

---

### 🏥 Benefits for Clinic Admins

| Benefit | How MedBeacon Delivers It |
|---|---|
| **Complete Operational Control** | One dashboard for users, pharmacy, inventory, billing, and announcements |
| **Zero Revenue Leakage** | Every service is catalogued and billed; invoices tracked with draft → paid lifecycle |
| **Smart Pharmacy Management** | Auto-alerts for low stock and expiring medications; full dispense history |
| **Doctor Verification** | Built-in credential verification workflow with proof document review |
| **Real-Time Financial Visibility** | Payment status broadcasts instantly across all admin dashboards via WebSockets |
| **Announcements & Communication** | Broadcast clinic-wide messages to patients, doctors, or all users |
| **Data Isolation Guarantee** | Multi-tenant architecture ensures your clinic's data is never accessible to other clinics |
| **Audit Trail** | Every admin action is timestamped and logged; PHI access fully audited |

---

### 📊 MedBeacon vs. Traditional Systems

| Capability | Traditional Setup | MedBeacon |
|---|---|---|
| Appointment Booking | Phone call / paper book | Online, 24/7, instant confirmation |
| Doctor–Patient Communication | Phone calls | Real-time chat + WebRTC video |
| Medical Records | Paper files / USB drives | Secure cloud storage, instant access |
| AI Assistance | ❌ None | ✅ On-premises Ollama LLM with patient context |
| Billing | Manual invoice + cash | Auto-generated invoices, UPI QR, PDF export |
| Pharmacy Stock | Spreadsheet | Real-time stock tracking with auto-status |
| Lab Reports | Printed, handed to patient | Digital, templateised, downloadable |
| Push Notifications | ❌ None | ✅ Firebase FCM on all devices |
| Multi-Device Access | Desktop only | Web, PWA, Desktop app, Android APK |
| Data Security | File-level access control | JWT + RBAC + per-clinic DB isolation |
| Payment Detection | Manual reconciliation | Real-time WebSocket payment confirmation |

---

### 🌟 Top 10 Reasons to Use MedBeacon

1. **All-in-one platform** — eliminates the need for 5+ separate tools
2. **AI that knows your patient** — context-aware responses, not generic chatbot answers
3. **Built for real clinics** — multi-doctor, multi-patient, multi-role from day one
4. **Pay the way you want** — UPI, cash, or card all supported per invoice
5. **Works offline-capable** — PWA with Workbox service worker caching
6. **Runs on every device** — same code, same UI whether on Chrome, Windows app, or Android
7. **No cloud AI lock-in** — Ollama runs entirely on your server; your patient data never leaves
8. **Zero cross-clinic data leakage** — database-level tenant isolation, not just query filtering
9. **Scales with your clinic** — add doctors, patients, and services without changing infrastructure
10. **Open and extensible** — clean REST API and modular architecture ready for integrations

---

## 3. Target Users & Roles

MedBeacon supports **four distinct roles**, each with isolated dashboards and access controls.

| Role | Description | Key Capabilities |
|---|---|---|
| **Patient** | End-user seeking medical care | Book appointments, view records, chat with doctors, AI assistant, video calls, view invoices, track medications & health metrics |
| **Doctor** | Licensed medical professional | Manage appointments, view patient queue, generate prescriptions & reports, billing, real-time chat & video, lab reports |
| **Clinic Admin** | Operations manager of a clinic | Full clinic control — user management, pharmacy, inventory, announcements, billing oversight, analytics |
| **Super Admin** | Platform-level administrator | Cross-clinic oversight, doctor verification, platform-wide settings |

---

## 3. Core Features

### 3.1 Authentication & Onboarding

- **Email OTP Verification** — Users register with email; a time-limited OTP is sent via Gmail OAuth2 before the account is activated
- **JWT Sessions** — Stateless JSON Web Token authentication with `Authorization: Bearer <token>` header
- **bcrypt Password Hashing** — Passwords stored with 10 salt rounds
- **Role-Based Profile Setup** — After signup, patients and doctors complete role-specific profile forms (specialization, qualifications, DoB, blood group, etc.)
- **Doctor Verification Workflow** — Doctors upload medical license proof; admins verify/reject from the admin dashboard before the doctor can access clinical features
- **OTP Resend** — Users can request a new OTP if expired

---

### 3.2 Patient Dashboard

The patient-facing home screen gives a real-time snapshot of health activity:

- Upcoming appointments with status badges (pending / confirmed / completed / cancelled)
- Recent health metric readings (BP, glucose, weight, etc.)
- Quick-action buttons — Book Appointment, Chat with Doctor, Open AI Assistant
- AI-generated health tips panel
- Notification bell for alerts (appointment reminders, invoice status)

---

### 3.3 Doctor Dashboard

The doctor's command center:

- **Patient Queue** — ordered list of today's confirmed appointments
- **Appointment Stats** — total upcoming, completed this week, pending
- **Quick Billing** — fast-track invoice generation from the dashboard
- **Recent Activity** — last viewed patient records, latest messages
- **Availability Toggle** — doctors can set status to `available`, `busy`, or `unavailable`

---

### 3.4 Admin Dashboard

A comprehensive operations console with tabs for:

| Tab | Functionality |
|---|---|
| **Overview** | Real-time clinic KPIs — patient count, appointment volume, revenue |
| **User Management** | List, search, edit, deactivate patients and doctors |
| **Doctor Verification** | Review submitted proof documents, approve or reject |
| **Announcements** | Broadcast clinic-wide announcements to all users |
| **Activity Logs** | Timestamped audit trail of all admin actions |
| **Clinic Profile** | Edit clinic name, address, logo, contact info |
| **Support Tickets** | View and respond to internal help tickets |
| **Pharmacy** | Stock management, low-stock alerts, dispense tracking |
| **Inventory** | Clinic equipment and supply management |

---

### 3.5 Appointment System

Full lifecycle appointment management:

- **Booking Flow** — Patient selects a doctor from the directory, picks an available time slot, and confirms booking
- **Statuses** — `pending` → `confirmed` → `completed` / `cancelled`
- **Appointment Types** — `in-person` or `video` consultation
- **Doctor Availability** — Per-doctor configurable time slots
- **Notifications** — Email alerts (Gmail OAuth2) and Firebase FCM push on booking, confirmation, and reminder
- **Ratings** — Patients can rate completed appointments, feeding the doctor's rating score

---

### 3.6 Real-Time Chat

Persistent, real-time Doctor–Patient messaging:

- **Socket.IO** bi-directional channels with room-based isolation per conversation
- Messages saved to MongoDB immediately, ensuring persistence across sessions
- Conversation list sorted by latest message timestamp
- Online/offline presence indicators (tracked via `isOnline` + `lastSeen` on User model)
- Message types: text (extensible to file attachments via Cloudinary)
- UPI payment confirmation events broadcast through the same socket channel

---

### 3.7 Video Calls (WebRTC Telemedicine)

Enterprise-grade peer-to-peer video consultation:

| Step | Mechanism |
|---|---|
| Initiation | Patient/doctor clicks "Video Call"; `call:initiate` socket event fired |
| Receiver Online | `call:incoming` pushed to receiver's socket; ringing UI shown |
| Receiver Offline | Firebase FCM push notification sent to wake up the receiver's device |
| SDP Negotiation | `webrtc:offer` / `webrtc:answer` exchanged via signalling server |
| ICE Candidates | `webrtc:ice-candidate` relayed peer-to-peer through the server |
| Call End | `call:end` event; both peers disconnect WebRTC streams |

- Supports both **audio** and **video** call types
- `IncomingCallModal` component displays floating incoming call UX system-wide
- `CallContext` manages the global call state machine across all pages
- Call records stored in MongoDB (`Call` model) with `startTime`, `endTime`, `duration`

---

### 3.8 AI Medical Assistant (Ollama LLM)

A locally-hosted conversational AI powered by **Ollama + Llama 3.2**:

- **No external API dependency** — all inference stays on the clinic's server, ensuring full data privacy
- **DB Context Loader** — patient history, medications, and recent symptoms are injected into the LLM prompt context
- **Session Memory** — `memoryService` tracks conversation turns; users can switch between multiple saved sessions
- **Streaming Responses** — AI output streams token-by-token to the frontend for a real-time feel
- **Voice Interaction** — ElevenLabs React SDK integration for voice input/output on the AI chat page
- **Symptom Modal** — Users can quickly log symptoms that are pre-loaded as context for the AI
- Sessions list with title/date; individual sessions can be deleted

---

### 3.9 Billing & Invoicing

A full clinic billing workflow:

- **Invoice Creation** — Doctors build invoices with line items (services + medications), quantity, rate, and calculated amounts
- **Tax & Discount** — Optional `taxPercent` and `discountPercent` fields auto-compute subtotal/total
- **Invoice Statuses** — `draft` → `sent` → `paid` / `cancelled`
- **UPI QR Code Generation** — `qrcode.react` generates a scannable UPI QR code from the clinic's UPI ID
- **Real-Time Payment Detection** — When payment reference is submitted, a `payment_confirmed` Socket.IO event broadcasts to all connected admin dashboards instantly
- **PDF Export** — `jsPDF` generates a professional A4 invoice PDF downloadable by the patient or doctor
- **Payment Methods** — cash, UPI, or card tracked per invoice
- **Patient Invoice View** — Patients have a dedicated `/my-invoices` page showing all their invoices with status

---

### 3.10 Pharmacy Management

A complete in-clinic pharmacy stock system:

| Field | Details |
|---|---|
| **Drug Categories** | Antibiotics, Pain Relief, Vitamins, Cardiovascular, Diabetes, Respiratory, Gastrointestinal, Dermatology, Neurology, Other |
| **Stock Units** | tablets, capsules, ml, bottles, boxes, vials, tubes, sachets |
| **Auto Status** | Pre-save hook auto-sets status: `in_stock` / `low_stock` / `out_of_stock` / `expired` |
| **Reorder Level** | Configurable threshold; drops below it → `low_stock` alert |
| **Expiry Tracking** | Items past `expiryDate` automatically marked `expired` |
| **Dispense Tracking** | `PharmacyTransaction` records every dispense with quantity, patient, and doctor reference |
| **Low-Stock Alerts** | FCM push + in-app alert to admins when stock hits reorder threshold |

---

### 3.11 Inventory Management

Separate from pharmacy, the inventory module tracks clinic equipment and non-pharmaceutical supplies:

- Add / update / delete inventory items with name, category, quantity, and unit cost
- Searchable and filterable item list
- Stock count adjustments logged with timestamps

---

### 3.12 Medical Records

Secure patient medical file management:

- Doctors and patients can **upload** files (images, PDFs, lab results) via Cloudinary
- Records indexed by patient ID for fast retrieval
- Access controlled — only the patient and their treating doctor(s) can view records
- Records displayed in a clean timeline UI on the `MedicalRecords` page

---

### 3.13 Lab Reports

Dedicated lab report module (most recently added feature):

- Clinic staff create lab reports for patients using **pre-built templates** (CBC, LFT, KFT, lipid profile, etc.)
- Multi-step report creation modal: select template → fill test results → review → submit
- Reports stored server-side (`labReportController`) and viewable by patients on `/patient-lab-reports`
- Patients can download/view their lab report PDFs

---

### 3.14 Medications (Prescriptions)

Digital prescription tracking per patient:

- Doctors issue prescriptions with drug name, dosage, frequency, duration, and notes
- Medications list per patient with active/completed status
- Patients view current medications on their `/medications` page
- Integrates with pharmacy stock — dispensed drugs can cross-reference available pharmacy items

---

### 3.15 Health Metrics

Patients and doctors can log and track vital health data:

- Supported vitals: blood pressure, heart rate, glucose level, weight, BMI, temperature, SpO₂
- Chronological log stored in `HealthMetric` model
- Interactive Recharts-powered graphs on the `/health-metrics` page showing trends over time
- Abnormal readings flagged with visual alerts

---

### 3.16 Reports

Doctor-generated clinical reports per patient:

- Free-form clinical notes compiled into a structured `Report` document
- Linked to a patient ID and appointment
- Exportable as PDF via `jsPDF`

---

### 3.17 Support Tickets

Internal helpdesk system:

- Any user can raise a support ticket (category: technical, billing, clinical, or other)
- Tickets stored in `Ticket` model with `open` / `in_progress` / `resolved` statuses
- Admins view and manage all tickets from the admin dashboard

---

### 3.18 Push Notifications & Email Alerts

Multi-channel notification system:

| Channel | Technology | Events |
|---|---|---|
| **Push Notifications** | Firebase Cloud Messaging (FCM) | Appointment reminders, incoming calls (offline), low stock alerts, billing updates |
| **Email** | Nodemailer + Gmail OAuth2 | OTP verification, appointment confirmation, invoice dispatch, announcements |
| **In-App Alerts** | `Alert` model + NotificationContext | Real-time alerts within the app (new message, call incoming, payment status) |

Users can configure email notification preferences per event type on the `/settings` page.

---

### 3.19 Bluetooth Device Connectivity

Native Bluetooth integration (Tauri platforms only):

- `/bluetooth-devices` page lists available BT health peripherals
- Connect to BLE health monitors (e.g., glucometers, BP monitors)
- Readings auto-populated into Health Metrics
- `BluetoothContext` manages connection state across the app
- Falls back gracefully on web (feature hidden/disabled)

---

### 3.20 Clinic Management & Multi-Tenancy

Complete clinic setup and isolation:

- **Clinic Setup Wizard** — `ClinicSetup` page guides admins through clinic profile configuration (name, address, logo, UPI ID, specialties)
- **Clinic Profile** — Rich profile page with analytics, service catalog, and doctor roster
- **Service Catalog** — Admins define billable services (e.g., consultation, ECG, X-ray) with prices; these populate invoice line items
- **Multi-Tenant DB** — `clinicDb` middleware dynamically switches the Mongoose connection to a per-clinic database on every authenticated request, guaranteeing zero cross-clinic data leakage

---

### 3.21 Settings & Personalization

- **Theme Toggle** — Dark / Light mode with persistent preference (ThemeContext)
- **Email Preferences** — Granular on/off toggles per notification event
- **Per-User Settings** — Stored in `Settings` model per user
- **Profile Management** — Comprehensive profile edit pages for both doctors (`DProfile`) and patients (`PatientProfile`) with profile picture cropping via `ImageCropper`

---

## 4. System Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                            │
│   Web (Vercel/PWA)  │  Desktop (Tauri)  │  Android (Tauri)    │
│                    React 19 + Vite 6                           │
└──────────────────────┬─────────────────────────────┬──────────┘
                       │  REST API (HTTPS)            │  WebSocket (WSS)
                       ▼                             ▼
┌────────────────────────────────────────────────────────────────┐
│                      BACKEND SERVER                            │
│           Node.js 18+ / Express.js 4 + Socket.IO 4             │
│  ┌────────┐ ┌─────────┐ ┌──────────┐ ┌────────────────────┐  │
│  │  Auth  │ │ Routes  │ │Middleware│ │  Socket Handlers   │  │
│  │  JWT   │ │ 21 mods │ │clinicDb  │ │  Chat + WebRTC     │  │
│  └────────┘ └─────────┘ └──────────┘ └────────────────────┘  │
└──────────────────────────┬─────────────────────────────────────┘
                           │
          ┌────────────────┼───────────────────┐
          ▼                ▼                   ▼
   ┌────────────┐   ┌────────────┐   ┌─────────────────────┐
   │  MongoDB   │   │ Cloudinary │   │  External Services  │
   │ Main DB +  │   │ (medical   │   │  • Firebase FCM     │
   │ Per-Clinic │   │  files)    │   │  • Ollama AI LLM    │
   │ Tenant DB  │   └────────────┘   │  • Nodemailer/Gmail │
   └────────────┘                   └─────────────────────┘
```

### Multi-Tenant Flow

```
Request → JWT Decode → Extract clinicId
       → clinicDb middleware → switch Mongoose connection
       → queries isolated to clinic-specific MongoDB database
       → response returned
```

---

## 5. Tech Stack

### Backend

| Layer | Technology | Version |
|---|---|---|
| Runtime | Node.js | 18+ |
| Framework | Express.js | 4.x |
| Database | MongoDB + Mongoose ODM | 7.x |
| Real-Time | Socket.IO | 4.x |
| Authentication | jsonwebtoken + bcryptjs | — |
| File Storage | Cloudinary | — |
| AI Engine | Ollama (llama3.2) | — |
| Push Notifications | Firebase Admin SDK | — |
| Email | Nodemailer (Gmail OAuth2) | — |
| Validation | Zod | 3.x |
| Security | Helmet, CORS, Rate Limiter | — |
| Logging | Morgan | — |
| Deployment | Render.com | — |

### Frontend

| Layer | Technology | Version |
|---|---|---|
| Framework | React | 19 |
| Build Tool | Vite | 6 |
| Styling | TailwindCSS + CSS Variables | v4 |
| UI Components | Radix UI primitives (52) / shadcn/ui | — |
| Routing | Wouter | 3.x |
| Server State | TanStack Query | v5 |
| Forms | React Hook Form + Zod | — |
| Real-Time | Socket.IO Client | 4.x |
| Animation | Framer Motion | — |
| Charts | Recharts | — |
| PDF Export | jsPDF | — |
| QR Codes | qrcode.react | — |
| AI Voice | ElevenLabs React SDK | — |
| Native App | Tauri | v2 |
| PWA | vite-plugin-pwa + Workbox | — |
| Deployment | Vercel | — |

---

## 6. Data Models

### User

```
_id, id (UUID), name, email, password (bcrypt), role (patient|doctor|admin|clinic_admin),
clinicId, isVerified, isProfileComplete, isOnline, lastSeen, fcmToken, profilePhoto
```

### DoctorDetail

```
userId, firstName, lastName, dateOfBirth, phoneNumber, address,
medicalLicense, specialization, hospitalAffiliation, hospital,
proofFileUrl, profilePicUrl, experience, gender, bio,
education, graduationYear, certifications, languages,
availability (available|busy|unavailable), expertise[],
verificationStatus (pending|verified|rejected)
```

### PatientDetail

```
userId, dateOfBirth, gender, bloodGroup, address,
emergencyContact, allergies, chronicConditions
```

### Appointment

```
patientId, doctorId, date, timeSlot,
status (pending|confirmed|completed|cancelled),
type (in-person|video), notes, rating
```

### Invoice

```
id, invoiceNumber, doctorId, patientId, appointmentId,
items[{description, quantity, rate, amount}],
subtotal, taxPercent, discountPercent, tax, discount, total,
status (draft|sent|paid|cancelled), dueDate, paidDate,
notes, upiId, paymentRef, paymentRefSubmittedAt
```

### PharmacyItem

```
id, name, category (Antibiotics|Pain Relief|Vitamins|Cardiovascular|Diabetes|
Respiratory|Gastrointestinal|Dermatology|Neurology|Other),
description, manufacturer, batchNumber, expiryDate,
quantity, unit (tablets|capsules|ml|bottles|boxes|vials|tubes|sachets),
price, reorderLevel, location,
status (in_stock|low_stock|out_of_stock|expired)  ← auto-computed pre-save
```

### InventoryItem

```
id, name, category, description, quantity, unit, costPerUnit,
supplier, purchaseDate, location, status
```

### AiChatSession

```
userId, title, model, messages[{role, content, timestamp}], createdAt
```

### AiConversation (memory)

```
sessionId, userId, role (user|assistant), content, timestamp
```

### Call

```
callId, callerId, receiverId, callType (audio|video),
status (initiated|ringing|active|ended|rejected|missed),
startTime, endTime, duration
```

### Conversation & Message (Chat)

```
Conversation: participants[], lastMessage, lastMessageAt, clinicId
Message: conversationId, senderId, content, createdAt
```

### MedicalRecord

```
patientId, doctorId, fileUrl, fileName, fileType, description, uploadedAt
```

### Medication (Prescription)

```
patientId, doctorId, drugName, dosage, frequency, duration, notes, status (active|completed)
```

### HealthMetric

```
patientId, type (bp|glucose|weight|heartRate|temperature|spo2|bmi),
value, unit, recordedAt, notes
```

### Report

```
patientId, doctorId, appointmentId, title, content, createdAt
```

### ClinicProfile

```
clinicId, name, address, phone, email, logo, specialties[],
upiId, registrationNumber, description, workingHours
```

### ServiceItem

```
clinicId, name, description, price, category, isActive
```

### Ticket

```
userId, subject, description, category, status (open|in_progress|resolved), createdAt
```

### Announcement

```
clinicId, title, content, authorId, targetRole (all|patient|doctor), createdAt
```

### ActivityLog

```
userId, clinicId, action, entity, entityId, details, ipAddress, timestamp
```

### EmailPreference

```
userId, appointmentReminders, billingUpdates, announcements, systemAlerts
```

### Settings

```
userId, theme (light|dark), language, timezone, notificationsEnabled
```

### Symptom & Alert

```
Symptom: userId, description, severity, recordedAt
Alert: userId, clinicId, type, message, isRead, createdAt
```

### PhiAuditLog (HIPAA compliance)

```
userId, clinicId, action, resourceType, resourceId, accessedData, timestamp, ipAddress
```

---

## 7. API Reference

All routes prefixed with `/api`. Auth routes also apply a strict rate limiter.

### 🔐 Authentication

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/signup` | Public | Register new user (sends OTP) |
| `POST` | `/login` | Public | Authenticate user, return JWT |
| `POST` | `/verify-email` | Public | Submit OTP to activate account |
| `POST` | `/resend-otp` | Public | Re-send OTP email |
| `GET` | `/me` | 🔒 JWT | Get current authenticated user |
| `POST` | `/logout` | 🔒 JWT | Invalidate session |

### 👤 Users

| Method | Endpoint | Description |
|---|---|---|
| `GET/PUT` | `/profile` | Own profile read/update |
| `GET` | `/doctors` | List all doctors in clinic |
| `GET` | `/patients` | List all patients |
| `GET` | `/doctors/:id` | Doctor profile detail |
| `GET` | `/patients/:id` | Patient profile detail |

### 📅 Appointments — `/api/appointments`

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/` | Book new appointment |
| `GET` | `/` | List appointments (role-filtered) |
| `PUT` | `/:id` | Update appointment (status, notes) |
| `DELETE` | `/:id` | Cancel appointment |

### 💬 Chat — `/api/chat`

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/conversations` | List user's conversations |
| `GET` | `/messages/:conversationId` | Fetch messages in a conversation |
| `POST` | `/messages` | Send a message (also fires socket event) |

### 💰 Billing — `/api/billing`

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/invoices` | Create invoice |
| `GET` | `/invoices` | List invoices (role-filtered) |
| `GET` | `/invoices/:id` | Invoice detail |
| `PUT` | `/invoices/:id` | Update invoice |
| `PUT` | `/invoices/:id/pay` | Mark invoice as paid |

### 🤖 AI Chat — `/api/ai-chat`

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/message` | Send message to Ollama AI |
| `GET` | `/sessions` | List AI chat sessions |
| `GET` | `/sessions/:id` | Get messages in a session |
| `DELETE` | `/sessions/:id` | Delete a session |

### 💊 Pharmacy — `/api/pharmacy`

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/stock` | List pharmacy items |
| `POST` | `/stock` | Add new item |
| `PUT` | `/:id` | Update item |
| `DELETE` | `/:id` | Remove item |
| `POST` | `/dispense` | Record a dispense transaction |

### 📦 Inventory — `/api/inventory`

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | List inventory items |
| `POST` | `/` | Add item |
| `PUT` | `/:id` | Update item |
| `DELETE` | `/:id` | Remove item |

### 🏥 Clinic — `/api/clinic`

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/profile` | Get clinic profile |
| `POST` | `/profile` | Create clinic profile (admin) |
| `PUT` | `/profile` | Update clinic profile (admin) |

### 🧪 Lab Reports — `/api/lab-reports`

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/` | Create lab report |
| `GET` | `/` | List lab reports |
| `GET` | `/:id` | Full report detail |
| `PUT` | `/:id` | Update lab report |

### Other Modules

| Prefix | Module |
|---|---|
| `/api/admin` | User management, announcements, verification, activity logs |
| `/api/medications` | Prescription CRUD |
| `/api/records` | Medical record upload/retrieval (Cloudinary) |
| `/api/metrics` | Health vitals logging |
| `/api/calls` | Call history management |
| `/api/reports` | Doctor-generated clinical reports |
| `/api/tickets` | Support ticket system |
| `/api/settings` | Per-user settings |
| `/api/fcm` | Firebase FCM token registration |
| `/api/email-preferences` | Email notification preferences |
| `/api/services` | Clinic service catalog |
| `/api/symptoms` | Symptom logging |
| `/health` | Health check endpoint |

---

## 8. Real-Time Events (Socket.IO)

### Chat Events

| Event | Direction | Description |
|---|---|---|
| `join` | Client → Server | Join a conversation room |
| `send_message` | Client → Server | Send a message |
| `receive_message` | Server → Client | New message broadcast |
| `payment_confirmed` | Server → Client | UPI payment status broadcast |

### Video Call Events (WebRTC Signalling)

| Event | Direction | Description |
|---|---|---|
| `register` | Client → Server | Associate userId with socket |
| `registered` | Server → Client | Confirm registration |
| `call:initiate` | Client → Server | Start a call |
| `call:incoming` | Server → Client | Notify callee of incoming call |
| `call:ringing` | Server → Client | Confirm receiver is being rang |
| `call:accept` | Client → Server | Callee accepts |
| `call:accepted` | Server → Client | Notify caller of acceptance |
| `call:reject` | Client → Server | Callee rejects |
| `call:rejected` | Server → Client | Notify caller of rejection |
| `call:end` | Client → Server | End active call |
| `call:ended` | Server → Client | Notify peer call ended |
| `call:receiver-offline` | Server → Client | Receiver not connected (FCM used) |
| `webrtc:offer` | Client ↔ Server | SDP offer relay |
| `webrtc:answer` | Client ↔ Server | SDP answer relay |
| `webrtc:ice-candidate` | Client ↔ Server | ICE candidate relay |

### Presence Events

| Event | Mechanism |
|---|---|
| User connects | `isOnline: true`, `lastSeen` updated in MongoDB |
| User disconnects | `isOnline: false`, `lastSeen` updated in MongoDB |

---

## 9. Authentication & Security

### Authentication Flow

```
1. POST /api/signup → creates unverified user, sends OTP email
2. POST /api/verify-email → activates account
3. POST /api/login → returns JWT (signed with JWT_SECRET)
4. All protected requests → Authorization: Bearer <token>
5. auth.js middleware → verifies JWT, attaches user to req
6. clinicDb middleware → switches DB connection per clinicId
```

### Security Measures

| Layer | Implementation |
|---|---|
| **Password Hashing** | bcryptjs — 10 salt rounds |
| **JWT** | HS256 signing; short expiry configurable |
| **Rate Limiting** | Global: 200 req/15 min; Auth endpoints: strict limiter |
| **Helmet** | HSTS (1-year), CSP, X-Frame-Options, Referrer-Policy |
| **CORS** | Allowlist-only origins; rejects unlisted hosts |
| **Payload Limit** | 10 MB max request body |
| **Input Validation** | Zod schemas on all write endpoints |
| **Activity Logging** | Every admin action auto-logged via `activityLogger` middleware |
| **PHI Audit Log** | `PhiAuditLog` model records access to protected health information |
| **Encrypted Env** | `.env.enc` AES-256-CBC encryption support for production secrets |
| **Multi-Tenant Isolation** | `clinicDb` middleware prevents cross-clinic data access |

---

## 10. Pages & Routing

### Public Routes

| Path | Page | Purpose |
|---|---|---|
| `/` | `Landing` | Marketing landing page |
| `/login` | `LoginPage` | Credential login |
| `/signup` | `SignUp` | Registration form |
| `/verify-email` | `VerifyEmail` | OTP input |
| `/privacy-policy` | `PrivacyPolicy` | Legal privacy page |
| `/terms-and-conditions` | `TermsAndConditions` | Terms of service |

### Patient Routes (🔒 role: patient)

| Path | Page |
|---|---|
| `/patient-dashboard` | `PatientDashboard` |
| `/appointments` | `AllAppointments` |
| `/appointments/book` | `BookAppointments` |
| `/doctors-list` | `DoctorsList` |
| `/medications` | `Medications` |
| `/medical-records` | `MedicalRecords` |
| `/health-metrics` | `HealthMetrics` |
| `/my-invoices` | `PatientInvoices` |
| `/patient-lab-reports` | `PatientLabReports` |

### Doctor Routes (🔒 role: doctor)

| Path | Page |
|---|---|
| `/doctor-dashboard` | `DoctorDashboard` |
| `/doctor/appointments` | `DoctorAppointments` |
| `/patients-list` | `PatientsList` |
| `/billing` | `Billing` |
| `/reports` | `Reports` |
| `/lab-reports` | `LabReports` |

### Admin Routes (🔒 role: admin / clinic_admin)

| Path | Page |
|---|---|
| `/admin` | `AdminDashboard` |
| `/clinic-setup` | `ClinicSetup` |
| `/clinic-profile` | `ClinicProfile` |

### Shared Protected Routes

| Path | Page |
|---|---|
| `/profile` | `DProfile` / `PatientProfile` (role-aware) |
| `/profile/setup` | `ProfileSetup` |
| `/doctors/:id` | `DoctorProfile` |
| `/patients/:id` | `PtProfile` |
| `/treatment-file/:id` | `TreatmentFile` |
| `/messages` | `ChatPage` (conversation list) |
| `/chat/:id` | `ChatPage` (active chat) |
| `/ai` | `AiChat` |
| `/call/:id` | `ActiveCall` |
| `/bluetooth-devices` | `BluetoothDevices` |
| `/settings` | `Settings` |
| `/help` | `Help` |
| `/pharmacy` | `PharmacyStock` |

---

## 11. Workflow Diagrams

### Patient Appointment Booking Workflow

```mermaid
flowchart TD
    A([Patient Logs In]) --> B[Browse Doctors List]
    B --> C[Select Doctor & Date]
    C --> D{Slot Available?}
    D -- No --> C
    D -- Yes --> E[Confirm Booking]
    E --> F[POST /api/appointments]
    F --> G[Email Alert Sent to Doctor]
    G --> H[FCM Push Notification]
    H --> I[Doctor Confirms → Status: confirmed]
    I --> J[Patient Notified]
    J --> K{Appointment Type?}
    K -- In-Person --> L[Patient Visits Clinic]
    K -- Video --> M[Video Call Initiated via WebRTC]
    L & M --> N[Doctor Creates Invoice]
    N --> O[UPI QR / Cash Payment]
    O --> P[Invoice Marked Paid]
    P --> Q[Patient Rates Appointment]
```

### Real-Time Video Call Flow

```mermaid
sequenceDiagram
    participant C as Caller (Doctor/Patient)
    participant S as Socket.IO Server
    participant R as Receiver

    C->>S: call:initiate {callId, receiverId, callType}
    alt Receiver Online
        S->>R: call:incoming {callId, callerName}
        S->>C: call:ringing
        R->>S: call:accept {callId, callerId}
        S->>C: call:accepted
        C->>S: webrtc:offer {offer, receiverId}
        S->>R: webrtc:offer
        R->>S: webrtc:answer {answer, callerId}
        S->>C: webrtc:answer
        C->>S: webrtc:ice-candidate
        S->>R: webrtc:ice-candidate
        Note over C,R: P2P WebRTC stream established
        C->>S: call:end
        S->>R: call:ended
    else Receiver Offline
        S->>Firebase: sendCallNotification (FCM)
        S->>C: call:receiver-offline
    end
```

### Billing & UPI Payment Workflow

```mermaid
flowchart LR
    Doctor --> CreateInvoice[Create Invoice with line items]
    CreateInvoice --> GenerateQR[Generate UPI QR Code]
    GenerateQR --> PatientScans[Patient Scans QR]
    PatientScans --> UPIPayment[UPI Payment Completed]
    UPIPayment --> SubmitRef[Patient submits payment reference]
    SubmitRef --> Backend[Backend verifies & updates invoice]
    Backend --> SocketBroadcast[payment_confirmed socket event]
    SocketBroadcast --> AdminDash[Admin dashboard updates live]
    SocketBroadcast --> PDF[Patient downloads PDF invoice]
```

### AI Medical Assistant Workflow

```mermaid
flowchart TD
    User[Patient or Doctor] --> Input[Types health query or symptoms]
    Input --> DBContext[DB Context Loader fetches patient history]
    DBContext --> Prompt[Enriched prompt assembled]
    Prompt --> Ollama[Ollama llama3.2 inference engine]
    Ollama --> Stream[Streaming token response]
    Stream --> UI[Frontend displays response live]
    UI --> Memory[memoryService stores conversation turn]
    Memory --> NextTurn[Next user turn uses full context]
```

### Multi-Tenant DB Routing

```mermaid
flowchart LR
    Request --> JWTVerify[JWT Auth Middleware]
    JWTVerify --> ExtractClinic[Extract clinicId from token]
    ExtractClinic --> ClinicDbMW[clinicDb Middleware]
    ClinicDbMW --> SwitchConn[Switch Mongoose to clinic DB]
    SwitchConn --> ClinicA[(Clinic A Database)]
    SwitchConn --> ClinicB[(Clinic B Database)]
    SwitchConn --> ClinicN[(Clinic N Database)]
```

---

## 12. Repository Structure

### Backend (`MedBeacon-Backend/`)

```
MedBeacon-Backend/
├── index.js                    # App entry: route mounting, Socket.IO init, Helmet/CORS/rate-limiter
├── socketServer.js             # WebRTC call signalling + online presence handlers
├── render.yaml                 # Render.com deployment config
├── config/
│   ├── db.js                   # Main MongoDB connection
│   ├── clinicDb.js             # Per-clinic dynamic DB switcher
│   └── registry.js             # Clinic registry cache
├── controllers/                # 22 business logic modules
│   ├── authController.js       # Signup, login, OTP, JWT
│   ├── userController.js       # Profile CRUD, doctor/patient lists
│   ├── appointmentController.js
│   ├── billingController.js    # Invoices, UPI payment
│   ├── aiChatController.js     # Ollama AI session management + streaming
│   ├── adminController.js      # User mgmt, verification, announcements
│   ├── pharmacyController.js   # Stock CRUD + dispense
│   ├── inventoryController.js
│   ├── chatController.js
│   ├── callController.js
│   ├── clinicController.js
│   ├── labReportController.js
│   ├── medicationController.js
│   ├── medicalRecordController.js
│   ├── healthMetricsController.js
│   ├── reportController.js
│   ├── ticketController.js
│   ├── serviceController.js
│   ├── settingsController.js
│   ├── emailPreferenceController.js
│   ├── fcmController.js
│   └── dataController.js
├── models/                     # 28 Mongoose schemas
│   ├── User.js, DoctorDetail.js, PatientDetail.js
│   ├── Appointment.js, Invoice.js
│   ├── Conversation.js, Message.js
│   ├── Call.js, AiChatSession.js, AiConversation.js
│   ├── PharmacyItem.js, PharmacyTransaction.js
│   ├── InventoryItem.js, ServiceItem.js
│   ├── MedicalRecord.js, Medication.js
│   ├── HealthMetric.js, Report.js
│   ├── Ticket.js, Alert.js, Announcement.js
│   ├── ActivityLog.js, PhiAuditLog.js
│   ├── EmailPreference.js, Settings.js
│   ├── ClinicProfile.js, Symptom.js
│   └── factory.js              # Multi-tenant model factory
├── middleware/
│   ├── auth.js                 # JWT verification
│   ├── adminMiddleware.js      # Admin-only guard
│   ├── clinicDb.js             # Per-clinic DB switcher
│   ├── upload.js               # Multer + Cloudinary handler
│   ├── activityLogger.js       # Auto activity logging
│   └── rateLimiter.js          # express-rate-limit config
├── routes/                     # 21 Express Router files
├── services/
│   ├── ollamaService.js        # Ollama LLM chat + streaming interface
│   ├── memoryService.js        # AI conversation memory management
│   ├── dbContextLoader.js      # Patient context injection for AI prompts
│   └── pushNotificationService.js  # Firebase FCM dispatcher
└── utils/
    └── socket.js               # Socket.IO init + chat event handlers
```

### Frontend (`medbeacon-frontend-deploy/src/`)

```
src/
├── App.jsx                     # Root: providers stack + Wouter router
├── main.jsx                    # ReactDOM.createRoot entry
├── index.css                   # Global styles + Tailwind v4 directives
├── pages/                      # 43 page components
│   ├── Landing.jsx             # Public marketing page
│   ├── LoginPage.jsx / SignUp.jsx / VerifyEmail.jsx
│   ├── PatientDashboard.jsx / DoctorDashboard.jsx / AdminDashboard.jsx
│   ├── AllAppointments.jsx / BookAppointments.jsx / DoctorAppointments.jsx
│   ├── ChatPage.jsx            # Real-time chat + conversation list
│   ├── ActiveCall.jsx          # WebRTC video call UI
│   ├── AiChat.jsx              # Ollama AI chat interface
│   ├── Billing.jsx / PatientInvoices.jsx
│   ├── PharmacyStock.jsx
│   ├── Medications.jsx / MedicalRecords.jsx / HealthMetrics.jsx
│   ├── LabReports.jsx / PatientLabReports.jsx
│   ├── Reports.jsx
│   ├── DoctorProfile.jsx / DProfile.jsx / PatientProfile.jsx / PtProfile.jsx
│   ├── ClinicSetup.jsx / ClinicProfile.jsx
│   ├── BluetoothDevices.jsx / Settings.jsx / Help.jsx
│   ├── TreatmentFile.jsx / doctorList.jsx / patientList.jsx
│   └── ProtectedRoute.jsx      # Role-based access gate
├── components/
│   ├── ui/                     # 52 Radix UI primitives (shadcn/ui pattern)
│   ├── layout/                 # Sidebar, Topbar navigation
│   ├── billing/                # Invoice forms, payment modal, QR display
│   ├── chat/                   # Message bubbles, conversation list
│   ├── pharmacy/               # Stock table, dispense modal
│   ├── inventory/              # Inventory table
│   ├── admin/                  # Admin-specific panels
│   ├── IncomingCallModal.jsx   # Floating incoming call overlay
│   ├── CallManager.jsx         # Global call lifecycle manager
│   ├── FloatingAiButton.jsx    # Persistent AI chat launcher
│   ├── SymptomModal.jsx        # Quick symptom logger
│   ├── VoiceModal.jsx          # Voice input for AI
│   ├── RatingModal.jsx         # Post-appointment rating
│   ├── ImageCropper.jsx        # Profile picture crop tool
│   └── ThemeToggle.jsx         # Dark/light switch
├── context/
│   ├── AuthContext.jsx         # JWT session, user role, login/logout
│   ├── ThemeContext.jsx        # Dark/light mode
│   ├── NotificationContext.jsx # In-app alert state
│   ├── CallContext.jsx         # Global WebRTC call state machine
│   └── BluetoothContext.jsx    # BLE device connection state
├── hooks/                      # Custom React hooks
├── lib/
│   ├── queryClient.js          # TanStack Query client configuration
│   └── utils.js                # cn() and utility helpers
├── services/
│   └── api.js                  # Centralized API fetch wrapper
└── utils/
    ├── platform.js             # Web / Tauri / Android platform detection
    └── pdfGenerator.js         # jsPDF invoice & report PDF generation
```

---

## 13. Environment Variables

### Backend `.env`

```env
PORT=5000
NODE_ENV=development

# MongoDB
MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/<dbname>

# JWT
JWT_SECRET=your_jwt_secret_key

# CORS
ALLOWED_ORIGINS=https://your-frontend.vercel.app,http://localhost:5173

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Email (Gmail OAuth2)
EMAIL_USER=your@gmail.com
EMAIL_PASS=your_app_password

# Firebase FCM
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your_project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# AI (Ollama)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2
```

### Frontend `.env`

```env
VITE_API_URL=https://your-backend.onrender.com

# Firebase (FCM)
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_VAPID_KEY=your_vapid_key
```

---

## 14. Getting Started

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- Ollama installed locally: `ollama pull llama3.2`
- Firebase project with FCM enabled
- Cloudinary account

### Backend Setup

```bash
git clone https://github.com/your-org/MedBeacon-Backend.git
cd MedBeacon-Backend
npm install
cp .env.example .env       # Fill in all variables
npm run dev                # Starts on http://localhost:5000
```

### Frontend Setup

```bash
git clone https://github.com/your-org/medbeacon-frontend-deploy.git
cd medbeacon-frontend-deploy
npm install
cp .env.example .env       # Set VITE_API_URL + Firebase config
npm run dev                # Starts on http://localhost:5173
```

### Create Super Admin

```bash
cd MedBeacon-Backend
node createAdmin.js        # Interactive super-admin creation script
```

---

## 15. Platform Builds

MedBeacon supports **four deployment targets** from a single React codebase:

| Target | Command | Output |
|---|---|---|
| **Web / PWA** | `npm run build` | Static files for Vercel |
| **Desktop (Win/Mac/Linux)** | `npm run tauri:build` | Native installer via Tauri v2 + Rust |
| **Android APK** | `npm run tauri:android` | APK via Tauri v2 + Android SDK |

> Requires [Tauri prerequisites](https://tauri.app/start/prerequisites/): Rust toolchain + platform-specific SDKs.

### PWA Capabilities

- Installable via browser "Add to Home Screen"
- Offline caching via Workbox service worker
- Background push notifications via FCM
- Responsive design for all screen sizes

---

## 16. Deployment

| Service | Platform | Configuration |
|---|---|---|
| **Backend** | [Render.com](https://render.com) | `render.yaml` — `npm install` + `npm start` |
| **Frontend** | [Vercel](https://vercel.com) | `vercel.json` — SPA rewrites, `VITE_*` env vars |

### Render.yaml (Backend)

- Build command: `npm install`
- Start command: `npm start`
- Environment: set all backend env vars in Render dashboard

### Vercel (Frontend)

- Framework preset: Vite
- All `/*` routes rewrite to `/index.html` for SPA client-side routing
- Set all `VITE_*` environment variables in Vercel project settings

---

## 17. Novelty & Differentiators

| Feature | What Makes It Novel |
|---|---|
| **On-Premises AI** | Ollama LLM runs entirely on the clinic's server — no cloud API, guaranteed PHI privacy |
| **DB-Level Multi-Tenancy** | Per-clinic Mongoose connection switching — true data isolation, not just filtering |
| **UPI QR Auto-Pay Detection** | Real-time WebSocket payment confirmation without an external payment gateway webhook |
| **WebRTC + Records Side by Side** | Video call and patient records co-exist in the same UI — no tab switching |
| **Tauri Cross-Platform** | Same React code ships as Web PWA, Windows/macOS/Linux desktop, and Android APK |
| **BLE Health Device Integration** | Native Bluetooth sensor readings feed directly into health metrics (Tauri only) |
| **AI DB Context Injection** | AI assistant automatically loads relevant patient data into the LLM prompt context |
| **PHI Audit Trail** | `PhiAuditLog` provides HIPAA-compliant access logging for all protected health data |
| **Encrypted Environment** | AES-256-CBC encrypted `.env.enc` file support for production secret management |

---

## 18. Conclusion

MedBeacon represents a complete reimagining of clinic management software — moving from fragmented, siloed tools to a single unified platform. By combining modern web technologies (React 19, Node.js, MongoDB), real-time infrastructure (Socket.IO, WebRTC), localized AI inference (Ollama/Llama 3.2), and true multi-tenant architecture, MedBeacon delivers:

- ✅ **Zero-friction telemedicine** — integrated video calls alongside medical records
- ✅ **Automated financial workflows** — smart billing with live UPI payment detection
- ✅ **Privacy-first AI assistance** — on-premise LLM with patient context awareness
- ✅ **Complete operational coverage** — pharmacy, inventory, appointments, lab reports, billing in one place
- ✅ **Cross-platform reach** — every device, same great experience

As MedBeacon continues to evolve, its modular architecture ensures new capabilities (e.g., AI diagnostics, insurance integration, multi-clinic dashboards) can be added without disrupting existing workflows — setting the foundation for the future of connected, intelligent healthcare management.

---

*MedBeacon — Connecting Care, Enabling Clarity.*
