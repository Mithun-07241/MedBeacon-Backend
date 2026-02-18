const { v4: uuidv4 } = require('uuid');

exports.getClinicProfile = async (req, res) => {
    try {
        const { ClinicProfile } = req.models;

        // Atomic upsert — avoids duplicate key race condition
        const clinic = await ClinicProfile.findOneAndUpdate(
            { isSingleton: true },
            { $setOnInsert: { id: uuidv4(), clinicName: 'MedBeacon Health Center', description: 'Comprehensive healthcare services', isSingleton: true } },
            { upsert: true, new: true }
        );

        res.json({ clinic });
    } catch (error) {
        console.error('Get Clinic Profile Error:', error);
        res.status(500).json({ error: 'Failed to fetch clinic profile' });
    }
};

exports.updateClinicProfile = async (req, res) => {
    try {
        const { ClinicProfile } = req.models;
        if (!['admin', 'clinic_admin'].includes(req.user.role)) {
            return res.status(403).json({ error: 'Only admins can update clinic profile' });
        }

        const { clinicName, address, city, state, zipCode, phone, email, website, taxId, description } = req.body;

        // Build the $set payload — only include fields that were provided
        const updates = {};
        if (clinicName) updates.clinicName = clinicName;
        if (address !== undefined) updates.address = address;
        if (city !== undefined) updates.city = city;
        if (state !== undefined) updates.state = state;
        if (zipCode !== undefined) updates.zipCode = zipCode;
        if (phone !== undefined) updates.phone = phone;
        if (email !== undefined) updates.email = email;
        if (website !== undefined) updates.website = website;
        if (taxId !== undefined) updates.taxId = taxId;
        if (description !== undefined) updates.description = description;

        // Atomic upsert — avoids duplicate key race condition
        const clinic = await ClinicProfile.findOneAndUpdate(
            { isSingleton: true },
            {
                $set: updates,
                $setOnInsert: { id: uuidv4(), isSingleton: true, clinicName: clinicName || 'MedBeacon Health Center' }
            },
            { upsert: true, new: true }
        );

        res.json({ message: 'Clinic profile updated successfully', clinic });
    } catch (error) {
        console.error('Update Clinic Profile Error:', error);
        res.status(500).json({ error: 'Failed to update clinic profile' });
    }
};

exports.uploadClinicLogo = async (req, res) => {
    try {
        const { ClinicProfile } = req.models;
        if (!['admin', 'clinic_admin'].includes(req.user.role)) {
            return res.status(403).json({ error: 'Only admins can upload clinic logo' });
        }
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

        const logoUrl = req.file.path || `/uploads/${req.file.filename}`;

        // Atomic upsert — avoids duplicate key race condition
        const clinic = await ClinicProfile.findOneAndUpdate(
            { isSingleton: true },
            {
                $set: { clinicLogoUrl: logoUrl },
                $setOnInsert: { id: uuidv4(), clinicName: 'MedBeacon Health Center', isSingleton: true }
            },
            { upsert: true, new: true }
        );

        res.json({ message: 'Logo uploaded successfully', logoUrl, clinic });
    } catch (error) {
        console.error('Upload Clinic Logo Error:', error);
        res.status(500).json({ error: 'Failed to upload logo' });
    }
};

exports.completeSetup = async (req, res) => {
    try {
        const { ClinicProfile } = req.models;
        if (!['admin', 'clinic_admin'].includes(req.user.role)) {
            return res.status(403).json({ error: 'Only admins can complete setup' });
        }

        const clinic = await ClinicProfile.findOneAndUpdate(
            { isSingleton: true },
            { $set: { setupComplete: true } },
            { new: true }
        );

        res.json({ message: 'Setup completed', clinic });
    } catch (error) {
        console.error('Complete Setup Error:', error);
        res.status(500).json({ error: 'Failed to complete setup' });
    }
};
