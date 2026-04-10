const ollamaService = require('../services/ollamaService');
const { v4: uuidv4 } = require('uuid');
const {
    isValidSessionId, isValidMessage, isValidSessionTitle,
    sanitizeString, validateBookingParams, validateSearchParams,
    isValidUserId, isValidNumber
} = require('../utils/validation');

// ═══════════════════════════════════════════════════════════════════════════════
// SESSION MANAGEMENT (unchanged)
// ═══════════════════════════════════════════════════════════════════════════════

exports.getSessions = async (req, res) => {
    try {
        const { AiChatSession } = req.models;
        const sessions = await AiChatSession.find({
            userId: req.user.id,
            sessionId: { $exists: true, $ne: null, $type: 'string' }
        }).sort({ lastMessageAt: -1 }).select('sessionId title lastMessageAt createdAt').limit(50);
        res.json(sessions);
    } catch (error) { console.error('Get Sessions Error:', error); res.status(500).json({ error: 'Failed to fetch chat sessions' }); }
};

exports.createSession = async (req, res) => {
    try {
        const { AiChatSession } = req.models;
        const session = await AiChatSession.create({ userId: req.user.id, title: 'New Chat', messages: [] });
        res.json({ sessionId: session.sessionId, title: session.title, createdAt: session.createdAt });
    } catch (error) { console.error('Create Session Error:', error); res.status(500).json({ error: 'Failed to create chat session' }); }
};

exports.getSessionMessages = async (req, res) => {
    try {
        const { AiChatSession } = req.models;
        const { sessionId } = req.params;
        const session = await AiChatSession.findOne({ sessionId, userId: req.user.id });
        if (!session) return res.status(404).json({ error: 'Session not found' });
        res.json({ sessionId: session.sessionId, title: session.title, messages: session.messages, createdAt: session.createdAt, lastMessageAt: session.lastMessageAt });
    } catch (error) { console.error('Get Session Messages Error:', error); res.status(500).json({ error: 'Failed to fetch session messages' }); }
};

exports.renameSession = async (req, res) => {
    try {
        const { AiChatSession } = req.models;
        const { sessionId } = req.params;
        const { title } = req.body;
        if (!isValidSessionId(sessionId)) return res.status(400).json({ error: 'Invalid session ID format' });
        if (!isValidSessionTitle(title)) return res.status(400).json({ error: 'Title must be between 1 and 100 characters' });
        const session = await AiChatSession.findOneAndUpdate({ sessionId, userId: req.user.id }, { title: sanitizeString(title) }, { new: true });
        if (!session) return res.status(404).json({ error: 'Session not found' });
        res.json({ sessionId: session.sessionId, title: session.title });
    } catch (error) { console.error('Rename Session Error:', error); res.status(500).json({ error: 'Failed to rename session' }); }
};

exports.deleteSession = async (req, res) => {
    try {
        const { AiChatSession } = req.models;
        const { sessionId } = req.params;
        if (!isValidSessionId(sessionId)) return res.status(400).json({ error: 'Invalid session ID format' });
        const session = await AiChatSession.findOneAndDelete({ sessionId, userId: req.user.id });
        if (!session) return res.status(404).json({ error: 'Session not found' });
        res.json({ message: 'Session deleted successfully' });
    } catch (error) { console.error('Delete Session Error:', error); res.status(500).json({ error: 'Failed to delete session' }); }
};

function generateSessionTitle(msg) {
    let t = msg.trim().substring(0, 50);
    if (msg.length > 50) t += '...';
    return (t.charAt(0).toUpperCase() + t.slice(1)) || 'New Chat';
}

// ═══════════════════════════════════════════════════════════════════════════════
// BOOKING STATE MACHINE (patient only)
// ═══════════════════════════════════════════════════════════════════════════════

function updateBookingState(existing, currentMessage, dbContext) {
    const state = { doctor: existing?.doctor || null, date: existing?.date || null, time: existing?.time || null, reason: existing?.reason || null };
    const doctors = dbContext.doctors || [];
    const t = currentMessage.toLowerCase();

    if (!state.doctor) {
        const matched = doctors.find(d => { const name = d.name.toLowerCase().replace(/^dr\.?\s*/i, ''); return name.split(/\s+/).some(part => part.length > 2 && t.includes(part)); });
        if (matched) state.doctor = { id: matched.id, name: matched.name };
        if (!state.doctor && doctors.length === 1 && /\b(yes|yeah|yep|ok|okay|sure|him|her|that\b|book|confirm|them)\b/i.test(t)) {
            state.doctor = { id: doctors[0].id, name: doctors[0].name };
        }
    }

    if (!state.date) {
        const today = new Date(); const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
        if (/\btomorrow\b|tmrw|\btom\b/.test(t)) state.date = tomorrow.toISOString().split('T')[0];
        else if (/\btoday\b/.test(t)) state.date = today.toISOString().split('T')[0];
        else {
            const iso = t.match(/\b(\d{4}-\d{2}-\d{2})\b/); if (iso) state.date = iso[1];
            else { const dmy = t.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\b/); if (dmy) { const d = new Date(`${dmy[3]}-${dmy[2].padStart(2,'0')}-${dmy[1].padStart(2,'0')}`); if (!isNaN(d)) state.date = d.toISOString().split('T')[0]; }
            else { const months = ['january','february','march','april','may','june','july','august','september','october','november','december'];
                const mm = t.match(/(\d{1,2})\s+(january|february|march|april|may|june|july|august|september|october|november|december)/i) || t.match(/(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})/i);
                if (mm) { const day = mm[1]||mm[2]; const mon = (mm[2]||mm[1]).toLowerCase(); const idx = months.indexOf(mon); if (idx >= 0) state.date = `${today.getFullYear()}-${String(idx+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`; }
                else { const ord = t.match(/\b(\d{1,2})(?:st|nd|rd|th)\b/); if (ord) { const day = parseInt(ord[1]); if (day >= 1 && day <= 31) { let d = new Date(today.getFullYear(), today.getMonth(), day); d.setHours(0,0,0,0); if (d < today) d = new Date(today.getFullYear(), today.getMonth()+1, day); state.date = d.toISOString().split('T')[0]; } } } } }
        }
    }

    if (!state.time) {
        if (/\bany\s*time\b|\banytime\b/i.test(t)) state.time = '10:00 AM';
        else { const hhmm = t.match(/\b(\d{1,2}):(\d{2})\s*(am|pm)?\b/i);
            if (hhmm) { let h = parseInt(hhmm[1]); const m = hhmm[2]; const ampm = hhmm[3]; if (ampm) { if (ampm.toLowerCase()==='pm'&&h<12) h+=12; if (ampm.toLowerCase()==='am'&&h===12) h=0; } const p = h>=12?'PM':'AM'; const h12 = h>12?h-12:(h===0?12:h); state.time = `${String(h12).padStart(2,'0')}:${m} ${p}`; }
            else { const simple = t.match(/\b(\d{1,2})\s*(am|pm)\b/i); if (simple) { let h = parseInt(simple[1]); const p = simple[2].toLowerCase(); if (p==='pm'&&h<12) h+=12; if (p==='am'&&h===12) h=0; const period = h>=12?'PM':'AM'; const h12 = h>12?h-12:(h===0?12:h); state.time = `${String(h12).padStart(2,'0')}:00 ${period}`; } } }
    }

    if (!state.reason) {
        const symptom = t.match(/\b(headache|fever|cold|flu|cough|pain|checkup|check.?up|consultation|follow.?up|chest pain|back pain|stomach|nausea|dizziness|vertigo|injury|fracture|rash|allergy|diabetes|hypertension|stress|anxiety|depression|fatigue|insomnia|migraine|sore throat|vomiting|diarrhea)\b/i);
        if (symptom) state.reason = symptom[1].toLowerCase();
        else { const forMatch = t.match(/\bfor\s+(?:a\s+|an\s+|my\s+)?([a-z][a-z\s]{2,50}?)(?:\s*[.,!?]|$)/i);
            if (forMatch && forMatch[1]) { const c = forMatch[1].trim(); if (!/\b(tomorrow|today|tmrw|january|february|march|april|may|june|july|august|september|october|november|december)\b|\d{4}/.test(c)) state.reason = c; } }
    }
    return state;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ALL TOOL EXECUTORS
// ═══════════════════════════════════════════════════════════════════════════════

// ── PATIENT: Appointments ────────────────────────────────────────────────────

