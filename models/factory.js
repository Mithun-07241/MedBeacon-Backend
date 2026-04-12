/**
 * Model Factory
 * 
 * Given a mongoose connection, returns all models bound to that connection.
 * This allows each clinic to have its own isolated database while sharing schema definitions.
 */

const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

// ─── Schema Definitions ────────────────────────────────────────────────────

const userSchema = new mongoose.Schema({
    id: { type: String, default: uuidv4, unique: true },
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['patient', 'doctor', 'admin', 'clinic_admin'], required: true },
    profilePicUrl: { type: String, default: null },
    profileCompleted: { type: Boolean, default: false },
    verificationStatus: { type: String, enum: ['pending', 'verified', 'rejected', 'under_review'], default: 'pending' },
    otp: { type: String },
    otpExpires: { type: Date },
    fcmToken: { type: String, default: null },
    fcmPlatform: { type: String, default: null },
    fcmDeviceId: { type: String, default: null },
    fcmUpdatedAt: { type: Date, default: null },
    isOnline: { type: Boolean, default: false },
    lastSeen: { type: Date, default: Date.now },
    // HIPAA – account lockout & audit fields
    loginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date, default: null },
    lastLoginAt: { type: Date, default: null },
    lastLoginIp: { type: String, default: null },
}, { timestamps: true });

const appointmentSchema = new mongoose.Schema({
    patientId: { type: String, ref: 'User', required: true },
    doctorId: { type: String, ref: 'User', required: true },
    date: { type: String, required: true },
    time: { type: String, required: true },
    reason: { type: String, required: true },
    notes: { type: String, default: '' },
    status: { type: String, enum: ['pending', 'confirmed', 'rejected', 'completed', 'cancelled'], default: 'pending' },
    rating: { type: Number, min: 1, max: 5 },
    feedback: { type: String, default: '' },
    rated: { type: Boolean, default: false },
    rescheduleOffer: {
        date: { type: String, default: '' },
        time: { type: String, default: '' },
        status: {
            type: String,
            enum: ['pending', 'accepted', 'declined', ''],
            default: ''
        }
    },
}, { timestamps: true });

const invoiceItemSchema = new mongoose.Schema({
    description: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    rate: { type: Number, required: true, min: 0 },
    amount: { type: Number, required: true, min: 0 },
}, { _id: false });

const invoiceSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    invoiceNumber: { type: String, required: true, unique: true },
    doctorId: { type: String, ref: 'User', required: true },
    patientId: { type: String, ref: 'User', required: true },
    appointmentId: { type: String, ref: 'Appointment' },
    items: {
        type: [invoiceItemSchema], required: true,
        validate: { validator: (items) => items && items.length > 0, message: 'Invoice must have at least one item' }
    },
    subtotal: { type: Number, required: true, min: 0 },
    taxPercent: { type: Number, default: 0, min: 0 },
    discountPercent: { type: Number, default: 0, min: 0 },
    tax: { type: Number, default: 0, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ['draft', 'sent', 'paid', 'cancelled'], default: 'draft' },
    dueDate: { type: Date, required: true },
    paidDate: { type: Date },
    notes: { type: String, default: '' },
    upiId: { type: String, default: '' },
    paymentRef: { type: String, default: '' },
    paymentRefSubmittedAt: { type: Date },
}, { timestamps: true });
invoiceSchema.index({ doctorId: 1, createdAt: -1 });
invoiceSchema.index({ patientId: 1 });
invoiceSchema.index({ status: 1 });

