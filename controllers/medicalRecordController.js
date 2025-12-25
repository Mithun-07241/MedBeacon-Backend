const MedicalRecord = require("../models/MedicalRecord");

exports.getMedicalRecords = async (req, res) => {
    try {
        const query = {};
        if (req.user.role === 'patient') {
            query.patientId = req.user.id;
        } else if (req.query.patientId) {
            query.patientId = req.query.patientId;
        }

        const records = await MedicalRecord.find(query).sort({ date: -1 });
        res.status(200).json({ records });
    } catch (error) {
        res.status(500).json({ message: "Error fetching medical records", error: error.message });
    }
};

exports.createMedicalRecord = async (req, res) => {
    try {
        // In a real app, file upload middleware would handle the file first
        // Here we assume fileUrl is passed in body for now (mocks or external storage)
        const newRecord = new MedicalRecord({
            ...req.body,
            patientId: req.body.patientId || req.user.id,
            doctorName: req.body.doctorName || (req.user.role === 'doctor' ? req.user.username : null)
        });
        const savedRecord = await newRecord.save();
        res.status(201).json({ record: savedRecord });
    } catch (error) {
        res.status(500).json({ message: "Error creating medical record", error: error.message });
    }
};

exports.deleteMedicalRecord = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedRecord = await MedicalRecord.findOneAndDelete({ id: id });
        if (!deletedRecord) {
            return res.status(404).json({ message: "Record not found" });
        }
        res.status(200).json({ message: "Medical record deleted" });
    } catch (error) {
        res.status(500).json({ message: "Error deleting medical record", error: error.message });
    }
};
