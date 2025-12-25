const Medication = require("../models/Medication");

exports.getMedications = async (req, res) => {
    try {
        const query = {};
        // If patient, only show own meds. If doctor, can query by patientId
        if (req.user.role === 'patient') {
            query.patientId = req.user.id;
        } else if (req.query.patientId) {
            query.patientId = req.query.patientId;
        }

        const medications = await Medication.find(query).sort({ createdAt: -1 });
        res.status(200).json({ medications });
    } catch (error) {
        res.status(500).json({ message: "Error fetching medications", error: error.message });
    }
};

exports.createMedication = async (req, res) => {
    try {
        const newMedication = new Medication({
            ...req.body,
            patientId: req.body.patientId || req.user.id, // Allow setting patientId if doctor creating
            prescribedBy: req.user.username
        });
        const savedMedication = await newMedication.save();
        res.status(201).json({ medication: savedMedication });
    } catch (error) {
        res.status(500).json({ message: "Error creating medication", error: error.message });
    }
};

exports.updateMedication = async (req, res) => {
    try {
        const { id } = req.params;
        const updatedMedication = await Medication.findOneAndUpdate(
            { id: id }, // Search by custom UUID id field, not _id
            req.body,
            { new: true }
        );

        if (!updatedMedication) {
            return res.status(404).json({ message: "Medication not found" });
        }

        res.status(200).json({ medication: updatedMedication });
    } catch (error) {
        res.status(500).json({ message: "Error updating medication", error: error.message });
    }
};

exports.deleteMedication = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedMedication = await Medication.findOneAndDelete({ id: id });

        if (!deletedMedication) {
            return res.status(404).json({ message: "Medication not found" });
        }

        res.status(200).json({ message: "Medication deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Error deleting medication", error: error.message });
    }
};