const medicationSchema = new mongoose.Schema({
    id: { type: String, default: uuidv4, unique: true },
    patientId: { type: String, ref: 'User', required: true },
    doctorId: { type: String, ref: 'User' },
    name: { type: String, required: true },
    dosage: { type: String, required: true },
    frequency: { type: String, required: true },
    time: { type: String },
    status: { type: String, enum: ['Active', 'Completed', 'Paused', 'active', 'completed', 'paused'], default: 'Active' },
    remaining: { type: Number, default: 0 },
    prescribedBy: { type: String },
    instructions: { type: String, default: '' },
    duration: { type: String, default: '' },
    startDate: { type: Date },
    endDate: { type: Date },
    notes: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

const medicalRecordSchema = new mongoose.Schema({
    id: { type: String, default: uuidv4, unique: true },
    patientId: { type: String, ref: 'User', required: true },
    doctorId: { type: String, ref: 'User' },
    name: { type: String, required: true },
    type: { type: String, required: true },
    date: { type: Date, required: true },
    doctorName: { type: String },
    title: { type: String },
    description: { type: String, default: '' },
    fileUrl: { type: String, default: '' },
    fileType: { type: String },
    size: { type: String },
    recordType: { type: String, default: 'general' },
}, { timestamps: true });

const reportSchema = new mongoose.Schema({
    patientId: { type: String, ref: 'User', required: true },
    doctorId: { type: String, ref: 'User' },
    title: { type: String, required: true },
    content: { type: String, default: '' },
    fileUrl: { type: String },
    reportType: { type: String, default: 'general' },
}, { timestamps: true });

const ticketSchema = new mongoose.Schema({
    userId: { type: String, ref: 'User', required: true },
    subject: { type: String, required: true },
    description: { type: String, required: true },
    status: { type: String, enum: ['open', 'in_progress', 'resolved', 'closed'], default: 'open' },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    response: { type: String, default: '' },
}, { timestamps: true });

const healthMetricSchema = new mongoose.Schema({
    patientId: { type: String, ref: 'User', required: true },
    type: { type: String, required: true },
    value: { type: mongoose.Schema.Types.Mixed, required: true },
    unit: { type: String },
    recordedAt: { type: Date, default: Date.now },
    notes: { type: String, default: '' },
}, { timestamps: true });

const pharmacyItemSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true, trim: true },
    genericName: { type: String, trim: true },
    category: { type: String, required: true },
    description: { type: String, default: '' },
    manufacturer: { type: String, trim: true },
    batchNumber: { type: String, trim: true },
    expiryDate: { type: Date },
    quantity: { type: Number, required: true, min: 0, default: 0 },
    unit: { type: String, required: true, default: 'units' },
    price: { type: Number, min: 0, default: 0 },
    purchasePrice: { type: Number, min: 0, default: 0 },
    sellingPrice: { type: Number, min: 0, default: 0 },
    reorderLevel: { type: Number, min: 0, default: 10 },
    location: { type: String, default: '' },
    status: { type: String, enum: ['in_stock', 'low_stock', 'out_of_stock', 'expired'], default: 'in_stock' },
    isActive: { type: Boolean, default: true },
    requiresPrescription: { type: Boolean, default: false },
    addedBy: { type: String, ref: 'User' },
}, { timestamps: true });

// Auto-update pharmacy item status based on quantity and expiry
pharmacyItemSchema.pre('save', function (next) {
    const now = new Date();
    if (this.expiryDate && this.expiryDate < now) {
        this.status = 'expired';
    } else if (this.quantity === 0) {
        this.status = 'out_of_stock';
    } else if (this.quantity <= this.reorderLevel) {
        this.status = 'low_stock';
    } else {
        this.status = 'in_stock';
    }
    next();
});

const pharmacyTransactionSchema = new mongoose.Schema({
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'PharmacyItem', required: true },
    itemName: { type: String, required: true },
    transactionType: { type: String, enum: ['purchase', 'sale', 'adjustment', 'return', 'expired'], required: true },
    quantity: { type: Number, required: true },
    unitPrice: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 },
    performedBy: { type: String, ref: 'User' },
    patientId: { type: String, ref: 'User' },
    notes: { type: String, default: '' },
    referenceNumber: { type: String },
}, { timestamps: true });

const inventoryItemSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true },
    description: { type: String, default: '' },
    quantity: { type: Number, required: true, min: 0, default: 0 },
    unit: { type: String, default: 'units' },
    location: { type: String, default: '' },
    purchaseDate: { type: Date },
    purchasePrice: { type: Number, min: 0, default: 0 },
    sellingPrice: { type: Number, min: 0, default: 0 },
    reorderLevel: { type: Number, min: 0, default: 5 },
    supplier: { type: String, default: '' },
    status: { type: String, enum: ['available', 'in_use', 'maintenance', 'damaged', 'disposed', 'low_stock', 'out_of_stock'], default: 'available' },
    assignedTo: { type: String, ref: 'User' },
    notes: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
    addedBy: { type: String, ref: 'User' },
}, { timestamps: true });

const serviceItemSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    category: { type: String, required: true },
    defaultPrice: { type: Number, required: true, min: 0 },
    createdBy: { type: String, ref: 'User' },
    isGlobal: { type: Boolean, default: false },
    duration: { type: Number, default: 30 },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

const alertSchema = new mongoose.Schema({
    id: { type: String, default: uuidv4, unique: true },
    patientId: { type: String, ref: 'User', required: true },
    patientName: { type: String, default: '' },
    doctorId: { type: String, ref: 'User', default: null },
    message: { type: String, required: true },
    severity: { type: String, required: true, enum: ['low', 'moderate', 'urgent', 'critical'], default: 'low' },
    status: { type: String, default: 'pending', enum: ['pending', 'acknowledged', 'resolved'] },
}, { timestamps: true });

const activityLogSchema = new mongoose.Schema({
    userId: { type: String, ref: 'User' },
    adminEmail: { type: String, default: '' },
    action: { type: String, required: true },
    details: { type: String, default: '' },
    ipAddress: { type: String },
    userAgent: { type: String },
    timestamp: { type: Date, default: Date.now },
}, { timestamps: true });

const announcementSchema = new mongoose.Schema({
    title: { type: String, required: true },
    message: { type: String, required: true },
    targetAudience: { type: String, enum: ['all', 'doctors', 'patients', 'verified_doctors'], default: 'all' },
    priority: { type: String, enum: ['low', 'normal', 'medium', 'high', 'urgent'], default: 'normal' },
    createdBy: { type: String, ref: 'User' },
    isActive: { type: Boolean, default: true },
    sentAt: { type: Date, default: Date.now },
}, { timestamps: true });

// Matches chatController.js: doctorId/patientId/sender/text
const conversationSchema = new mongoose.Schema({
    doctorId:    { type: String, ref: 'User', required: true, index: true },
    patientId:   { type: String, ref: 'User', required: true, index: true },
    lastMessage: { type: String, default: '' },
    lastSender:  { type: String },
    unread: {
        doctor:  { type: Number, default: 0 },
        patient: { type: Number, default: 0 },
    },
}, { timestamps: true });
conversationSchema.index({ doctorId: 1, patientId: 1 }, { unique: true });
conversationSchema.index({ updatedAt: -1 });

const messageSchema = new mongoose.Schema({
    doctorId:  { type: String, ref: 'User', required: true },
    patientId: { type: String, ref: 'User', required: true },
    sender:    { type: String, required: true },   // User.id of the sender
    text:      { type: String, required: true },   // stored encrypted (AES-256-GCM)
    read:      { type: Boolean, default: false },
    timestamp: { type: Date, default: Date.now },
}, { timestamps: true });
messageSchema.index({ doctorId: 1, patientId: 1, timestamp: 1 });

const callSchema = new mongoose.Schema({
    callerId: { type: String, ref: 'User', required: true },
    receiverId: { type: String, ref: 'User', required: true },
    status: { type: String, enum: ['initiated', 'ringing', 'connected', 'ended', 'missed', 'rejected'], default: 'initiated' },
    callType: { type: String, enum: ['audio', 'video'], default: 'video' },
    startedAt: { type: Date },
    endedAt: { type: Date },
    duration: { type: Number, default: 0 },
}, { timestamps: true });

