const { v4: uuidv4 } = require('uuid');
const { isValidUserId } = require('../utils/validation');

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
        const { Invoice, User } = req.models;
        const { patientId, appointmentId, items, tax, discount, dueDate, notes } = req.body;
        const doctorId = req.user.id;

        if (req.user.role !== 'doctor') return res.status(403).json({ error: 'Only doctors can create invoices' });
        if (!isValidUserId(patientId)) return res.status(400).json({ error: 'Invalid patient ID' });

        const patient = await User.findOne({ id: patientId, role: 'patient' });
        if (!patient) return res.status(404).json({ error: 'Patient not found' });

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'At least one item is required' });
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
            dueDate: new Date(dueDate), notes: notes || ''
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

        res.json({ message: 'Invoice marked as paid', invoice });
    } catch (error) {
        console.error('Mark As Paid Error:', error);
        res.status(500).json({ error: 'Failed to mark invoice as paid' });
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