async function bookAppointment(args, userId, models) {
    const { Appointment, DoctorDetail, User } = models;
    const validation = validateBookingParams(args);
    if (!validation.isValid) return { success: false, error: validation.errors.join(', ') };
    const { doctorId, date, time, reason, notes } = validation.sanitized;
    const doctor = await DoctorDetail.findOne({ userId: doctorId });
    if (!doctor) return { success: false, error: 'Doctor not found.' };
    const user = await User.findOne({ id: doctorId });
    const appointment = await Appointment.create({ patientId: userId, doctorId, date, time, reason, notes: notes || '', status: 'pending' });
    return { success: true, message: 'Appointment booked!', appointment: { id: appointment._id, doctorName: doctor.firstName && doctor.lastName ? `Dr. ${doctor.firstName} ${doctor.lastName}` : user?.username || 'Doctor', specialization: doctor.specialization, date, time, reason, status: 'pending' } };
}

async function searchDoctors(args, models) {
    const { Appointment, DoctorDetail, User } = models;
    const validation = validateSearchParams(args);
    if (!validation.isValid) return { success: false, error: validation.errors.join(', '), doctors: [] };
    const { specialization, name, availability } = validation.sanitized;
    let query = {};
    if (specialization) query.specialization = new RegExp(specialization, 'i');
    if (availability) query.availability = availability;
    let doctors = await DoctorDetail.find(query).limit(20).select('userId firstName lastName specialization experience availability profilePicUrl hospital');
    if (name) { const r = new RegExp(name, 'i'); doctors = doctors.filter(d => r.test(d.firstName) || r.test(d.lastName)); }
    const result = await Promise.all(doctors.map(async doc => {
        const user = await User.findOne({ id: doc.userId });
        const stats = await Appointment.aggregate([{ $match: { doctorId: doc.userId, status: 'completed' } }, { $group: { _id: null, count: { $sum: 1 }, ratings: { $sum: { $cond: [{ $eq: ['$rated', true] }, 1, 0] } }, sum: { $sum: { $cond: [{ $eq: ['$rated', true] }, '$rating', 0] } } } }]);
        const s = stats[0] || { count: 0, ratings: 0, sum: 0 };
        return { id: doc.userId, name: doc.firstName && doc.lastName ? `Dr. ${doc.firstName} ${doc.lastName}` : user?.username || 'Doctor', specialization: doc.specialization || 'General Practitioner', hospital: doc.hospital || 'N/A', rating: s.ratings > 0 ? parseFloat((s.sum / s.ratings).toFixed(1)) : 0, patientsServed: s.count };
    }));
    if (!result.length) return { success: false, message: 'No doctors found.', doctors: [] };
    return { success: true, message: `Found ${result.length} doctor(s)`, doctors: result.sort((a, b) => b.rating - a.rating).slice(0, 10) };
}

async function getAppointments(args, userId, models) {
    const { Appointment, DoctorDetail, User } = models;
    let query = { patientId: userId };
    if (args.status) query.status = args.status;
    if (args.upcoming) query.date = { $gte: new Date().toISOString().split('T')[0] };
    const appointments = await Appointment.find(query).sort({ date: 1, time: 1 }).limit(20);
    const result = await Promise.all(appointments.map(async apt => {
        const doctor = await DoctorDetail.findOne({ userId: apt.doctorId });
        const doctorUser = await User.findOne({ id: apt.doctorId });
        return { id: apt._id, doctorName: doctor?.firstName ? `Dr. ${doctor.firstName} ${doctor.lastName}` : doctorUser?.username || 'Doctor', date: apt.date, time: apt.time, reason: apt.reason, status: apt.status };
    }));
    return { success: true, message: result.length ? `Found ${result.length} appointment(s)` : 'No appointments found.', appointments: result };
}

async function cancelAppointment(args, userId, models) {
    const { Appointment } = models;
    if (!args.appointmentId) return { success: false, error: 'Provide appointmentId.' };
    const apt = await Appointment.findById(args.appointmentId);
    if (!apt) return { success: false, error: 'Not found.' };
    if (apt.patientId !== userId) return { success: false, error: 'Not your appointment.' };
    if (['cancelled', 'completed'].includes(apt.status)) return { success: false, error: `Can't cancel ${apt.status} appointment.` };
    apt.status = 'cancelled'; await apt.save();
    return { success: true, message: '✅ Appointment cancelled.' };
}

async function rateAppointment(args, userId, models) {
    const { Appointment } = models;
    const { appointmentId, rating, feedback } = args;
    if (!appointmentId || !rating) return { success: false, error: 'Provide appointmentId and rating (1-5).' };
    const apt = await Appointment.findById(appointmentId);
    if (!apt) return { success: false, error: 'Not found.' };
    if (apt.patientId !== userId) return { success: false, error: 'Not your appointment.' };
    if (apt.status !== 'completed') return { success: false, error: 'Only completed appointments can be rated.' };
    if (apt.rated) return { success: false, error: 'Already rated.' };
    apt.rating = Math.min(5, Math.max(1, parseInt(rating))); apt.feedback = feedback || ''; apt.rated = true; await apt.save();
    return { success: true, message: `⭐ Rated ${apt.rating}/5. Thank you!` };
}

async function rescheduleAppointmentPatient(args, userId, models) {
    const { Appointment } = models;
    const { appointmentId, action } = args;
    if (!appointmentId || !action) return { success: false, error: 'Provide appointmentId and action (accept/decline).' };
    const apt = await Appointment.findById(appointmentId);
    if (!apt) return { success: false, error: 'Not found.' };
    if (apt.patientId !== userId) return { success: false, error: 'Not your appointment.' };
    if (!apt.rescheduleOffer || apt.rescheduleOffer.status !== 'pending') return { success: false, error: 'No pending reschedule offer.' };
    if (action === 'decline') { apt.rescheduleOffer.status = 'declined'; await apt.save(); return { success: true, message: 'Reschedule declined.' }; }
    const newApt = await Appointment.create({ patientId: apt.patientId, doctorId: apt.doctorId, date: apt.rescheduleOffer.date, time: apt.rescheduleOffer.time, reason: apt.reason, status: 'pending' });
    apt.rescheduleOffer.status = 'accepted'; await apt.save();
    return { success: true, message: `✅ Reschedule accepted. New appointment on ${newApt.date} at ${newApt.time}.` };
}

async function getDoctorInfo(args, models) {
    const { Appointment, DoctorDetail, User } = models;
    if (!args.doctorId) return { success: false, error: 'Provide doctorId.' };
    const [doctor, user] = await Promise.all([DoctorDetail.findOne({ userId: args.doctorId }), User.findOne({ id: args.doctorId })]);
    if (!doctor || !user) return { success: false, error: 'Doctor not found.' };
    const stats = await Appointment.aggregate([{ $match: { doctorId: args.doctorId, status: 'completed' } }, { $group: { _id: null, count: { $sum: 1 }, ratings: { $sum: { $cond: [{ $eq: ['$rated', true] }, 1, 0] } }, sum: { $sum: { $cond: [{ $eq: ['$rated', true] }, '$rating', 0] } } } }]);
    const s = stats[0] || { count: 0, ratings: 0, sum: 0 };
    return { success: true, doctor: { name: doctor.firstName ? `Dr. ${doctor.firstName} ${doctor.lastName}` : user.username, specialization: doctor.specialization || 'GP', hospital: doctor.hospital || 'N/A', experience: doctor.experience || 'N/A', bio: doctor.bio || '', rating: s.ratings > 0 ? (s.sum / s.ratings).toFixed(1) : 'New', patientsServed: s.count } };
}

// ── PATIENT: Health & Records ────────────────────────────────────────────────

async function viewMedications(args, userId, models) {
    try { const meds = await models.Medication.find({ patientId: userId }).sort({ createdAt: -1 }).limit(20).lean();
        if (!meds.length) return { success: true, message: 'No medications found.', medications: [] };
        return { success: true, message: `${meds.length} medication(s)`, medications: meds.map(m => ({ name: m.name, dosage: m.dosage, frequency: m.frequency, status: m.status, instructions: m.instructions || 'As prescribed', prescribedBy: m.prescribedBy || 'Doctor' })) };
    } catch (e) { return { success: false, error: 'Could not fetch medications.' }; }
}

async function viewHealthMetrics(args, userId, models) {
    try { const metrics = await models.HealthMetric.find({ patientId: userId }).sort({ recordedAt: -1 }).limit(10).lean();
        if (!metrics.length) return { success: true, message: 'No health metrics recorded.', metrics: [] };
        return { success: true, message: `${metrics.length} reading(s)`, metrics: metrics.map(m => ({ type: m.type, value: m.value, unit: m.unit, date: m.recordedAt ? new Date(m.recordedAt).toISOString().split('T')[0] : 'N/A' })) };
    } catch (e) { return { success: false, error: 'Could not fetch health metrics.' }; }
}

