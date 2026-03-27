const { v4: uuidv4 } = require('uuid');
const { isValidUserId } = require('../utils/validation');
const { getIO, onlineUsers } = require('../utils/socket');

const generateInvoiceNumber = async (Invoice) => {
    const year = new Date().getFullYear();
    const prefix = `INV-${year}-`;
    const latestInvoice = await Invoice.findOne({ invoiceNumber: { $regex: `^${prefix}` } }).sort({ invoiceNumber: -1 });
    let nextNumber = 1;
    if (latestInvoice) {
        const lastNumber = parseInt(latestInvoice.invoiceNumber.split('-')[2]);
        nextNumber = lastNumber + 1;
    }
    return `${prefix}${String(nextNumber).padStart(4, '0')}`;
};

exports.getTreatedPatients = async (req, res) => {
    try {
        const { Appointment, User } = req.models;
        const doctorId = req.user.id;

        const appointments = await Appointment.find({ doctorId, status: 'completed' }).lean();
        const patientIds = [...new Set(appointments.map(apt => apt.patientId))];

        if (patientIds.length === 0) return res.json({ patients: [] });

        const patients = await User.aggregate([
            { $match: { id: { $in: patientIds }, role: 'patient' } },
            { $lookup: { from: 'patientdetails', localField: 'id', foreignField: 'userId', as: 'details' } },
            { $unwind: { path: '$details', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    _id: 0, id: 1, username: 1, email: 1,
                    firstName: '$details.firstName', lastName: '$details.lastName',
                    phoneNumber: '$details.phoneNumber'
                }
            }
        ]);

        res.json({ patients });
    } catch (error) {
        console.error('Get Treated Patients Error:', error);
        res.status(500).json({ error: 'Failed to fetch treated patients' });
    }
};

exports.createInvoice = async (req, res) => {
    try {
        const { Invoice, User, ClinicProfile } = req.models;
        const { patientId, appointmentId, items, tax, discount, dueDate, notes, upiId: bodyUpiId, status: bodyStatus } = req.body;
        const doctorId = req.user.id;

        if (req.user.role !== 'doctor') return res.status(403).json({ error: 'Only doctors can create invoices' });
        if (!isValidUserId(patientId)) return res.status(400).json({ error: 'Invalid patient ID' });

        const patient = await User.findOne({ id: patientId, role: 'patient' });
        if (!patient) return res.status(404).json({ error: 'Patient not found' });

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'At least one item is required' });
        }

        // Resolve UPI ID: use what the frontend sent, or fall back to the clinic's stored UPI ID
        let resolvedUpiId = bodyUpiId || '';
        if (!resolvedUpiId && ClinicProfile) {
            const clinicDoc = await ClinicProfile.findOne({ isSingleton: true }).lean();
            resolvedUpiId = clinicDoc?.upiId || '';
        }

        let subtotal = 0;
        const validatedItems = items.map(item => {
            const amount = item.quantity * item.rate;
            subtotal += amount;
            return { description: item.description, quantity: item.quantity, rate: item.rate, amount };
        });

        const taxPercent = tax || 0;
        const discountPercent = discount || 0;
        const taxAmount = (subtotal * taxPercent) / 100;
        const discountAmount = (subtotal * discountPercent) / 100;
        const total = subtotal + taxAmount - discountAmount;

        const invoiceNumber = await generateInvoiceNumber(Invoice);

        const invoice = await Invoice.create({
            id: uuidv4(), invoiceNumber, doctorId, patientId,
            appointmentId: appointmentId || undefined,
            items: validatedItems, subtotal, taxPercent, discountPercent,
            tax: taxAmount, discount: discountAmount, total,
            dueDate: new Date(dueDate), notes: notes || '',
            upiId: resolvedUpiId,
            status: ['draft', 'sent'].includes(bodyStatus) ? bodyStatus : 'draft'
        });

        res.status(201).json({ message: 'Invoice created successfully', invoice });
    } catch (error) {
        console.error('Create Invoice Error:', error);
        res.status(500).json({ error: 'Failed to create invoice' });
    }

};

