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
}, { timestamps: true });
invoiceSchema.index({ doctorId: 1, createdAt: -1 });
invoiceSchema.index({ patientId: 1 });
invoiceSchema.index({ status: 1 });

const medicationSchema = new mongoose.Schema({
    patientId: { type: String, ref: 'User', required: true },
    doctorId: { type: String, ref: 'User' },
    name: { type: String, required: true },
    dosage: { type: String, required: true },
    frequency: { type: String, required: true },
    startDate: { type: Date },
    endDate: { type: Date },
    notes: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

const medicalRecordSchema = new mongoose.Schema({
    patientId: { type: String, ref: 'User', required: true },
    doctorId: { type: String, ref: 'User' },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    fileUrl: { type: String },
    fileType: { type: String },
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
    name: { type: String, required: true, trim: true },
    genericName: { type: String, trim: true },
    category: { type: String, required: true },
    manufacturer: { type: String, trim: true },
    batchNumber: { type: String, trim: true },
    expiryDate: { type: Date },
    quantity: { type: Number, required: true, min: 0, default: 0 },
    unit: { type: String, required: true, default: 'units' },
    purchasePrice: { type: Number, min: 0, default: 0 },
    sellingPrice: { type: Number, min: 0, default: 0 },
    reorderLevel: { type: Number, min: 0, default: 10 },
    location: { type: String, trim: true },
    description: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
    requiresPrescription: { type: Boolean, default: false },
    addedBy: { type: String, ref: 'User' },
}, { timestamps: true });

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
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true },
    description: { type: String, default: '' },
    quantity: { type: Number, required: true, min: 0, default: 0 },
    unit: { type: String, default: 'units' },
    purchasePrice: { type: Number, min: 0, default: 0 },
    sellingPrice: { type: Number, min: 0, default: 0 },
    reorderLevel: { type: Number, min: 0, default: 5 },
    supplier: { type: String, default: '' },
    location: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
    addedBy: { type: String, ref: 'User' },
}, { timestamps: true });

const serviceItemSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true },
    description: { type: String, default: '' },
    price: { type: Number, required: true, min: 0 },
    duration: { type: Number, default: 30 },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

const activityLogSchema = new mongoose.Schema({
    userId: { type: String, ref: 'User' },
    action: { type: String, required: true },
    details: { type: String, default: '' },
    ipAddress: { type: String },
    userAgent: { type: String },
}, { timestamps: true });

const announcementSchema = new mongoose.Schema({
    title: { type: String, required: true },
    message: { type: String, required: true },
    targetAudience: { type: String, enum: ['all', 'doctors', 'patients'], default: 'all' },
    priority: { type: String, enum: ['low', 'normal', 'high', 'urgent'], default: 'normal' },
    createdBy: { type: String, ref: 'User' },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

const conversationSchema = new mongoose.Schema({
    participants: [{ type: String, ref: 'User' }],
    lastMessage: { type: String, default: '' },
    lastMessageAt: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

const messageSchema = new mongoose.Schema({
    conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
    senderId: { type: String, ref: 'User', required: true },
    content: { type: String, required: true },
    messageType: { type: String, enum: ['text', 'image', 'file'], default: 'text' },
    fileUrl: { type: String },
    isRead: { type: Boolean, default: false },
}, { timestamps: true });

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
    specialization: { type: String },
    qualification: { type: String },
    experience: { type: Number, default: 0 },
    licenseNumber: { type: String },
    hospital: { type: String },
    bio: { type: String, default: '' },
    consultationFee: { type: Number, default: 0 },
    availableDays: [{ type: String }],
    availableTime: { type: String },
    rating: { type: Number, default: 0 },
    totalRatings: { type: Number, default: 0 },
}, { timestamps: true });

const patientDetailSchema = new mongoose.Schema({
    userId: { type: String, ref: 'User', required: true, unique: true },
    dateOfBirth: { type: Date },
    gender: { type: String },
    bloodGroup: { type: String },
    allergies: [{ type: String }],
    emergencyContact: { type: String },
    address: { type: String, default: '' },
    medicalHistory: { type: String, default: '' },
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
    userId: { type: String, ref: 'User', required: true },
    title: { type: String, default: 'New Chat' },
    messages: [{ role: String, content: String, timestamp: { type: Date, default: Date.now } }],
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

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
    isSingleton: { type: Boolean, default: true },
    setupComplete: { type: Boolean, default: false },
}, { timestamps: true });
clinicProfileSchema.index({ isSingleton: 1 }, { unique: true });

// ─── Factory Function ──────────────────────────────────────────────────────

const modelCache = new Map(); // dbName -> models object

/**
 * Get all models bound to a specific mongoose connection.
 * Results are cached per connection.
 * @param {mongoose.Connection} conn
 * @param {string} dbName - used as cache key
 */
const getModels = (conn, dbName) => {
    if (modelCache.has(dbName)) return modelCache.get(dbName);

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
    };

    modelCache.set(dbName, models);
    return models;
};

module.exports = { getModels };
