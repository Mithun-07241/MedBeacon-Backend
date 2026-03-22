const { v4: uuidv4 } = require('uuid');
const { isValidUserId } = require('../utils/validation');

// ─── Helpers ──────────────────────────────────────────────────────────────────

const generateLabReportNumber = async (LabReport) => {
    const year = new Date().getFullYear();
    const prefix = `LAB-${year}-`;
    const latest = await LabReport.findOne({ reportNumber: { $regex: `^${prefix}` } }).sort({ reportNumber: -1 });
    let next = 1;
    if (latest) {
        const lastNum = parseInt(latest.reportNumber.split('-')[2]);
        next = lastNum + 1;
    }
    return `${prefix}${String(next).padStart(4, '0')}`;
};

// ─── Doctor: Get patients they've treated ────────────────────────────────────

exports.getTreatedPatients = async (req, res) => {
    try {
        const { Appointment, User } = req.models;
        const doctorId = req.user.id;

        const appointments = await Appointment.find({ doctorId, status: 'completed' }).lean();
        const patientIds = [...new Set(appointments.map(a => a.patientId))];

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

// ─── Doctor: Create a lab report ─────────────────────────────────────────────

exports.createLabReport = async (req, res) => {
    try {
        const { LabReport, User } = req.models;
        const { patientId, appointmentId, testName, labName, results, notes, reportDate, status } = req.body;
        const doctorId = req.user.id;

        if (req.user.role !== 'doctor') return res.status(403).json({ error: 'Only doctors can create lab reports' });
        if (!isValidUserId(patientId)) return res.status(400).json({ error: 'Invalid patient ID' });
        if (!testName || !testName.trim()) return res.status(400).json({ error: 'Test name is required' });
        if (!results || !Array.isArray(results) || results.length === 0) {
            return res.status(400).json({ error: 'At least one result row is required' });
        }

        const patient = await User.findOne({ id: patientId, role: 'patient' });
        if (!patient) return res.status(404).json({ error: 'Patient not found' });

        const reportNumber = await generateLabReportNumber(LabReport);

        const report = await LabReport.create({
            id: uuidv4(),
            reportNumber,
            doctorId,
            patientId,
            appointmentId: appointmentId || undefined,
            testName: testName.trim(),
            labName: labName?.trim() || '',
            results, // [{ parameter, value, unit, referenceRange, flag }]
            notes: notes || '',
            reportDate: reportDate ? new Date(reportDate) : new Date(),
            status: status || 'draft',
        });

        res.status(201).json({ message: 'Lab report created successfully', report });
    } catch (error) {
        console.error('Create Lab Report Error:', error);
        res.status(500).json({ error: 'Failed to create lab report' });
    }
};

// ─── Doctor: Get all reports they've issued ──────────────────────────────────

exports.getLabReports = async (req, res) => {
    try {
        const { LabReport, User } = req.models;
        const doctorId = req.user.id;
        const { status, limit = 50 } = req.query;

        const match = { doctorId };
        if (status) match.status = status;

        const reports = await LabReport.find(match).sort({ createdAt: -1 }).limit(parseInt(limit)).lean();
        const patientIds = [...new Set(reports.map(r => r.patientId))];
        const patients = await User.find({ id: { $in: patientIds } }).select('id username email');
        const patientMap = {};
        patients.forEach(p => { patientMap[p.id] = p; });

        const enriched = reports.map(r => ({ ...r, patient: patientMap[r.patientId] || null }));

        const stats = {
            total: reports.length,
            draft: reports.filter(r => r.status === 'draft').length,
            sent: reports.filter(r => r.status === 'sent').length,
        };

        res.json({ reports: enriched, stats });
    } catch (error) {
        console.error('Get Lab Reports Error:', error);
        res.status(500).json({ error: 'Failed to fetch lab reports' });
    }
};

// ─── Doctor/Patient: Get single report ────────────────────────────────────────

exports.getLabReportById = async (req, res) => {
    try {
        const { LabReport, User } = req.models;
        const { id } = req.params;
        const report = await LabReport.findOne({ id }).lean();

        if (!report) return res.status(404).json({ error: 'Lab report not found' });

        // Access control: doctor who issued it OR the patient it belongs to
        if (req.user.role === 'doctor' && report.doctorId !== req.user.id) return res.status(403).json({ error: 'Access denied' });
        if (req.user.role === 'patient' && report.patientId !== req.user.id) return res.status(403).json({ error: 'Access denied' });

        const [patient, doctor] = await Promise.all([
            User.findOne({ id: report.patientId }).select('id username email'),
            User.findOne({ id: report.doctorId }).select('id username email'),
        ]);

        res.json({ ...report, patient, doctor });
    } catch (error) {
        console.error('Get Lab Report Error:', error);
        res.status(500).json({ error: 'Failed to fetch lab report' });
    }
};

// ─── Doctor: Update report ────────────────────────────────────────────────────

exports.updateLabReport = async (req, res) => {
    try {
        const { LabReport } = req.models;
        const { id } = req.params;
        const { testName, labName, results, notes, reportDate, status } = req.body;

        const report = await LabReport.findOne({ id });
        if (!report) return res.status(404).json({ error: 'Lab report not found' });
        if (report.doctorId !== req.user.id) return res.status(403).json({ error: 'Access denied' });

        if (testName) report.testName = testName.trim();
        if (labName !== undefined) report.labName = labName.trim();
        if (results && Array.isArray(results) && results.length > 0) report.results = results;
        if (notes !== undefined) report.notes = notes;
        if (reportDate) report.reportDate = new Date(reportDate);
        if (status && ['draft', 'sent'].includes(status)) report.status = status;

        await report.save();
        res.json({ message: 'Lab report updated', report });
    } catch (error) {
        console.error('Update Lab Report Error:', error);
        res.status(500).json({ error: 'Failed to update lab report' });
    }
};

// ─── Doctor: Delete report (draft only) ──────────────────────────────────────

exports.deleteLabReport = async (req, res) => {
    try {
        const { LabReport } = req.models;
        const { id } = req.params;

        const report = await LabReport.findOne({ id });
        if (!report) return res.status(404).json({ error: 'Lab report not found' });
        if (report.doctorId !== req.user.id) return res.status(403).json({ error: 'Access denied' });
        if (report.status !== 'draft') return res.status(400).json({ error: 'Only draft reports can be deleted' });

        await LabReport.deleteOne({ id });
        res.json({ message: 'Lab report deleted' });
    } catch (error) {
        console.error('Delete Lab Report Error:', error);
        res.status(500).json({ error: 'Failed to delete lab report' });
    }
};

// ─── Patient: Get their own lab reports ──────────────────────────────────────

exports.getPatientLabReports = async (req, res) => {
    try {
        const { LabReport, User } = req.models;
        const patientId = req.user.id;

        if (req.user.role !== 'patient') return res.status(403).json({ error: 'Only patients can access this' });

        const reports = await LabReport.find({ patientId, status: 'sent' })
            .sort({ reportDate: -1 })
            .lean();

        const doctorIds = [...new Set(reports.map(r => r.doctorId))];
        const doctors = await User.find({ id: { $in: doctorIds } }).select('id username email');
        const doctorMap = {};
        doctors.forEach(d => { doctorMap[d.id] = d; });

        const enriched = reports.map(r => ({ ...r, doctor: doctorMap[r.doctorId] || null }));

        res.json({ reports: enriched });
    } catch (error) {
        console.error('Get Patient Lab Reports Error:', error);
        res.status(500).json({ error: 'Failed to fetch your lab reports' });
    }
};