exports.getInvoices = async (req, res) => {
    try {
        const { Invoice, User } = req.models;
        const doctorId = req.user.id;
        const { status, startDate, endDate, limit = 50 } = req.query;

        const match = { doctorId };
        if (status) match.status = status;
        if (startDate || endDate) {
            match.createdAt = {};
            if (startDate) match.createdAt.$gte = new Date(startDate);
            if (endDate) match.createdAt.$lte = new Date(endDate);
        }

        const invoices = await Invoice.find(match).sort({ createdAt: -1 }).limit(parseInt(limit)).lean();
        const patientIds = [...new Set(invoices.map(inv => inv.patientId))];
        const patients = await User.find({ id: { $in: patientIds } }).select('id username email');

        const patientMap = {};
        patients.forEach(p => { patientMap[p.id] = p; });

        const enrichedInvoices = invoices.map(inv => ({ ...inv, patient: patientMap[inv.patientId] || null }));

        const stats = {
            total: invoices.length,
            draft: invoices.filter(i => i.status === 'draft').length,
            sent: invoices.filter(i => i.status === 'sent').length,
            paid: invoices.filter(i => i.status === 'paid').length,
            totalAmount: invoices.reduce((sum, i) => sum + i.total, 0),
            paidAmount: invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.total, 0)
        };

        res.json({ invoices: enrichedInvoices, stats });
    } catch (error) {
        console.error('Get Invoices Error:', error);
        res.status(500).json({ error: 'Failed to fetch invoices' });
    }
};

exports.getInvoiceById = async (req, res) => {
    try {
        const { Invoice, User } = req.models;
        const { id } = req.params;
        const invoice = await Invoice.findOne({ id }).lean();

        if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
        if (req.user.role === 'doctor' && invoice.doctorId !== req.user.id) return res.status(403).json({ error: 'Access denied' });

        const [patient, doctor] = await Promise.all([
            User.findOne({ id: invoice.patientId }).select('id username email'),
            User.findOne({ id: invoice.doctorId }).select('id username email')
        ]);

        res.json({ ...invoice, patient, doctor });
    } catch (error) {
        console.error('Get Invoice Error:', error);
        res.status(500).json({ error: 'Failed to fetch invoice' });
    }
};

exports.updateInvoice = async (req, res) => {
    try {
        const { Invoice } = req.models;
        const { id } = req.params;
        const { items, tax, discount, dueDate, notes, status } = req.body;

        const invoice = await Invoice.findOne({ id });
        if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
        if (invoice.doctorId !== req.user.id) return res.status(403).json({ error: 'Access denied' });
        if (invoice.status === 'paid' || invoice.status === 'cancelled') {
            return res.status(400).json({ error: `Cannot edit ${invoice.status} invoices` });
        }

        if (items && Array.isArray(items) && items.length > 0) {
            let subtotal = 0;
            const validatedItems = items.map(item => {
                const amount = item.quantity * item.rate;
                subtotal += amount;
                return { description: item.description, quantity: item.quantity, rate: item.rate, amount };
            });
            invoice.items = validatedItems;
            invoice.subtotal = subtotal;
        }

        if (tax !== undefined) invoice.tax = tax;
        if (discount !== undefined) invoice.discount = discount;
        if (dueDate) invoice.dueDate = new Date(dueDate);
        if (notes !== undefined) invoice.notes = notes;
        if (status && ['draft', 'sent', 'cancelled'].includes(status)) invoice.status = status;

        invoice.total = invoice.subtotal + invoice.tax - invoice.discount;
        await invoice.save();

        res.json({ message: 'Invoice updated successfully', invoice });
    } catch (error) {
        console.error('Update Invoice Error:', error);
        res.status(500).json({ error: 'Failed to update invoice' });
    }
};

exports.deleteInvoice = async (req, res) => {
    try {
        const { Invoice } = req.models;
        const { id } = req.params;

        const invoice = await Invoice.findOne({ id });
        if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
        if (invoice.doctorId !== req.user.id) return res.status(403).json({ error: 'Access denied' });
        if (invoice.status !== 'draft') return res.status(400).json({ error: 'Only draft invoices can be deleted' });

        await Invoice.deleteOne({ id });
        res.json({ message: 'Invoice deleted successfully' });
    } catch (error) {
        console.error('Delete Invoice Error:', error);
        res.status(500).json({ error: 'Failed to delete invoice' });
    }
};

