const ClinicProfile = require("../models/ClinicProfile");
const { v4: uuidv4 } = require("uuid");

/**
 * Get clinic profile (public - anyone can fetch)
 */
exports.getClinicProfile = async (req, res) => {
    try {
        let clinic = await ClinicProfile.findOne({ isSingleton: true });

        // If no clinic profile exists, create a default one
        if (!clinic) {
            clinic = await ClinicProfile.create({
                id: uuidv4(),
                clinicName: "MedBeacon Health Center",
                description: "Comprehensive healthcare services",
                isSingleton: true
            });
        }

        res.json({ clinic });
    } catch (error) {
        console.error("Get Clinic Profile Error:", error);
        res.status(500).json({ error: "Failed to fetch clinic profile" });
    }
};

/**
 * Update clinic profile (admin only)
 */
exports.updateClinicProfile = async (req, res) => {
    try {
        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: "Only admins can update clinic profile" });
        }

        const {
            clinicName,
            address,
            city,
            state,
            zipCode,
            phone,
            email,
            website,
            taxId,
            description
        } = req.body;

        let clinic = await ClinicProfile.findOne({ isSingleton: true });

        // If no clinic exists, create one
        if (!clinic) {
            clinic = await ClinicProfile.create({
                id: uuidv4(),
                clinicName: clinicName || "MedBeacon Health Center",
                address,
                city,
                state,
                zipCode,
                phone,
                email,
                website,
                taxId,
                description,
                isSingleton: true
            });
        } else {
            // Update existing clinic
            if (clinicName) clinic.clinicName = clinicName;
            if (address !== undefined) clinic.address = address;
            if (city !== undefined) clinic.city = city;
            if (state !== undefined) clinic.state = state;
            if (zipCode !== undefined) clinic.zipCode = zipCode;
            if (phone !== undefined) clinic.phone = phone;
            if (email !== undefined) clinic.email = email;
            if (website !== undefined) clinic.website = website;
            if (taxId !== undefined) clinic.taxId = taxId;
            if (description !== undefined) clinic.description = description;

            await clinic.save();
        }

        res.json({
            message: "Clinic profile updated successfully",
            clinic
        });
    } catch (error) {
        console.error("Update Clinic Profile Error:", error);
        res.status(500).json({ error: "Failed to update clinic profile" });
    }
};

/**
 * Upload clinic logo (admin only)
 */
exports.uploadClinicLogo = async (req, res) => {
    try {
        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: "Only admins can upload clinic logo" });
        }

        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        // For Cloudinary, use the secure URL provided
        const logoUrl = req.file.path || `/uploads/${req.file.filename}`;

        let clinic = await ClinicProfile.findOne({ isSingleton: true });

        if (!clinic) {
            // Create clinic if doesn't exist
            clinic = await ClinicProfile.create({
                id: uuidv4(),
                clinicName: "MedBeacon Health Center",
                clinicLogoUrl: logoUrl,
                isSingleton: true
            });
        } else {
            clinic.clinicLogoUrl = logoUrl;
            await clinic.save();
        }

        res.json({
            message: "Logo uploaded successfully",
            logoUrl,
            clinic
        });
    } catch (error) {
        console.error("Upload Clinic Logo Error:", error);
        res.status(500).json({ error: "Failed to upload logo" });
    }
};