const doctorDetailSchema = new mongoose.Schema({
    userId: { type: String, ref: 'User', required: true, unique: true },
    firstName: { type: String },
    lastName: { type: String },
    dateOfBirth: { type: String },
    phoneNumber: { type: String },
    address: { type: String },
    medicalLicense: { type: String },
    specialization: { type: String },
    qualification: { type: String },
    hospitalAffiliation: { type: String },
    hospital: { type: String },
    proofFileUrl: { type: String },
    profilePicUrl: { type: String },
    experience: { type: String },
    gender: { type: String },
    bio: { type: String, default: '' },
    education: { type: String },
    graduationYear: { type: String },
    certifications: { type: String },
    languages: { type: String },
    consultationFee: { type: Number, default: 0 },
    availability: { type: String, enum: ['available', 'busy', 'unavailable'], default: 'available' },
    weeklySchedule: {
        type: mongoose.Schema.Types.Mixed,
        default: {
            Mon: { open: true, start: '09:00 AM', end: '05:00 PM' },
            Tue: { open: true, start: '09:00 AM', end: '05:00 PM' },
            Wed: { open: true, start: '09:00 AM', end: '05:00 PM' },
            Thu: { open: true, start: '09:00 AM', end: '05:00 PM' },
            Fri: { open: true, start: '09:00 AM', end: '05:00 PM' },
            Sat: { open: false, start: '', end: '' },
            Sun: { open: false, start: '', end: '' }
        }
    },
    expertise: { type: [String] },
    availableDays: [{ type: String }],
    availableTime: { type: String },
    rating: { type: Number, default: 0 },
    totalRatings: { type: Number, default: 0 },
    verificationStatus: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' },
}, { timestamps: true });

const patientDetailSchema = new mongoose.Schema({
    userId: { type: String, ref: 'User', required: true, unique: true },
    firstName: { type: String },
    lastName: { type: String },
    dateOfBirth: { type: String },
    phoneNumber: { type: String },
    address: { type: String, default: '' },
    allergies: { type: String },
    treatmentFileUrl: { type: String },
    profilePicUrl: { type: String },
    age: { type: String },
    gender: { type: String },
    bio: { type: String },
    emergencyContactName: { type: String },
    emergencyContactPhone: { type: String },
    bloodType: { type: String },
    bloodGroup: { type: String },
    medicalHistory: { type: String, default: '' },
    emergencyContact: { type: String },
}, { timestamps: true });

const emailPreferenceSchema = new mongoose.Schema({
    userId: { type: String, ref: 'User', required: true, unique: true },
    appointmentReminders: { type: Boolean, default: true },
    medicationReminders: { type: Boolean, default: true },
    announcements: { type: Boolean, default: true },
    newsletters: { type: Boolean, default: false },
}, { timestamps: true });

const settingsSchema = new mongoose.Schema({
    userId: { type: String, ref: 'User', required: true, unique: true },
    theme: { type: String, default: 'light' },
    language: { type: String, default: 'en' },
    notifications: { type: Boolean, default: true },
    twoFactorAuth: { type: Boolean, default: false },
}, { timestamps: true });

const aiChatSessionSchema = new mongoose.Schema({
    sessionId: {
        type: String,
        default: uuidv4,
        unique: true,
        index: true
    },
    userId: { type: String, ref: 'User', required: true, index: true },
    title: { type: String, default: 'New Chat' },
    messages: [{
        role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
        content: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        toolsExecuted: [{ type: String }]
    }],
    isActive: { type: Boolean, default: true },
    lastMessageAt: { type: Date, default: Date.now },
    // Persisted booking state — accumulated across turns, never re-derived from scratch
    bookingState: {
        type: mongoose.Schema.Types.Mixed,
        default: () => ({ doctor: null, date: null, time: null, reason: null })
    },
}, { timestamps: true });

aiChatSessionSchema.index({ userId: 1, lastMessageAt: -1 });
aiChatSessionSchema.index({ sessionId: 1, userId: 1 });

// Update lastMessageAt whenever messages are added
aiChatSessionSchema.pre('save', function (next) {
    if (this.messages && this.messages.length > 0) {
        this.lastMessageAt = this.messages[this.messages.length - 1].timestamp || new Date();
    }
    next();
});


const labResultRowSchema = new mongoose.Schema({
    parameter: { type: String, required: true },  // e.g. 'Haemoglobin'
    value:     { type: String, required: true },  // e.g. '13.2'
    unit:      { type: String, default: '' },     // e.g. 'g/dL'
    referenceRange: { type: String, default: '' }, // e.g. '12.0–16.0'
    flag:      { type: String, enum: ['normal', 'low', 'high', 'critical'], default: 'normal' },
}, { _id: false });