exports.getPatientInvoices = async (req, res) => {
    try {
        const { Invoice, User } = req.models;
        const patientId = req.user.id;

        if (req.user.role !== 'patient') return res.status(403).json({ error: 'Only patients can access their invoices' });

        const invoices = await Invoice.find({ patientId, status: { $in: ['sent', 'paid'] } })
            .sort({ createdAt: -1 })
            .lean();

        const doctorIds = [...new Set(invoices.map(inv => inv.doctorId))];
        const doctors = await User.find({ id: { $in: doctorIds } }).select('id username email');
        const doctorMap = {};
        doctors.forEach(d => { doctorMap[d.id] = d; });

        const enriched = invoices.map(inv => ({ ...inv, doctor: doctorMap[inv.doctorId] || null }));

        const pendingCount = invoices.filter(i => i.status === 'sent').length;
        res.json({ invoices: enriched, pendingCount });
    } catch (error) {
        console.error('Get Patient Invoices Error:', error);
        res.status(500).json({ error: 'Failed to fetch your invoices' });
    }
};

exports.submitPaymentRef = async (req, res) => {
    try {
        const { Invoice } = req.models;
        const { id } = req.params;
        const { paymentRef } = req.body;

        if (req.user.role !== 'patient') return res.status(403).json({ error: 'Only patients can submit payment references' });
        if (!paymentRef || !paymentRef.trim()) return res.status(400).json({ error: 'Payment reference is required' });

        const invoice = await Invoice.findOne({ id });
        if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
        if (invoice.patientId !== req.user.id) return res.status(403).json({ error: 'Access denied' });
        if (invoice.status === 'paid') return res.status(400).json({ error: 'Invoice is already paid' });
        if (invoice.status !== 'sent') return res.status(400).json({ error: 'Invoice is not in payable state' });

        invoice.paymentRef = paymentRef.trim();
        invoice.paymentRefSubmittedAt = new Date();
        await invoice.save();

        res.json({ message: 'Payment reference submitted successfully', invoice });
    } catch (error) {
        console.error('Submit Payment Ref Error:', error);
        res.status(500).json({ error: 'Failed to submit payment reference' });
    }
};

exports.markAsPaid = async (req, res) => {
    try {
        const { Invoice } = req.models;
        const { id } = req.params;
        const { paidDate } = req.body;

        const invoice = await Invoice.findOne({ id });
        if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
        if (invoice.doctorId !== req.user.id) return res.status(403).json({ error: 'Access denied' });
        if (invoice.status === 'paid') return res.status(400).json({ error: 'Invoice is already marked as paid' });

        invoice.status = 'paid';
        invoice.paidDate = paidDate ? new Date(paidDate) : new Date();
        await invoice.save();

        // 🔔 Notify patient in real-time via Socket.IO
        try {
            const io = getIO();
            const patientSocketId = onlineUsers.get(invoice.patientId);
            if (patientSocketId) {
                io.to(patientSocketId).emit('payment_confirmed', {
                    invoiceId: invoice.id,
                    invoiceNumber: invoice.invoiceNumber,
                    total: invoice.total,
                    paidDate: invoice.paidDate,
                });
            }
        } catch (socketErr) {
            // Non-fatal — don't fail the request if socket push fails
            console.warn('Socket push failed:', socketErr.message);
        }

        res.json({ message: 'Invoice marked as paid', invoice });
    } catch (error) {
        console.error('Mark As Paid Error:', error);
        res.status(500).json({ error: 'Failed to mark invoice as paid' });
    }
};

// Lightweight status-check endpoint for payment polling
exports.getInvoiceStatus = async (req, res) => {
    try {
        const { Invoice } = req.models;
        const { id } = req.params;
        const invoice = await Invoice.findOne({ id }).select('id patientId status paidDate total invoiceNumber').lean();
        if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
        if (req.user.role === 'patient' && invoice.patientId !== req.user.id) return res.status(403).json({ error: 'Access denied' });
        res.json({ status: invoice.status, paidDate: invoice.paidDate, invoiceNumber: invoice.invoiceNumber, total: invoice.total });
    } catch (error) {
        console.error('Get Invoice Status Error:', error);
        res.status(500).json({ error: 'Failed to get invoice status' });
    }
};

exports.exportInvoicePDF = async (req, res) => {
    try {
        const { Invoice, User } = req.models;
        const { id } = req.params;
        const invoice = await Invoice.findOne({ id }).lean();

        if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
        if (req.user.role === 'doctor' && invoice.doctorId !== req.user.id) return res.status(403).json({ error: 'Access denied' });

        const [patient, doctor] = await Promise.all([
            User.findOne({ id: invoice.patientId }).select('id username email'),
            User.findOne({ id: invoice.doctorId }).select('id username email')
        ]);

        res.json({ invoice, patient, doctor, message: 'PDF generation to be implemented on frontend' });
    } catch (error) {
        console.error('Export PDF Error:', error);
        res.status(500).json({ error: 'Failed to export invoice' });
    }
};
