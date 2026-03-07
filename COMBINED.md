# 🏥 MedBeacon

> A full-stack, multi-platform healthcare platform connecting Patients, Doctors, and Clinic Admins with real-time communication, AI assistance, billing, pharmacy, and more.

---

## 📑 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [System Architecture](#system-architecture)
- [Repository Structure](#repository-structure)
  - [Backend Structure](#backend-structure)
  - [Frontend Structure](#frontend-structure)
- [API Reference](#api-reference)
- [Data Models](#data-models)
- [Real-Time Events (Socket.IO)](#real-time-events-socketio)
- [Authentication & Authorization](#authentication--authorization)
- [Pages & Routing](#pages--routing)
- [Environment Variables](#environment-variables)
  - [Backend `.env`](#backend-env)
  - [Frontend `.env`](#frontend-env)
- [Getting Started](#getting-started)
- [Platform Builds](#platform-builds)
- [Deployment](#deployment)

---

## Overview

MedBeacon is a **full-stack healthcare SaaS** built in two repositories:

| Repo | Description |
|---|---|
| **MedBeacon-Backend** | Node.js / Express REST API + Socket.IO real-time server |
| **medbeacon-frontend-deploy** | React 19 + Vite SPA, deployable as Web / PWA / Desktop / Android |

The system supports four user roles — **Patient**, **Doctor**, **Clinic Admin**, and **Super Admin** — each with their own dashboards, workflows, and data access.

---

## Features

| Category | Capabilities |
|---|---|
| **Authentication** | OTP email verification, JWT access tokens, bcrypt passwords, role-based access |
| **Patient Dashboard** | Appointment overview, health metrics, quick actions |
| **Doctor Dashboard** | Patient queue, appointments, stats |
| **Admin Dashboard** | User management, clinic control, announcements, verification, activity logs |
| **Appointments** | Book, update, cancel; doctor availability management |
| **Real-Time Chat** | Doctor–patient persistent messaging over Socket.IO |
| **Video Calls** | WebRTC signalling via Socket.IO — initiate, accept, reject, end |
| **AI Chat** | Ollama LLM medical assistant with session memory & DB context |
| **Billing & Invoices** | Invoice creation, UPI QR code, auto payment detection, PDF export |
| **Pharmacy** | Stock management, dispense tracking, low-stock alerts |
| **Inventory** | Clinic inventory add/update/delete |
| **Medical Records** | Patient record uploads and retrieval |
| **Medications** | Prescription tracking per patient |
| **Health Metrics** | Vitals and health data logging |
| **Clinic Management** | Multi-tenant clinic profiles with per-clinic DB isolation |
| **Reports** | Doctor-generated patient reports |
| **Support Tickets** | Internal support ticket system |
| **Push Notifications** | Firebase FCM (mobile & desktop) |
| **Email Notifications** | Gmail OAuth2 for OTP, appointment alerts, billing |
| **Bluetooth Devices** | Native BT health device connectivity (Tauri platforms) |
| **Themes** | Dark / Light mode |
| **PWA** | Installable Progressive Web App |

---

## Tech Stack

### Backend

| Layer | Technology |
|---|---|
| Runtime | Node.js 18+ |
| Framework | Express.js 4 |
| Database | MongoDB (Mongoose ODM) |
| Real-Time | Socket.IO 4 |
| Auth | JWT (jsonwebtoken), bcryptjs |
| File Storage | Cloudinary |
| AI Engine | Ollama (llama3.2) |
| Push Notifications | Firebase Admin SDK (FCM) |
| Email | Nodemailer (Gmail OAuth2 / SMTP) |
| Validation | Zod |
| HTTP Logging | Morgan |
| Deployment | Render.com |

### Frontend

| Layer | Technology |
|---|---|
| Framework | React 19 |
| Build Tool | Vite 6 |
| Styling | TailwindCSS v4, CSS Variables |
| UI Components | Radix UI (52 primitives, shadcn/ui pattern) |
| Routing | Wouter 3 |
| Server State | TanStack Query v5 |
| Forms | React Hook Form + Zod |
| Real-Time | Socket.IO Client 4 |
| Animation | Framer Motion |
| Charts | Recharts |
| PDF Export | jsPDF |
| QR Codes | qrcode.react |
| AI Voice | ElevenLabs React |
| Native App | Tauri v2 (Desktop + Android) |
| PWA | vite-plugin-pwa + Workbox |
| Deployment | Vercel |

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                             │
│  Web (Vercel) │ PWA │ Desktop (Tauri) │ Android (Tauri)        │
│                     React 19 + Vite                             │
└─────────────────┬──────────────────────────────┬────────────────┘
                  │  REST API (HTTPS)             │  WebSocket
                  ▼                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     BACKEND SERVER                              │
│              Node.js / Express.js + Socket.IO                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐  │
│  │   Auth   │ │  Routes  │ │Middleware│ │  Socket Handlers │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘  │
└──────────────────────┬──────────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
  ┌──────────┐  ┌──────────┐  ┌────────────────────┐
  │ MongoDB  │  │Cloudinary│  │ External Services  │
  │Main + Per│  │(files)   │  │ Firebase FCM       │
  │Clinic DB │  └──────────┘  │ Ollama AI          │
  └──────────┘                │ Nodemailer (Gmail)  │
                              └────────────────────┘
```

### Multi-Tenant Clinic Database

The `clinicDb` middleware dynamically switches the Mongoose connection to a **per-clinic database** based on the user's `clinicId`, providing complete data isolation between clinics.

---

## Repository Structure

### Backend Structure

```
MedBeacon-Backend/
├── index.js                   # Entry point, route mounting, Socket.IO init
├── socketServer.js            # WebRTC video call Socket.IO handlers
├── render.yaml                # Render.com deployment config
├── config/
│   ├── db.js                  # Main MongoDB connection
│   ├── clinicDb.js            # Per-clinic dynamic DB connection
│   └── registry.js            # Clinic registry
├── controllers/               # Business logic — 21 modules
│   ├── authController.js      # Signup, login, OTP, JWT
│   ├── userController.js      # Profile CRUD, doctor/patient lists
│   ├── appointmentController.js
│   ├── billingController.js   # Invoices, UPI payments
│   ├── aiChatController.js    # Ollama AI session management
│   ├── adminController.js
│   ├── pharmacyController.js
│   ├── inventoryController.js
│   ├── chatController.js
│   ├── callController.js
│   ├── clinicController.js
│   └── ...
├── models/                    # Mongoose schemas — 28 models
│   ├── User.js, DoctorDetail.js, PatientDetail.js
│   ├── Appointment.js, Invoice.js, Conversation.js, Message.js
│   ├── Call.js, AiChatSession.js, AiConversation.js
│   ├── InventoryItem.js, PharmacyItem.js, PharmacyTransaction.js
│   ├── MedicalRecord.js, Medication.js, HealthMetric.js
│   ├── ServiceItem.js, Report.js, Ticket.js, Alert.js
│   ├── ActivityLog.js, Announcement.js, EmailPreference.js
│   ├── ClinicProfile.js, Settings.js, Symptom.js
│   └── factory.js             # Multi-tenant model factory
├── middleware/
│   ├── auth.js                # JWT verification
│   ├── adminMiddleware.js     # Admin-only guard
│   ├── clinicDb.js            # Per-clinic DB switcher
│   ├── upload.js              # Multer + Cloudinary handler
│   └── activityLogger.js     # Auto activity logging
├── routes/                    # Express Router files — 21 modules
├── services/
│   ├── ollamaService.js       # Ollama LLM chat + streaming
│   ├── memoryService.js       # AI conversation memory
│   ├── dbContextLoader.js     # DB context loader for AI prompts
│   └── pushNotificationService.js  # Firebase FCM
└── utils/
    └── socket.js              # Socket.IO init + chat events
```

### Frontend Structure

```
medbeacon-frontend-deploy/
├── index.html
├── vite.config.js             # Vite + PWA config
├── vercel.json                # Vercel SPA rewrite rules
├── components.json            # shadcn/ui config
└── src/
    ├── App.jsx                # Root — providers + Wouter router
    ├── main.jsx               # React DOM entry
    ├── index.css              # Global styles + Tailwind directives
    ├── pages/                 # 41 page components (see routing table)
    ├── components/
    │   ├── ui/                # 52 Radix UI primitives
    │   ├── layout/            # Sidebar, Topbar
    │   ├── billing/           # Invoice forms, payment modal
    │   ├── chat/              # Message bubbles, conversations
    │   ├── pharmacy/          # Stock table, dispense modal
    │   ├── inventory/         # Inventory table
    │   ├── admin/             # Admin-specific components
    │   ├── IncomingCallModal.jsx
    │   ├── CallManager.jsx
    │   ├── FloatingAiButton.jsx
    │   ├── SymptomModal.jsx
    │   ├── VoiceModal.jsx
    │   ├── RatingModal.jsx
    │   ├── ImageCropper.jsx
    │   └── ThemeToggle.jsx
    ├── context/
    │   ├── AuthContext.jsx    # Session, JWT, role
    │   ├── ThemeContext.jsx   # Dark/light mode
    │   ├── NotificationContext.jsx
    │   ├── CallContext.jsx    # Call state machine
    │   └── BluetoothContext.jsx
    ├── hooks/                 # Custom React hooks
    ├── lib/
    │   ├── queryClient.js     # TanStack Query client
    │   └── utils.js           # cn() and helpers
    ├── services/
    │   └── api.js             # Centralized API fetch wrapper
    └── utils/
        ├── platform.js        # Web / Tauri / Android detection
        └── pdfGenerator.js    # jsPDF invoice & report export
```

---

## API Reference

All routes are prefixed with `/api`.

### 🔐 Authentication

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `POST` | `/signup` | Register (sends OTP) | Public |
| `POST` | `/login` | Login | Public |
| `POST` | `/verify-email` | Verify OTP | Public |
| `POST` | `/resend-otp` | Resend OTP | Public |
| `GET` | `/me` | Get current user | 🔒 JWT |
| `POST` | `/logout` | Logout | 🔒 JWT |

### 👤 Users

| Method | Endpoint | Description |
|---|---|---|
| `GET/PUT` | `/profile` | Own profile |
| `GET` | `/doctors` | List doctors |
| `GET` | `/patients` | List patients |
| `GET` | `/doctors/:id` | Doctor detail |
| `GET` | `/patients/:id` | Patient detail |

### 📅 Appointments — `/api/appointments`

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/` | Book appointment |
| `GET` | `/` | List appointments |
| `PUT` | `/:id` | Update appointment |
| `DELETE` | `/:id` | Cancel appointment |

### 💬 Chat — `/api/chat`

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/conversations` | List conversations |
| `GET` | `/messages/:id` | Get messages |
| `POST` | `/messages` | Send message |

### 💰 Billing — `/api/billing`

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/invoices` | Create invoice |
| `GET` | `/invoices` | List invoices |
| `GET` | `/invoices/:id` | Invoice detail |
| `PUT` | `/invoices/:id/pay` | Mark as paid |

### 🤖 AI Chat — `/api/ai-chat`

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/message` | Send AI message |
| `GET` | `/sessions` | List sessions |
| `GET` | `/sessions/:id` | Session messages |
| `DELETE` | `/sessions/:id` | Delete session |

### 🏥 Clinic — `/api/clinic`

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/profile` | Get clinic profile |
| `POST` | `/profile` | Create (clinic admin) |
| `PUT` | `/profile` | Update (clinic admin) |

### 💊 Pharmacy — `/api/pharmacy`   |   📦 Inventory — `/api/inventory`

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/stock` or `/` | List items |
| `POST` | `/stock` or `/` | Add item |
| `PUT` | `/:id` | Update item |
| `DELETE` | `/:id` | Remove item |
| `POST` | `/dispense` | Record dispense (pharmacy only) |

### Other Modules

| Prefix | Module |
|---|---|
| `/api/admin` | User management, announcements, verification |
| `/api/medications` | Prescription tracking |
| `/api/records` | Medical record upload/retrieval |
| `/api/metrics` | Health vitals logging |
| `/api/calls` | Call management |
| `/api/reports` | Doctor-generated reports |
| `/api/tickets` | Support tickets |
| `/api/settings` | Per-user settings |
| `/api/fcm` | FCM token registration |
| `/api/email-preferences` | Email notification prefs |
| `/api/services` | Clinic service catalog |
| `/health` | Health check endpoint |

---

## Data Models

### User

```
_id, name, email, password (hashed), role (patient|doctor|admin|clinic_admin),
phone, profilePhoto, isVerified, isProfileComplete, clinicId, fcmToken
```

### DoctorDetail

```
userId, specialization, qualification, experienceYears, clinicName, clinicAddress,
consultationFee, availableSlots, bio, rating, reviewCount
```

### PatientDetail

```
userId, dateOfBirth, gender, bloodGroup, address, emergencyContact, allergies, chronicConditions
```

### Invoice

```
patientId, doctorId, clinicId, services[], medications[], totalAmount,
upiId, paymentMethod (cash|upi|card), isPaid, paidAt, notes
```

### Appointment

```
patientId, doctorId, date, timeSlot, status (pending|confirmed|completed|cancelled),
type (in-person|video), notes, rating
```

### AiChatSession

```
userId, title, messages[], model, createdAt
```

---

## Real-Time Events (Socket.IO)

### Chat

| Event | Direction | Description |
|---|---|---|
| `join` | Client → Server | Join a conversation room |
| `send_message` | Client → Server | Send message |
| `receive_message` | Server → Client | Receive message |
| `payment_confirmed` | Server → Client | UPI payment detection broadcast |

### Video Calls (WebRTC Signalling)

| Event | Direction | Description |
|---|---|---|
| `call:initiate` | Client → Server | Start a call |
| `call:incoming` | Server → Client | Notify callee |
| `call:accept` | Client → Server | Accept |
| `call:reject` | Client → Server | Reject |
| `call:end` | Client → Server | End call |
| `call:ice-candidate` | Client ↔ Server | ICE candidate exchange |
| `call:offer` / `call:answer` | Client ↔ Server | SDP negotiation |

---

## Authentication & Authorization

- **JWT** issued on login, verified via `Authorization: Bearer <token>`.
- **Roles**: `patient`, `doctor`, `admin`, `clinic_admin`.
- Passwords hashed with **bcryptjs** (10 salt rounds).
- OTP email verification required before account activation.
- `ProtectedRoute` in frontend enforces role-based access to pages.

---

## Pages & Routing

### Public Routes

| Path | Page | Description |
|---|---|---|
| `/` | `Landing` | Marketing/landing page |
| `/login` | `LoginPage` | Login |
| `/signup` | `SignUp` | Registration |
| `/verify-email` | `VerifyEmail` | OTP verification |
| `/privacy-policy` | `PrivacyPolicy` | Privacy policy |
| `/terms-and-conditions` | `TermsAndConditions` | Terms |

### Patient (🔒 role: patient)

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

### Doctor (🔒 role: doctor)

| Path | Page |
|---|---|
| `/doctor-dashboard` | `DoctorDashboard` |
| `/doctor/appointments` | `DoctorAppointments` |
| `/patients-list` | `PatientsList` |
| `/billing` | `Billing` |
| `/reports` | `Reports` |

### Admin (🔒 role: admin / clinic_admin)

| Path | Page |
|---|---|
| `/admin` | `AdminDashboard` |
| `/clinic-setup` | `ClinicSetup` |
| `/clinic-profile` | `ClinicProfile` |

### Shared Protected

| Path | Page |
|---|---|
| `/profile` | `DProfile` / `PatientProfile` (role-aware) |
| `/doctors/:id` | `DoctorProfile` |
| `/patients/:id` | `PtProfile` |
| `/treatment-file/:id` | `TreatmentFile` |
| `/messages` & `/chat/:id` | `ChatPage` |
| `/ai` | `AiChat` |
| `/call/:id` | `ActiveCall` |
| `/bluetooth-devices` | `BluetoothDevices` |
| `/settings` | `Settings` |
| `/help` | `Help` |
| `/pharmacy` | `PharmacyStock` |

---

## Environment Variables

### Backend `.env`

```env
PORT=5000
NODE_ENV=development

# MongoDB
MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/<dbname>

# JWT
JWT_SECRET=your_jwt_secret

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Email (Gmail)
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

## Getting Started

### Backend

```bash
git clone https://github.com/your-org/MedBeacon-Backend.git
cd MedBeacon-Backend
npm install
cp .env.example .env   # fill in your values
npm run dev            # starts on http://localhost:5000
```

### Frontend

```bash
git clone https://github.com/your-org/medbeacon-frontend-deploy.git
cd medbeacon-frontend-deploy
npm install
cp .env.example .env   # fill in API URL + Firebase config
npm run dev            # starts on http://localhost:5173
```

> Requires **Ollama** running locally for AI features: `ollama pull llama3.2`

---

## Platform Builds

MedBeacon Frontend supports multiple deployment targets via **Tauri v2**.

```bash
# Web / PWA
npm run build

# Desktop (Windows / macOS / Linux)
npm run tauri:build

# Android APK
npm run tauri:android
```

> See [Tauri prerequisites](https://tauri.app/start/prerequisites/) for Rust + toolchain setup.

---

## Deployment

| Service | Platform | Config |
|---|---|---|
| **Backend** | [Render.com](https://render.com) | `render.yaml` — `npm install` + `npm start` |
| **Frontend** | [Vercel](https://vercel.com) | `vercel.json` — auto SPA rewrites, set `VITE_*` env vars |

---

## License

MIT License — see [LICENSE](LICENSE) for details.