const labReportSchema = new mongoose.Schema({
    id:           { type: String, required: true, unique: true },
    reportNumber: { type: String, required: true, unique: true },
    doctorId:     { type: String, ref: 'User', required: true },
    patientId:    { type: String, ref: 'User', required: true },
    appointmentId:{ type: String, ref: 'Appointment' },
    testName:     { type: String, required: true },   // e.g. 'Complete Blood Count'
    labName:      { type: String, default: '' },      // e.g. 'Metropolis Labs'
    results:      { type: [labResultRowSchema], required: true, validate: { validator: v => v && v.length > 0, message: 'At least one result is required' } },
    notes:        { type: String, default: '' },
    reportDate:   { type: Date, required: true },
    status:       { type: String, enum: ['draft', 'sent'], default: 'draft' },
}, { timestamps: true });
labReportSchema.index({ doctorId: 1, createdAt: -1 });
labReportSchema.index({ patientId: 1, reportDate: -1 });

const clinicProfileSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    clinicName: { type: String, required: true, trim: true },
    clinicLogoUrl: { type: String, default: null },
    address: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    zipCode: { type: String, default: '' },
    phone: { type: String, default: '' },
    email: { type: String, default: '' },
    website: { type: String, default: '' },
    taxId: { type: String, default: '' },
    description: { type: String, default: '' },
    upiId: { type: String, default: '' },
    isSingleton: { type: Boolean, default: true },
    setupComplete: { type: Boolean, default: false },
}, { timestamps: true });
clinicProfileSchema.index({ isSingleton: 1 }, { unique: true });

// ─── Factory Function ──────────────────────────────────────────────────────

// Schema version — bump this whenever schema definitions change to invalidate
// in-process model cache and force re-registration with updated schemas.
const SCHEMA_VERSION = 'v7'; // bumped: synced DoctorDetail, PatientDetail, Announcement, ActivityLog schemas with standalone models — added firstName, lastName, phoneNumber, etc. that AI tools depend on

const modelCache = new Map(); // `${dbName}:${SCHEMA_VERSION}` -> models object

/**
 * Get all models bound to a specific mongoose connection.
 * Results are cached per connection + schema version.
 * @param {mongoose.Connection} conn
 * @param {string} dbName - used as cache key
 */
const getModels = (conn, dbName) => {
    const cacheKey = `${dbName}:${SCHEMA_VERSION}`;
    if (modelCache.has(cacheKey)) return modelCache.get(cacheKey);

    const models = {
        User: conn.model('User', userSchema),
        Appointment: conn.model('Appointment', appointmentSchema),
        Invoice: conn.model('Invoice', invoiceSchema),
        Medication: conn.model('Medication', medicationSchema),
        MedicalRecord: conn.model('MedicalRecord', medicalRecordSchema),
        Report: conn.model('Report', reportSchema),
        Ticket: conn.model('Ticket', ticketSchema),
        HealthMetric: conn.model('HealthMetric', healthMetricSchema),
        PharmacyItem: conn.model('PharmacyItem', pharmacyItemSchema),
        PharmacyTransaction: conn.model('PharmacyTransaction', pharmacyTransactionSchema),
        InventoryItem: conn.model('InventoryItem', inventoryItemSchema),
        ServiceItem: conn.model('ServiceItem', serviceItemSchema),
        ActivityLog: conn.model('ActivityLog', activityLogSchema),
        Announcement: conn.model('Announcement', announcementSchema),
        Conversation: conn.model('Conversation', conversationSchema),
        Message: conn.model('Message', messageSchema),
        Call: conn.model('Call', callSchema),
        DoctorDetail: conn.model('DoctorDetail', doctorDetailSchema),
        PatientDetail: conn.model('PatientDetail', patientDetailSchema),
        EmailPreference: conn.model('EmailPreference', emailPreferenceSchema),
        Settings: conn.model('Settings', settingsSchema),
        AiChatSession: conn.model('AiChatSession', aiChatSessionSchema),
        ClinicProfile: conn.model('ClinicProfile', clinicProfileSchema),
        LabReport: conn.model('LabReport', labReportSchema),
        Alert: conn.model('Alert', alertSchema),
    };

    modelCache.set(cacheKey, models);
    return models;
};

module.exports = { getModels };