async function addHealthMetric(args, userId, models) {
    try { const { type, value, unit } = args;
        if (!type || value === undefined) return { success: false, error: 'Provide type and value.' };
        const metric = new models.HealthMetric({ patientId: userId, type, value, unit: unit || '', recordedAt: new Date() });
        await metric.save();
        return { success: true, message: `✅ Recorded ${type}: ${value} ${unit || ''}` };
    } catch (e) { return { success: false, error: 'Failed to record health metric.' }; }
}

async function viewLabReports(args, userId, models) {
    try { const reports = await models.LabReport.find({ patientId: userId, status: 'sent' }).sort({ reportDate: -1 }).limit(10).lean();
        if (!reports.length) return { success: true, message: 'No lab reports found.', reports: [] };
        return { success: true, message: `${reports.length} report(s)`, reports: reports.map(r => ({ reportNumber: r.reportNumber, testName: r.testName, labName: r.labName || 'N/A', date: r.reportDate ? new Date(r.reportDate).toISOString().split('T')[0] : 'N/A', resultCount: r.results?.length || 0 })) };
    } catch (e) { return { success: false, error: 'Could not fetch lab reports.' }; }
}

async function viewMedicalRecords(args, userId, models) {
    try { const records = await models.MedicalRecord.find({ patientId: userId }).sort({ createdAt: -1 }).limit(15).lean();
        if (!records.length) return { success: true, message: 'No medical records found.', records: [] };
        return { success: true, message: `${records.length} record(s)`, records: records.map(r => ({ name: r.name, type: r.type, date: r.date || r.createdAt ? new Date(r.date || r.createdAt).toISOString().split('T')[0] : 'N/A', doctor: r.doctorName || 'N/A' })) };
    } catch (e) { return { success: false, error: 'Could not fetch medical records.' }; }
}

// ── PATIENT: Billing ─────────────────────────────────────────────────────────

async function viewInvoices(args, userId, models) {
    try { const query = { patientId: userId }; if (args.status) query.status = args.status;
        const invoices = await models.Invoice.find(query).sort({ createdAt: -1 }).limit(15).lean();
        if (!invoices.length) return { success: true, message: 'No invoices found.', invoices: [] };
        const total = invoices.reduce((s, i) => s + (i.total || 0), 0);
        const pending = invoices.filter(i => i.status === 'sent').length;
        return { success: true, message: `${invoices.length} invoice(s), ₹${total.toLocaleString()} total, ${pending} pending`, invoices: invoices.map(i => ({ invoiceNumber: i.invoiceNumber, total: i.total, status: i.status, date: i.createdAt ? new Date(i.createdAt).toISOString().split('T')[0] : 'N/A' })) };
    } catch (e) { return { success: false, error: 'Could not fetch invoices.' }; }
}

async function submitPaymentRef(args, userId, models) {
    try { const { invoiceId, paymentRef } = args;
        if (!invoiceId || !paymentRef) return { success: false, error: 'Provide invoiceId and paymentRef.' };
        const inv = await models.Invoice.findOne({ id: invoiceId });
        if (!inv) return { success: false, error: 'Invoice not found.' };
        if (inv.patientId !== userId) return { success: false, error: 'Not your invoice.' };
        if (inv.status !== 'sent') return { success: false, error: 'Invoice not in payable state.' };
        inv.paymentRef = paymentRef.trim(); inv.paymentRefSubmittedAt = new Date(); await inv.save();
        return { success: true, message: `✅ Payment reference submitted for ${inv.invoiceNumber}.` };
    } catch (e) { return { success: false, error: 'Failed to submit payment.' }; }
}

// ── PATIENT: Announcements ───────────────────────────────────────────────────

async function viewAnnouncements(args, userId, userRole, models) {
    try { const query = { $or: [{ targetAudience: 'all' }] };
        if (userRole === 'patient') query.$or.push({ targetAudience: 'patients' });
        else if (userRole === 'doctor') { query.$or.push({ targetAudience: 'doctors' }); query.$or.push({ targetAudience: 'verified_doctors' }); }
        else query.$or = undefined; // admin sees all
        const announcements = await models.Announcement.find(query?.$or ? query : {}).sort({ sentAt: -1 }).limit(10).lean();
        if (!announcements.length) return { success: true, message: 'No announcements.', announcements: [] };
        return { success: true, message: `${announcements.length} announcement(s)`, announcements: announcements.map(a => ({ title: a.title, message: a.message, priority: a.priority, date: a.sentAt ? new Date(a.sentAt).toISOString().split('T')[0] : 'N/A', audience: a.targetAudience })) };
    } catch (e) { return { success: false, error: 'Could not fetch announcements.' }; }
}

// ── INVENTORY TOOLS (Doctor + Admin) ─────────────────────────────────────────

async function searchInventory(args, models) {
    try { const query = {};
        if (args.name) query.$or = [{ name: { $regex: args.name, $options: 'i' } }, { description: { $regex: args.name, $options: 'i' } }];
        if (args.category) query.category = new RegExp(args.category, 'i');
        const items = await models.InventoryItem.find(query).sort({ name: 1 }).limit(20).lean();
        if (!items.length) return { success: true, message: 'No inventory items found.', items: [] };
        return { success: true, message: `${items.length} item(s)`, items: items.map(i => ({ id: i.id, name: i.name, category: i.category, quantity: i.quantity, unit: i.unit, purchasePrice: i.purchasePrice, sellingPrice: i.sellingPrice, status: i.status, supplier: i.supplier || 'N/A' })) };
    } catch (e) { return { success: false, error: 'Could not search inventory.' }; }
}

async function getInventoryStats(args, models) {
    try { const items = await models.InventoryItem.find({}).lean();
        const totalValue = items.reduce((s, i) => s + (i.purchasePrice || 0) * (i.quantity || 0), 0);
        const categories = {}; let lowStock = 0, outOfStock = 0;
        items.forEach(i => { categories[i.category] = (categories[i.category] || 0) + 1; if (i.status === 'low_stock' || i.quantity <= 5) lowStock++; if (i.quantity === 0) outOfStock++; });
        return { success: true, message: `${items.length} items, ₹${Math.round(totalValue).toLocaleString()} value`, stats: { totalItems: items.length, totalValue: Math.round(totalValue), lowStock, outOfStock, categories } };
    } catch (e) { return { success: false, error: 'Could not fetch inventory stats.' }; }
}

async function getLowStockAlerts(args, models) {
    try { const results = [];
        const inv = await models.InventoryItem.find({ $or: [{ status: 'low_stock' }, { status: 'out_of_stock' }, { quantity: { $lte: 5 } }] }).lean();
        inv.forEach(i => results.push({ source: 'Inventory', name: i.name, category: i.category, quantity: i.quantity, unit: i.unit, status: i.status, id: i.id }));
        if (models.PharmacyItem) { const pharm = await models.PharmacyItem.find({ $or: [{ status: 'low_stock' }, { status: 'out_of_stock' }] }).lean(); pharm.forEach(i => results.push({ source: 'Pharmacy', name: i.name, category: i.category, quantity: i.quantity, unit: i.unit, status: i.status, reorderLevel: i.reorderLevel, id: i.id })); }
        if (!results.length) return { success: true, message: '✅ All stock levels healthy!', alerts: [] };
        return { success: true, message: `⚠️ ${results.length} item(s) need attention`, alerts: results };
    } catch (e) { return { success: false, error: 'Could not fetch low stock alerts.' }; }
}

async function getExpiringItems(args, models) {
    try { if (!models.PharmacyItem) return { success: false, error: 'Pharmacy module not available.' };
        const days = args.days || 30; const now = new Date(); const cutoff = new Date(now.getTime() + days * 86400000);
        const expiring = await models.PharmacyItem.find({ expiryDate: { $gte: now, $lte: cutoff } }).sort({ expiryDate: 1 }).lean();
        const expired = await models.PharmacyItem.find({ expiryDate: { $lt: now } }).sort({ expiryDate: -1 }).limit(10).lean();
        const result = [...expired.map(i => ({ name: i.name, category: i.category, quantity: i.quantity, expiryDate: new Date(i.expiryDate).toISOString().split('T')[0], status: '❌ EXPIRED', id: i.id })), ...expiring.map(i => ({ name: i.name, category: i.category, quantity: i.quantity, expiryDate: new Date(i.expiryDate).toISOString().split('T')[0], daysLeft: Math.ceil((new Date(i.expiryDate) - now) / 86400000), status: '⚠️ Expiring', id: i.id }))];
        if (!result.length) return { success: true, message: `✅ No items expiring in ${days} days.`, items: [] };
        return { success: true, message: `${expired.length} expired + ${expiring.length} expiring in ${days} days`, items: result };
    } catch (e) { return { success: false, error: 'Could not fetch expiring items.' }; }
}

