const mongoose = require('mongoose');
const User = require('./models/User');
const PatientDetail = require('./models/PatientDetail');
const DoctorDetail = require('./models/DoctorDetail');
require('dotenv').config();

/**
 * Migration script to fix existing database records
 * Converts localhost URLs to Cloudinary URLs
 * 
 * Run with: node migrateCloudinaryUrls.js
 */

async function migrateUrls() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        const cloudinaryBaseUrl = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload`;

        // Function to convert localhost URL to Cloudinary URL
        const convertUrl = (url) => {
            if (!url) return url;
            if (url.startsWith('http://localhost') || url.startsWith('/uploads/')) {
                // Extract the path after /uploads/
                const match = url.match(/\/uploads\/(.+)$/);
                if (match) {
                    // Construct Cloudinary URL
                    return `${cloudinaryBaseUrl}/${match[1]}`;
                }
            }
            return url; // Already a Cloudinary URL or invalid
        };

        // Migrate User profilePicUrl
        console.log('\n📸 Migrating User profile pictures...');
        const users = await User.find({ profilePicUrl: { $exists: true, $ne: null } });
        let userCount = 0;
        for (const user of users) {
            const newUrl = convertUrl(user.profilePicUrl);
            if (newUrl !== user.profilePicUrl) {
                await User.updateOne({ _id: user._id }, { profilePicUrl: newUrl });
                console.log(`  Updated user ${user.username}: ${user.profilePicUrl} → ${newUrl}`);
                userCount++;
            }
        }
        console.log(`✅ Updated ${userCount} user profile pictures`);

        // Migrate PatientDetail
        console.log('\n🏥 Migrating Patient details...');
        const patients = await PatientDetail.find({
            $or: [
                { profilePicUrl: { $exists: true, $ne: null } },
                { treatmentFileUrl: { $exists: true, $ne: null } }
            ]
        });
        let patientCount = 0;
        for (const patient of patients) {
            const updates = {};
            if (patient.profilePicUrl) {
                const newUrl = convertUrl(patient.profilePicUrl);
                if (newUrl !== patient.profilePicUrl) {
                    updates.profilePicUrl = newUrl;
                }
            }
            if (patient.treatmentFileUrl) {
                const newUrl = convertUrl(patient.treatmentFileUrl);
                if (newUrl !== patient.treatmentFileUrl) {
                    updates.treatmentFileUrl = newUrl;
                }
            }
            if (Object.keys(updates).length > 0) {
                await PatientDetail.updateOne({ _id: patient._id }, updates);
                console.log(`  Updated patient ${patient.userId}:`, updates);
                patientCount++;
            }
        }
        console.log(`✅ Updated ${patientCount} patient records`);

        // Migrate DoctorDetail
        console.log('\n👨‍⚕️ Migrating Doctor details...');
        const doctors = await DoctorDetail.find({
            $or: [
                { profilePicUrl: { $exists: true, $ne: null } },
                { proofFileUrl: { $exists: true, $ne: null } }
            ]
        });
        let doctorCount = 0;
        for (const doctor of doctors) {
            const updates = {};
            if (doctor.profilePicUrl) {
                const newUrl = convertUrl(doctor.profilePicUrl);
                if (newUrl !== doctor.profilePicUrl) {
                    updates.profilePicUrl = newUrl;
                }
            }
            if (doctor.proofFileUrl) {
                const newUrl = convertUrl(doctor.proofFileUrl);
                if (newUrl !== doctor.proofFileUrl) {
                    updates.proofFileUrl = newUrl;
                }
            }
            if (Object.keys(updates).length > 0) {
                await DoctorDetail.updateOne({ _id: doctor._id }, updates);
                console.log(`  Updated doctor ${doctor.userId}:`, updates);
                doctorCount++;
            }
        }
        console.log(`✅ Updated ${doctorCount} doctor records`);

        console.log('\n🎉 Migration complete!');
        console.log(`Total updated: ${userCount + patientCount + doctorCount} records`);

    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n✅ Disconnected from MongoDB');
    }
}

// Run migration
migrateUrls();
