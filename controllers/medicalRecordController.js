exports.getMedicalRecords = async (req, res) => {
    try {
        const { MedicalRecord, LabReport, User } = req.models;
        const query = {};
        if (req.user.role === 'patient') query.patientId = req.user.id;
        else if (req.query.patientId) query.patientId = req.query.patientId;

        // Manually uploaded records
        const manualRecords = await MedicalRecord.find(query).sort({ createdAt: -1 }).lean();

        // For patients, also merge in lab reports issued by doctors (status = 'sent')
        let labReportRecords = [];
        if (req.user.role === 'patient') {
            const labReports = await LabReport.find({ patientId: req.user.id, status: 'sent' })
                .sort({ reportDate: -1 })
                .lean();

            const doctorIds = [...new Set(labReports.map(r => r.doctorId))];
            const doctors = doctorIds.length
                ? await User.find({ id: { $in: doctorIds } }).select('id username firstName lastName').lean()
                : [];
            const doctorMap = {};
            doctors.forEach(d => {
                doctorMap[d.id] = d.firstName
                    ? `Dr. ${d.firstName}${d.lastName ? ' ' + d.lastName : ''}`
                    : `Dr. ${d.username}`;
            });

            labReportRecords = labReports.map(r => ({
                _id: r._id,
                id: r.id,
                patientId: r.patientId,
                name: r.testName,
                type: 'Lab Result',
                date: r.reportDate || r.createdAt,
                doctor: doctorMap[r.doctorId] || 'Doctor',
                fileUrl: null,
                source: 'lab_report',
                labReportId: r.id,
                results: r.results,
                notes: r.notes,
                labName: r.labName,
                reportNumber: r.reportNumber,
            }));
        }

        const records = [
            ...manualRecords.map(r => ({ ...r, source: 'manual' })),
            ...labReportRecords,
        ].sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));

        res.status(200).json({ records });
    } catch (error) {
        console.error('Get Medical Records Error:', error);
        res.status(500).json({ message: 'Error fetching medical records', error: error.message });
    }
};

exports.createMedicalRecord = async (req, res) => {
    try {
        const { MedicalRecord } = req.models;
        const newRecord = new MedicalRecord({
            ...req.body,
            patientId: req.body.patientId || req.user.id,
            doctorName: req.body.doctorName || req.body.doctor || (req.user.role === 'doctor' ? req.user.username : null),
            fileUrl: req.body.fileUrl || '',
        });
        const savedRecord = await newRecord.save();
        res.status(201).json({ record: savedRecord });
    } catch (error) {
        console.error('Create Medical Record Error:', error);
        res.status(500).json({ message: 'Error creating medical record', error: error.message });
    }
};

exports.deleteMedicalRecord = async (req, res) => {
    try {
        const { MedicalRecord } = req.models;
        const { id } = req.params;
        const deletedRecord = await MedicalRecord.findOneAndDelete({ id });
        if (!deletedRecord) return res.status(404).json({ message: 'Record not found' });
        res.status(200).json({ message: 'Medical record deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting medical record', error: error.message });
    }
};