async function addInventoryItem(args, userRole, models) {
    if (!['doctor', 'admin', 'clinic_admin'].includes(userRole)) return { success: false, error: 'Permission denied.' };
    try { const { name, category, quantity, unit, purchasePrice, sellingPrice, description, supplier, location } = args;
        if (!name || !category || !unit || purchasePrice === undefined) return { success: false, error: 'Missing: name, category, unit, purchasePrice' };
        const item = await models.InventoryItem.create({ id: uuidv4(), name, category: category || 'Other', description: description || '', quantity: quantity || 1, unit: unit || 'units', location: location || '', purchaseDate: new Date(), purchasePrice, sellingPrice: sellingPrice || null, supplier: supplier || '', status: 'available' });
        return { success: true, message: `✅ Added "${name}" — ${quantity} ${unit} at ₹${purchasePrice}/each`, item: { id: item.id, name: item.name, quantity: item.quantity } };
    } catch (e) { return { success: false, error: 'Failed to add item.' }; }
}

async function updateInventoryItem(args, userRole, models) {
    if (!['doctor', 'admin', 'clinic_admin'].includes(userRole)) return { success: false, error: 'Permission denied.' };
    try { const { itemId, ...updates } = args; if (!itemId) return { success: false, error: 'Provide itemId.' };
        const item = await models.InventoryItem.findOne({ id: itemId }); if (!item) return { success: false, error: 'Item not found.' };
        const fields = ['name','category','description','quantity','unit','location','purchasePrice','sellingPrice','supplier','status','notes'];
        const changed = []; fields.forEach(f => { if (updates[f] !== undefined) { changed.push(`${f}: ${item[f]} → ${updates[f]}`); item[f] = updates[f]; } });
        if (!changed.length) return { success: false, error: 'No fields to update.' };
        await item.save(); return { success: true, message: `✅ Updated "${item.name}": ${changed.join(', ')}` };
    } catch (e) { return { success: false, error: 'Failed to update item.' }; }
}

async function deleteInventoryItem(args, userRole, models) {
    if (!['doctor', 'admin', 'clinic_admin'].includes(userRole)) return { success: false, error: 'Permission denied.' };
    try { if (!args.itemId) return { success: false, error: 'Provide itemId.' };
        const item = await models.InventoryItem.findOne({ id: args.itemId }); if (!item) return { success: false, error: 'Not found.' };
        const name = item.name; await models.InventoryItem.deleteOne({ id: args.itemId });
        return { success: true, message: `🗑️ Deleted "${name}" from inventory.` };
    } catch (e) { return { success: false, error: 'Failed to delete item.' }; }
}

// ── PHARMACY TOOLS ───────────────────────────────────────────────────────────

async function getPharmacyStock(args, models) {
    try { if (!models.PharmacyItem) return { success: false, error: 'Pharmacy not available.' };
        const query = {}; if (args.category) query.category = new RegExp(args.category, 'i');
        if (args.search) query.$or = [{ name: { $regex: args.search, $options: 'i' } }, { manufacturer: { $regex: args.search, $options: 'i' } }];
        const items = await models.PharmacyItem.find(query).sort({ name: 1 }).limit(20).lean();
        if (!items.length) return { success: true, message: 'No pharmacy items.', items: [] };
        return { success: true, message: `${items.length} item(s)`, items: items.map(i => ({ id: i.id, name: i.name, category: i.category, quantity: i.quantity, unit: i.unit, price: i.price, manufacturer: i.manufacturer, expiryDate: i.expiryDate ? new Date(i.expiryDate).toISOString().split('T')[0] : 'N/A', status: i.status })) };
    } catch (e) { return { success: false, error: 'Could not fetch pharmacy stock.' }; }
}

async function addPharmacyItem(args, userRole, models) {
    if (!['doctor', 'admin', 'clinic_admin'].includes(userRole)) return { success: false, error: 'Permission denied.' };
    try { const { name, category, manufacturer, batchNumber, expiryDate, unit, price, quantity, reorderLevel } = args;
        if (!name || !category || !manufacturer || !batchNumber || !expiryDate || !unit || price === undefined) return { success: false, error: 'Missing required fields.' };
        const item = await models.PharmacyItem.create({ id: uuidv4(), name, category, manufacturer, batchNumber, expiryDate: new Date(expiryDate), quantity: quantity || 0, unit, price, reorderLevel: reorderLevel || 10 });
        return { success: true, message: `✅ Added pharmacy item "${name}" — ${quantity || 0} ${unit} at ₹${price}` };
    } catch (e) { return { success: false, error: 'Failed to add pharmacy item.' }; }
}

async function updatePharmacyItem(args, userRole, models) {
    if (!['doctor', 'admin', 'clinic_admin'].includes(userRole)) return { success: false, error: 'Permission denied.' };
    try { const { itemId, ...updates } = args; if (!itemId) return { success: false, error: 'Provide itemId.' };
        const item = await models.PharmacyItem.findOne({ id: itemId }); if (!item) return { success: false, error: 'Not found.' };
        const fields = ['name','category','description','manufacturer','batchNumber','expiryDate','quantity','unit','price','reorderLevel','location'];
        const changed = []; fields.forEach(f => { if (updates[f] !== undefined) { changed.push(`${f}: ${item[f]} → ${updates[f]}`); item[f] = f === 'expiryDate' ? new Date(updates[f]) : updates[f]; } });
        if (!changed.length) return { success: false, error: 'No fields to update.' };
        await item.save(); return { success: true, message: `✅ Updated "${item.name}": ${changed.join(', ')}` };
    } catch (e) { return { success: false, error: 'Failed to update pharmacy item.' }; }
}

async function recordPharmacyTransaction(args, userId, userRole, models) {
    if (!['doctor', 'admin', 'clinic_admin'].includes(userRole)) return { success: false, error: 'Permission denied.' };
    try { const { itemId, type, quantity, notes } = args;
        if (!itemId || !type || quantity === undefined) return { success: false, error: 'Provide itemId, type, quantity.' };
        const item = await models.PharmacyItem.findOne({ id: itemId }); if (!item) return { success: false, error: 'Item not found.' };
        const prev = item.quantity; let newQty;
        if (['purchase', 'return'].includes(type)) newQty = prev + Math.abs(quantity);
        else if (['sale', 'expired'].includes(type)) newQty = prev - Math.abs(quantity);
        else if (type === 'adjustment') newQty = quantity;
        else return { success: false, error: 'Invalid type. Use: purchase/sale/return/expired/adjustment' };
        if (newQty < 0) return { success: false, error: 'Insufficient stock.' };
        await models.PharmacyTransaction.create({ itemId: item._id, itemName: item.name, transactionType: type, quantity: type === 'adjustment' ? quantity - prev : (type === 'purchase' || type === 'return' ? quantity : -quantity), performedBy: userId, notes: notes || '' });
        item.quantity = newQty; await item.save();
        return { success: true, message: `✅ ${type} recorded: "${item.name}" ${prev} → ${newQty} ${item.unit}` };
    } catch (e) { return { success: false, error: 'Failed to record transaction.' }; }
}

// ── DOCTOR: Appointment Management ───────────────────────────────────────────

async function confirmAppointment(args, userId, userRole, models) {
    try { const apt = await models.Appointment.findById(args.appointmentId); if (!apt) return { success: false, error: 'Not found.' };
        if (userRole === 'doctor' && apt.doctorId !== userId) return { success: false, error: 'Not your appointment.' };
        if (apt.status !== 'pending') return { success: false, error: `Can't confirm ${apt.status} appointment.` };
        apt.status = 'confirmed'; await apt.save();
        return { success: true, message: `✅ Appointment confirmed for ${apt.date} at ${apt.time}.` };
    } catch (e) { return { success: false, error: 'Failed to confirm.' }; }
}

async function completeAppointment(args, userId, userRole, models) {
    try { const apt = await models.Appointment.findById(args.appointmentId); if (!apt) return { success: false, error: 'Not found.' };
        if (userRole === 'doctor' && apt.doctorId !== userId) return { success: false, error: 'Not your appointment.' };
        apt.status = 'completed'; await apt.save();
        return { success: true, message: `✅ Appointment marked as completed.` };
    } catch (e) { return { success: false, error: 'Failed to complete.' }; }
}

async function rejectAppointment(args, userId, userRole, models) {
    try { const apt = await models.Appointment.findById(args.appointmentId); if (!apt) return { success: false, error: 'Not found.' };
        if (userRole === 'doctor' && apt.doctorId !== userId) return { success: false, error: 'Not your appointment.' };
        apt.status = 'rejected'; await apt.save();
        return { success: true, message: `Appointment rejected.` };
    } catch (e) { return { success: false, error: 'Failed to reject.' }; }
}

async function rescheduleAppointmentDoctor(args, userId, models) {
    try { const { appointmentId, newDate, newTime } = args;
        if (!appointmentId || !newDate || !newTime) return { success: false, error: 'Provide appointmentId, newDate, newTime.' };
        const apt = await models.Appointment.findById(appointmentId); if (!apt) return { success: false, error: 'Not found.' };
        if (apt.doctorId !== userId) return { success: false, error: 'Not your appointment.' };
        apt.status = 'cancelled'; apt.rescheduleOffer = { date: newDate, time: newTime, status: 'pending' }; await apt.save();
        return { success: true, message: `✅ Reschedule offered: ${newDate} at ${newTime}. Waiting for patient.` };
    } catch (e) { return { success: false, error: 'Failed to reschedule.' }; }
}

async function getDoctorReviews(args, userId, models) {
    try { const reviews = await models.Appointment.find({ doctorId: userId, status: 'completed', rated: true }).sort({ updatedAt: -1 }).limit(20).lean();
        if (!reviews.length) return { success: true, message: 'No reviews yet.', reviews: [] };
        const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
        return { success: true, message: `${reviews.length} reviews, avg ${avg.toFixed(1)}/5`, reviews: reviews.map(r => ({ rating: r.rating, feedback: r.feedback || '', date: r.updatedAt ? new Date(r.updatedAt).toISOString().split('T')[0] : 'N/A' })) };
    } catch (e) { return { success: false, error: 'Could not fetch reviews.' }; }
}

async function getDoctorStats(args, userId, userRole, models) {
    try { const doctorId = userRole === 'doctor' ? userId : args.doctorId;
        if (!doctorId) return { success: false, error: 'Provide doctorId.' };
        const stats = await models.Appointment.aggregate([{ $match: { doctorId, status: 'completed' } }, { $group: { _id: null, count: { $sum: 1 }, ratings: { $sum: { $cond: [{ $eq: ['$rated', true] }, 1, 0] } }, sum: { $sum: { $cond: [{ $eq: ['$rated', true] }, '$rating', 0] } } } }]);
        const s = stats[0] || { count: 0, ratings: 0, sum: 0 };
        const pending = await models.Appointment.countDocuments({ doctorId, status: 'pending' });
        const today = await models.Appointment.countDocuments({ doctorId, date: new Date().toISOString().split('T')[0] });
        return { success: true, message: `${s.count} completed, ${s.ratings > 0 ? (s.sum/s.ratings).toFixed(1) : 'N/A'} avg rating`, stats: { completed: s.count, avgRating: s.ratings > 0 ? parseFloat((s.sum/s.ratings).toFixed(1)) : null, totalRatings: s.ratings, pendingAppointments: pending, todayAppointments: today } };
    } catch (e) { return { success: false, error: 'Could not fetch stats.' }; }
}

// ── DOCTOR: Clinical Tools ───────────────────────────────────────────────────

async function prescribeMedication(args, userId, models) {
    try { const { patientId, name, dosage, frequency, instructions, duration } = args;
        if (!patientId || !name || !dosage || !frequency) return { success: false, error: 'Provide patientId, name, dosage, frequency.' };
        const patient = await models.User.findOne({ id: patientId, role: 'patient' }); if (!patient) return { success: false, error: 'Patient not found.' };
        const med = new models.Medication({ patientId, name, dosage, frequency, instructions: instructions || '', duration: duration || '', prescribedBy: 'Doctor', status: 'active' });
        await med.save();
        return { success: true, message: `💊 Prescribed ${name} (${dosage}, ${frequency}) to ${patient.username}.` };
    } catch (e) { return { success: false, error: 'Failed to prescribe medication.' }; }
}

async function createLabReport(args, userId, models) {
    try { const { patientId, testName, results, labName, notes } = args;
        if (!patientId || !testName || !results || !Array.isArray(results)) return { success: false, error: 'Provide patientId, testName, results array.' };
        const patient = await models.User.findOne({ id: patientId, role: 'patient' }); if (!patient) return { success: false, error: 'Patient not found.' };
        const year = new Date().getFullYear(); const count = await models.LabReport.countDocuments(); const reportNumber = `LAB-${year}-${String(count + 1).padStart(4, '0')}`;
        const report = await models.LabReport.create({ id: uuidv4(), reportNumber, doctorId: userId, patientId, testName, labName: labName || '', results, notes: notes || '', reportDate: new Date(), status: 'draft' });
        return { success: true, message: `🔬 Lab report ${reportNumber} created for ${patient.username}: ${testName}` };
    } catch (e) { return { success: false, error: 'Failed to create lab report.' }; }
}

async function getLabReportsDoctor(args, userId, models) {
    try { const query = { doctorId: userId }; if (args.status) query.status = args.status;
        const reports = await models.LabReport.find(query).sort({ createdAt: -1 }).limit(20).lean();
        if (!reports.length) return { success: true, message: 'No lab reports.', reports: [] };
        return { success: true, message: `${reports.length} report(s)`, reports: reports.map(r => ({ reportNumber: r.reportNumber, testName: r.testName, patientId: r.patientId, status: r.status, date: r.reportDate ? new Date(r.reportDate).toISOString().split('T')[0] : 'N/A' })) };
    } catch (e) { return { success: false, error: 'Could not fetch lab reports.' }; }
}

async function viewPatientRecords(args, userId, userRole, models) {
    try { if (!args.patientId) return { success: false, error: 'Provide patientId.' };
        const records = await models.MedicalRecord.find({ patientId: args.patientId }).sort({ createdAt: -1 }).limit(15).lean();
        if (!records.length) return { success: true, message: 'No records for this patient.', records: [] };
        return { success: true, message: `${records.length} record(s)`, records: records.map(r => ({ name: r.name, type: r.type, date: r.date || 'N/A', doctor: r.doctorName || 'N/A' })) };
    } catch (e) { return { success: false, error: 'Could not fetch patient records.' }; }
}

async function addMedicalRecord(args, userId, models) {
    try { const { patientId, name, type, date } = args;
        if (!patientId || !name || !type) return { success: false, error: 'Provide patientId, name, type.' };
        const record = new models.MedicalRecord({ patientId, name, type, date: date ? new Date(date) : new Date(), doctorName: 'Doctor' });
        await record.save();
        return { success: true, message: `📋 Medical record "${name}" added for patient.` };
    } catch (e) { return { success: false, error: 'Failed to add record.' }; }
}

async function viewPatientHealthMetrics(args, userId, models) {
    try { if (!args.patientId) return { success: false, error: 'Provide patientId.' };
        const metrics = await models.HealthMetric.find({ patientId: args.patientId }).sort({ recordedAt: -1 }).limit(10).lean();
        if (!metrics.length) return { success: true, message: 'No health metrics for this patient.', metrics: [] };
        return { success: true, message: `${metrics.length} reading(s)`, metrics: metrics.map(m => ({ type: m.type, value: m.value, unit: m.unit, date: m.recordedAt ? new Date(m.recordedAt).toISOString().split('T')[0] : 'N/A' })) };
    } catch (e) { return { success: false, error: 'Could not fetch patient metrics.' }; }
}

// ── DOCTOR: Billing & Services ───────────────────────────────────────────────

async function createInvoice(args, userId, userRole, models) {
    if (!['doctor', 'admin', 'clinic_admin'].includes(userRole)) return { success: false, error: 'Permission denied.' };
    try { const { patientId, items } = args;
        if (!patientId || !items || !Array.isArray(items) || !items.length) return { success: false, error: 'Provide patientId and items [{description, quantity, rate}].' };
        const patient = await models.User.findOne({ id: patientId }); if (!patient) return { success: false, error: 'Patient not found.' };
        let subtotal = 0; const validItems = items.map(i => { const amt = (i.quantity || 1) * (i.rate || i.amount || i.price || 0); subtotal += amt; return { description: i.description || i.name, quantity: i.quantity || 1, rate: i.rate || i.amount || i.price || 0, amount: amt }; });
        const year = new Date().getFullYear(); const count = await models.Invoice.countDocuments(); const invoiceNumber = `INV-${year}-${String(count + 1).padStart(4, '0')}`;
        const invoice = await models.Invoice.create({ id: uuidv4(), invoiceNumber, doctorId: userId, patientId, items: validItems, subtotal, total: subtotal, tax: 0, discount: 0, dueDate: new Date(Date.now() + 30 * 86400000), status: 'sent' });
        return { success: true, message: `✅ Invoice ${invoiceNumber} created for ${patient.username} — ₹${subtotal.toLocaleString()}` };
    } catch (e) { return { success: false, error: 'Failed to create invoice.' }; }
}

async function getInvoicesDoctor(args, userId, userRole, models) {
    try { const query = userRole === 'doctor' ? { doctorId: userId } : {};
        if (args.status) query.status = args.status;
        const invoices = await models.Invoice.find(query).sort({ createdAt: -1 }).limit(20).lean();
        if (!invoices.length) return { success: true, message: 'No invoices.', invoices: [] };
        const total = invoices.reduce((s, i) => s + (i.total || 0), 0);
        return { success: true, message: `${invoices.length} invoice(s), ₹${total.toLocaleString()} total`, invoices: invoices.map(i => ({ invoiceNumber: i.invoiceNumber, total: i.total, status: i.status, patientId: i.patientId })) };
    } catch (e) { return { success: false, error: 'Could not fetch invoices.' }; }
}

async function markInvoicePaid(args, userId, models) {
    try { if (!args.invoiceId) return { success: false, error: 'Provide invoiceId.' };
        const inv = await models.Invoice.findOne({ id: args.invoiceId }); if (!inv) return { success: false, error: 'Not found.' };
        if (inv.doctorId !== userId) return { success: false, error: 'Not your invoice.' };
        if (inv.status === 'paid') return { success: false, error: 'Already paid.' };
        inv.status = 'paid'; inv.paidDate = new Date(); await inv.save();
        return { success: true, message: `✅ Invoice ${inv.invoiceNumber} marked as paid.` };
    } catch (e) { return { success: false, error: 'Failed to mark as paid.' }; }
}

async function getServices(args, userId, models) {
    try { const services = await models.ServiceItem.find({ $or: [{ isGlobal: true }, { createdBy: userId }] }).sort({ name: 1 }).lean();
        if (!services.length) return { success: true, message: 'No services available.', services: [] };
        return { success: true, message: `${services.length} service(s)`, services: services.map(s => ({ id: s.id, name: s.name, category: s.category, price: s.defaultPrice, isGlobal: s.isGlobal })) };
    } catch (e) { return { success: false, error: 'Could not fetch services.' }; }
}

async function createService(args, userId, models) {
    try { const { name, category, defaultPrice, description } = args;
        if (!name || !category || defaultPrice === undefined) return { success: false, error: 'Provide name, category, defaultPrice.' };
        const service = await models.ServiceItem.create({ id: uuidv4(), name, description: description || '', category, defaultPrice: parseFloat(defaultPrice), createdBy: userId, isGlobal: false });
        return { success: true, message: `✅ Service "${name}" created at ₹${defaultPrice}.` };
    } catch (e) { return { success: false, error: 'Failed to create service.' }; }
}

// ── DOCTOR + ADMIN: Shared ───────────────────────────────────────────────────

async function getPatientList(args, userId, userRole, models) {
    try { const query = {};
        if (args.search) query.$or = [{ firstName: { $regex: args.search, $options: 'i' } }, { lastName: { $regex: args.search, $options: 'i' } }];
        const patients = await models.PatientDetail.find(query).limit(20).lean();
        const list = await Promise.all(patients.map(async p => { const u = await models.User.findOne({ id: p.userId }); return { id: p.userId, name: p.firstName && p.lastName ? `${p.firstName} ${p.lastName}` : u?.username || 'Patient', email: u?.email || 'N/A', phone: p.phoneNumber || 'N/A', gender: p.gender || 'N/A' }; }));
        return { success: true, message: list.length ? `${list.length} patient(s)` : 'No patients.', patients: list };
    } catch (e) { return { success: false, error: 'Could not fetch patients.' }; }
}

async function getScheduleSummary(args, userId, userRole, models) {
    try { const today = new Date().toISOString().split('T')[0];
        const query = { date: today }; if (userRole === 'doctor') query.doctorId = userId;
        const apts = await models.Appointment.find(query).sort({ time: 1 }).limit(30).lean();
        const enriched = await Promise.all(apts.map(async a => { const pu = await models.User.findOne({ id: a.patientId }); const du = userRole !== 'doctor' ? await models.User.findOne({ id: a.doctorId }) : null; return { time: a.time, patient: pu?.username || 'Patient', ...(du && { doctor: du.username }), reason: a.reason, status: a.status }; }));
        const pending = enriched.filter(a => a.status === 'pending').length; const confirmed = enriched.filter(a => a.status === 'confirmed').length;
        return { success: true, message: `Today: ${enriched.length} appointments — ${pending} pending, ${confirmed} confirmed`, appointments: enriched };
    } catch (e) { return { success: false, error: 'Could not fetch schedule.' }; }
}

// ── ADMIN-ONLY TOOLS ─────────────────────────────────────────────────────────

async function getPlatformStats(args, models) {
    try { const [users, doctors, patients, appts, pending, completed] = await Promise.all([models.User.countDocuments(), models.User.countDocuments({ role: 'doctor' }), models.User.countDocuments({ role: 'patient' }), models.Appointment.countDocuments(), models.Appointment.countDocuments({ status: 'pending' }), models.Appointment.countDocuments({ status: 'completed' })]);
        let inv = {}, pharm = {};
        if (models.InventoryItem) { const v = await models.InventoryItem.aggregate([{ $group: { _id: null, total: { $sum: { $multiply: ['$quantity', '$purchasePrice'] } } } }]); inv = { items: await models.InventoryItem.countDocuments(), value: Math.round(v[0]?.total || 0) }; }
        if (models.PharmacyItem) { pharm = { items: await models.PharmacyItem.countDocuments(), lowStock: await models.PharmacyItem.countDocuments({ status: 'low_stock' }) }; }
        return { success: true, message: `Platform: ${users} users, ${appts} appointments`, stats: { users: { total: users, doctors, patients }, appointments: { total: appts, pending, completed }, inventory: inv, pharmacy: pharm } };
    } catch (e) { return { success: false, error: 'Could not fetch platform stats.' }; }
}

async function getAnalytics(args, models) {
    try { const now = new Date(); const weekAgo = new Date(now.getTime() - 7 * 86400000);
        const [growth, active, signups, specs] = await Promise.all([
            models.User.aggregate([{ $group: { _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' }, role: '$role' }, count: { $sum: 1 } } }, { $sort: { '_id.year': 1, '_id.month': 1 } }]),
            models.User.countDocuments({ updatedAt: { $gte: new Date(now.getTime() - 30 * 86400000) } }),
            models.User.countDocuments({ createdAt: { $gte: weekAgo } }),
            models.DoctorDetail.aggregate([{ $group: { _id: '$specialization', count: { $sum: 1 } } }, { $sort: { count: -1 } }])
        ]);
        return { success: true, message: `Analytics: ${signups} new signups this week, ${active} active users`, analytics: { userGrowth: growth, activeUsers: active, newSignups: signups, specializations: specs } };
    } catch (e) { return { success: false, error: 'Could not fetch analytics.' }; }
}

async function getUserList(args, models) {
    try { const query = {}; if (args.role) query.role = args.role; if (args.search) query.$or = [{ username: { $regex: args.search, $options: 'i' } }, { email: { $regex: args.search, $options: 'i' } }];
        const users = await models.User.find(query).select('id username email role verificationStatus createdAt').sort({ createdAt: -1 }).limit(20).lean();
        return { success: true, message: users.length ? `${users.length} user(s)` : 'No users.', users: users.map(u => ({ id: u.id, username: u.username, email: u.email, role: u.role, status: u.verificationStatus })) };
    } catch (e) { return { success: false, error: 'Could not fetch users.' }; }
}

async function getAllDoctors(args, models) {
    try { const match = { role: 'doctor' }; if (args.status) match.verificationStatus = args.status;
        const doctors = await models.User.aggregate([{ $match: match }, { $lookup: { from: 'doctordetails', localField: 'id', foreignField: 'userId', as: 'details' } }, { $unwind: { path: '$details', preserveNullAndEmptyArrays: true } }, { $project: { _id: 0, id: 1, username: 1, email: 1, verificationStatus: 1, specialization: '$details.specialization', hospital: '$details.hospital' } }, { $sort: { createdAt: -1 } }]).limit(30);
        return { success: true, message: `${doctors.length} doctor(s)`, doctors };
    } catch (e) { return { success: false, error: 'Could not fetch doctors.' }; }
}

async function getPendingDoctors(args, models) {
    try { const pending = await models.User.aggregate([{ $match: { role: 'doctor', verificationStatus: 'under_review' } }, { $lookup: { from: 'doctordetails', localField: 'id', foreignField: 'userId', as: 'details' } }, { $unwind: { path: '$details', preserveNullAndEmptyArrays: true } }, { $project: { _id: 0, id: 1, username: 1, email: 1, specialization: '$details.specialization', hospital: '$details.hospital' } }]);
        if (!pending.length) return { success: true, message: '✅ No pending doctor verifications.', doctors: [] };
        return { success: true, message: `⚠️ ${pending.length} doctor(s) awaiting verification`, doctors: pending };
    } catch (e) { return { success: false, error: 'Could not fetch pending doctors.' }; }
}

async function verifyDoctor(args, models) {
    try { const { userId, action, reason } = args;
        if (!userId || !action) return { success: false, error: 'Provide userId and action (approve/reject).' };
        if (!['approve', 'reject'].includes(action)) return { success: false, error: 'Action must be approve or reject.' };
        const doctor = await models.User.findOne({ id: userId, role: 'doctor' }); if (!doctor) return { success: false, error: 'Doctor not found.' };
        if (doctor.verificationStatus === 'verified') return { success: false, error: 'Already verified.' };
        doctor.verificationStatus = action === 'approve' ? 'verified' : 'rejected';
        if (action === 'reject' && reason) doctor.rejectionReason = reason;
        await doctor.save();
        return { success: true, message: `✅ Doctor ${doctor.username} ${action === 'approve' ? 'approved' : 'rejected'}.` };
    } catch (e) { return { success: false, error: 'Failed to verify doctor.' }; }
}

async function updateUser(args, models) {
    try { const { userId, action, role } = args;
        if (!userId) return { success: false, error: 'Provide userId.' };
        const user = await models.User.findOne({ id: userId }); if (!user) return { success: false, error: 'User not found.' };
        if (action === 'suspend') user.verificationStatus = 'rejected';
        else if (action === 'activate') user.verificationStatus = 'verified';
        if (role && ['patient', 'doctor', 'admin'].includes(role)) user.role = role;
        await user.save();
        return { success: true, message: `✅ User ${user.username} updated. Status: ${user.verificationStatus}, Role: ${user.role}` };
    } catch (e) { return { success: false, error: 'Failed to update user.' }; }
}

async function deleteUser(args, models) {
    try { if (!args.userId) return { success: false, error: 'Provide userId.' };
        const user = await models.User.findOne({ id: args.userId }); if (!user) return { success: false, error: 'User not found.' };
        if (['admin', 'clinic_admin'].includes(user.role)) return { success: false, error: 'Cannot delete admin users.' };
        const username = user.username; await models.User.deleteOne({ id: args.userId });
        return { success: true, message: `🗑️ User "${username}" deleted.` };
    } catch (e) { return { success: false, error: 'Failed to delete user.' }; }
}

async function getAllAppointments(args, models) {
    try { const query = {}; if (args.status) query.status = args.status;
        const apts = await models.Appointment.find(query).sort({ date: -1, time: -1 }).limit(30).lean();
        const stats = await models.Appointment.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]);
        const statMap = {}; stats.forEach(s => statMap[s._id] = s.count);
        return { success: true, message: `${apts.length} appointment(s)`, stats: statMap, appointments: apts.map(a => ({ id: a._id, date: a.date, time: a.time, reason: a.reason, status: a.status, patientId: a.patientId, doctorId: a.doctorId })) };
    } catch (e) { return { success: false, error: 'Could not fetch appointments.' }; }
}

async function sendAnnouncement(args, userId, models) {
    try { const { title, message, targetAudience, priority } = args;
        if (!title || !message) return { success: false, error: 'Provide title and message.' };
        const announcement = await models.Announcement.create({ id: uuidv4(), title, message, targetAudience: targetAudience || 'all', priority: priority || 'medium', createdBy: userId });
        return { success: true, message: `📢 Announcement "${title}" sent to ${targetAudience || 'all'}!` };
    } catch (e) { return { success: false, error: 'Failed to send announcement.' }; }
}

async function getActivityLogs(args, models) {
    try { const logs = await models.ActivityLog.find({}).sort({ timestamp: -1 }).limit(args.limit || 20).lean();
        if (!logs.length) return { success: true, message: 'No activity logs.', logs: [] };
        return { success: true, message: `${logs.length} log(s)`, logs: logs.map(l => ({ action: l.action, email: l.adminEmail, details: l.details, date: l.timestamp ? new Date(l.timestamp).toISOString().split('T')[0] : 'N/A' })) };
    } catch (e) { return { success: false, error: 'Could not fetch logs.' }; }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MASTER TOOL PERMISSIONS & EXECUTOR
// ═══════════════════════════════════════════════════════════════════════════════

const P = { p: 'patient', d: 'doctor', a: 'admin', c: 'clinic_admin' };
const TOOL_PERMISSIONS = {
    // Patient
    book_appointment: [P.p], get_appointments: [P.p], cancel_appointment: [P.p], rate_appointment: [P.p],
    reschedule_appointment: [P.p], // patient version (accept/decline)
    view_medications: [P.p], view_health_metrics: [P.p], add_health_metric: [P.p],
    view_lab_reports: [P.p], view_medical_records: [P.p],
    view_invoices: [P.p], submit_payment_ref: [P.p],
    // Shared
    search_doctors: [P.p, P.d, P.a, P.c], get_doctor_info: [P.p, P.d, P.a, P.c],
    view_announcements: [P.p, P.d, P.a, P.c],
    // Doctor + Admin: Inventory
    search_inventory: [P.d, P.a, P.c], get_inventory_stats: [P.d, P.a, P.c],
    get_low_stock_alerts: [P.d, P.a, P.c], get_expiring_items: [P.d, P.a, P.c],
    add_inventory_item: [P.d, P.a, P.c], update_inventory_item: [P.d, P.a, P.c], delete_inventory_item: [P.d, P.a, P.c],
    get_pharmacy_stock: [P.d, P.a, P.c], add_pharmacy_item: [P.d, P.a, P.c], update_pharmacy_item: [P.d, P.a, P.c],
    record_pharmacy_transaction: [P.d, P.a, P.c],
    // Doctor + Admin: Patients & Appointments
    get_patient_list: [P.d, P.a, P.c], get_schedule_summary: [P.d, P.a, P.c],
    confirm_appointment: [P.d, P.a, P.c], complete_appointment: [P.d, P.a, P.c], reject_appointment: [P.d, P.a, P.c],
    get_doctor_reviews: [P.d], get_doctor_stats: [P.d, P.a, P.c],
    // Doctor-specific clinical
    prescribe_medication: [P.d], create_lab_report: [P.d], get_lab_reports: [P.d],
    view_patient_records: [P.d, P.a, P.c], add_medical_record: [P.d],
    view_patient_health_metrics: [P.d, P.a, P.c],
    // Doctor billing
    create_invoice: [P.d, P.a, P.c], get_invoices: [P.d, P.a, P.c], mark_invoice_paid: [P.d],
    get_services: [P.d], create_service: [P.d],
    // Doctor reschedule (offer to patient)
    'reschedule_appointment_doctor': [P.d],
    // Admin only
    get_platform_stats: [P.a, P.c], get_analytics: [P.a, P.c], get_user_list: [P.a, P.c],
    get_all_doctors: [P.a, P.c], get_pending_doctors: [P.a, P.c],
    verify_doctor: [P.a, P.c], update_user: [P.a, P.c], delete_user: [P.a, P.c],
    get_all_appointments: [P.a, P.c],
    send_announcement: [P.a, P.c], get_announcements: [P.a, P.c], get_activity_logs: [P.a, P.c],
};

async function executeToolCall(toolCall, userId, userRole, models) {
    const { name, arguments: args } = toolCall.function;
    const parsedArgs = typeof args === 'string' ? JSON.parse(args) : args;
    const allowed = TOOL_PERMISSIONS[name];
    if (allowed && !allowed.includes(userRole)) return { error: `Tool "${name}" not available for ${userRole}.` };

    try {
        switch (name) {
            case 'book_appointment': return await bookAppointment(parsedArgs, userId, models);
            case 'search_doctors': return await searchDoctors(parsedArgs, models);
            case 'get_appointments': return await getAppointments(parsedArgs, userId, models);
            case 'cancel_appointment': return await cancelAppointment(parsedArgs, userId, models);
            case 'rate_appointment': return await rateAppointment(parsedArgs, userId, models);
            case 'reschedule_appointment':
                if (userRole === 'patient') return await rescheduleAppointmentPatient(parsedArgs, userId, models);
                else return await rescheduleAppointmentDoctor(parsedArgs, userId, models);
            case 'get_doctor_info': return await getDoctorInfo(parsedArgs, models);
            case 'view_medications': return await viewMedications(parsedArgs, userId, models);
            case 'view_health_metrics': return await viewHealthMetrics(parsedArgs, userId, models);
            case 'add_health_metric': return await addHealthMetric(parsedArgs, userId, models);
            case 'view_lab_reports': return await viewLabReports(parsedArgs, userId, models);
            case 'view_medical_records': return await viewMedicalRecords(parsedArgs, userId, models);
            case 'view_invoices': return await viewInvoices(parsedArgs, userId, models);
            case 'submit_payment_ref': return await submitPaymentRef(parsedArgs, userId, models);
            case 'view_announcements': return await viewAnnouncements(parsedArgs, userId, userRole, models);
            case 'search_inventory': return await searchInventory(parsedArgs, models);
            case 'get_inventory_stats': return await getInventoryStats(parsedArgs, models);
            case 'get_low_stock_alerts': return await getLowStockAlerts(parsedArgs, models);
            case 'get_expiring_items': return await getExpiringItems(parsedArgs, models);
            case 'add_inventory_item': return await addInventoryItem(parsedArgs, userRole, models);
            case 'update_inventory_item': return await updateInventoryItem(parsedArgs, userRole, models);
            case 'delete_inventory_item': return await deleteInventoryItem(parsedArgs, userRole, models);
            case 'get_pharmacy_stock': return await getPharmacyStock(parsedArgs, models);
            case 'add_pharmacy_item': return await addPharmacyItem(parsedArgs, userRole, models);
            case 'update_pharmacy_item': return await updatePharmacyItem(parsedArgs, userRole, models);
            case 'record_pharmacy_transaction': return await recordPharmacyTransaction(parsedArgs, userId, userRole, models);
            case 'get_patient_list': return await getPatientList(parsedArgs, userId, userRole, models);
            case 'get_schedule_summary': return await getScheduleSummary(parsedArgs, userId, userRole, models);
            case 'confirm_appointment': return await confirmAppointment(parsedArgs, userId, userRole, models);
            case 'complete_appointment': return await completeAppointment(parsedArgs, userId, userRole, models);
            case 'reject_appointment': return await rejectAppointment(parsedArgs, userId, userRole, models);
            case 'get_doctor_reviews': return await getDoctorReviews(parsedArgs, userId, models);
            case 'get_doctor_stats': return await getDoctorStats(parsedArgs, userId, userRole, models);
            case 'prescribe_medication': return await prescribeMedication(parsedArgs, userId, models);
            case 'create_lab_report': return await createLabReport(parsedArgs, userId, models);
            case 'get_lab_reports': return await getLabReportsDoctor(parsedArgs, userId, models);
            case 'view_patient_records': return await viewPatientRecords(parsedArgs, userId, userRole, models);
            case 'add_medical_record': return await addMedicalRecord(parsedArgs, userId, models);
            case 'view_patient_health_metrics': return await viewPatientHealthMetrics(parsedArgs, userId, models);
            case 'create_invoice': return await createInvoice(parsedArgs, userId, userRole, models);
            case 'get_invoices': return await getInvoicesDoctor(parsedArgs, userId, userRole, models);
            case 'mark_invoice_paid': return await markInvoicePaid(parsedArgs, userId, models);
            case 'get_services': return await getServices(parsedArgs, userId, models);
            case 'create_service': return await createService(parsedArgs, userId, models);
            case 'get_platform_stats': return await getPlatformStats(parsedArgs, models);
            case 'get_analytics': return await getAnalytics(parsedArgs, models);
            case 'get_user_list': return await getUserList(parsedArgs, models);
            case 'get_all_doctors': return await getAllDoctors(parsedArgs, models);
            case 'get_pending_doctors': return await getPendingDoctors(parsedArgs, models);
            case 'verify_doctor': return await verifyDoctor(parsedArgs, models);
            case 'update_user': return await updateUser(parsedArgs, models);
            case 'delete_user': return await deleteUser(parsedArgs, models);
            case 'get_all_appointments': return await getAllAppointments(parsedArgs, models);
            case 'send_announcement': return await sendAnnouncement(parsedArgs, userId, models);
            case 'get_announcements': return await viewAnnouncements(parsedArgs, userId, userRole, models);
            case 'get_activity_logs': return await getActivityLogs(parsedArgs, models);
            default: return { error: `Unknown tool: ${name}` };
        }
    } catch (error) { console.error(`Tool error (${name}):`, error); return { error: error.message || 'Tool execution failed' }; }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEND MESSAGE HANDLER
// ═══════════════════════════════════════════════════════════════════════════════

exports.sendMessage = async (req, res) => {
    try {
        const { AiChatSession } = req.models;
        const { message, sessionId } = req.body;
        const userId = req.user.id;
        if (!isValidMessage(message)) return res.status(400).json({ error: 'Message must be 1-5000 chars' });
        if (sessionId && !isValidSessionId(sessionId)) return res.status(400).json({ error: 'Invalid session ID' });
        const sanitizedMessage = sanitizeString(message);

        let session;
        if (sessionId) { session = await AiChatSession.findOne({ sessionId, userId }); if (!session) return res.status(404).json({ error: 'Session not found' }); }
        else session = await AiChatSession.create({ userId, title: generateSessionTitle(sanitizedMessage), messages: [], bookingState: { doctor: null, date: null, time: null, reason: null } });

        const { loadDatabaseContext } = require('../services/dbContextLoader');
        const userRole = req.user.role || 'patient';
        const dbContext = await loadDatabaseContext(req.models, userRole);

        const existingState = session.bookingState || { doctor: null, date: null, time: null, reason: null };
        const bookingState = userRole === 'patient' ? updateBookingState(existingState, sanitizedMessage, dbContext) : { doctor: null, date: null, time: null, reason: null };
        if (userRole === 'patient') { session.bookingState = bookingState; session.markModified('bookingState'); }

        // Auto-fire booking
        if (userRole === 'patient' && bookingState.doctor && bookingState.date && bookingState.time && bookingState.reason) {
            const result = await bookAppointment({ doctorId: bookingState.doctor.id, date: bookingState.date, time: bookingState.time, reason: bookingState.reason }, userId, req.models);
            let msg;
            if (result.success) { const a = result.appointment; msg = `✅ Appointment booked!\n\n**Doctor:** ${a.doctorName}\n**Date:** ${a.date}\n**Time:** ${a.time}\n**Reason:** ${a.reason}\n**Status:** Pending confirmation`; }
            else msg = `Couldn't book: ${result.error || 'Try again.'}`;
            session.bookingState = { doctor: null, date: null, time: null, reason: null }; session.markModified('bookingState');
            session.messages.push({ role: 'user', content: sanitizedMessage, timestamp: new Date() });
            session.messages.push({ role: 'assistant', content: msg, timestamp: new Date(), toolsExecuted: ['book_appointment'] });
            await session.save();
            return res.json({ message: msg, sessionId: session.sessionId, toolsExecuted: ['book_appointment'] });
        }

        // Deterministic booking questions
        if (userRole === 'patient' && bookingState.doctor) {
            let q = null;
            if (!bookingState.date) q = `What date for your appointment with ${bookingState.doctor.name}? (e.g. tomorrow, 28th, March 30)`;
            else if (!bookingState.time) q = `Great, ${bookingState.date}. What time? (e.g. 10am, 2:30pm)`;
            else if (!bookingState.reason) q = `Almost there! What's the reason for your visit?`;
            if (q) { session.messages.push({ role: 'user', content: sanitizedMessage, timestamp: new Date() }); session.messages.push({ role: 'assistant', content: q, timestamp: new Date() }); await session.save(); return res.json({ message: q, sessionId: session.sessionId }); }
        }

        // LLM flow
        const history = session.messages.slice(-20).map(m => ({ role: m.role, content: m.content }));
        history.push({ role: 'user', content: sanitizedMessage });
        let aiResponse = await ollamaService.processMessage(history, userRole, dbContext, bookingState);

        if (aiResponse.toolCalls && aiResponse.toolCalls.length > 0) {
            const toolResults = await Promise.all(aiResponse.toolCalls.map(async tc => ({ name: tc.function.name, result: await executeToolCall(tc, userId, userRole, req.models) })));
            const toolMsg = toolResults.map(tr => `Tool: ${tr.name}\nResult: ${JSON.stringify(tr.result, null, 2)}`).join('\n\n');
            history.push({ role: 'user', content: `[SYSTEM: TOOL RESULTS]\n\n${toolMsg}\n\nINSTRUCTIONS: Present ONLY info from results. NO JSON. Be concise. Use markdown.` });
            aiResponse = await ollamaService.continueAfterToolExecution(history, userRole, dbContext, bookingState);
            session.messages.push({ role: 'user', content: sanitizedMessage, timestamp: new Date() });
            session.messages.push({ role: 'assistant', content: aiResponse.content, timestamp: new Date(), toolsExecuted: toolResults.map(tr => tr.name) });
            await session.save();
            return res.json({ message: aiResponse.content, sessionId: session.sessionId, toolsExecuted: toolResults.map(tr => tr.name) });
        }

        session.messages.push({ role: 'user', content: sanitizedMessage, timestamp: new Date() });
        session.messages.push({ role: 'assistant', content: aiResponse.content, timestamp: new Date() });
        await session.save();
        res.json({ message: aiResponse.content, sessionId: session.sessionId });
    } catch (error) { console.error('AI Chat Error:', error); res.status(500).json({ error: 'Failed to process message', details: error.message }); }
};

module.exports = exports;
