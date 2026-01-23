const mongoose = require('mongoose');
const User = require('./models/User');
const { hashPassword } = require('./utils/helpers');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

/**
 * Script to create an admin user
 * Usage: node createAdmin.js
 */

async function createAdmin() {
    try {
        // Connect to database
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // Admin credentials
        const adminData = {
            username: 'admin',
            email: 'admin@medbeacon.com',
            password: 'medbeacon@2025', // Change this to a secure password
            role: 'admin'
        };

        // Check if admin already exists
        const existingAdmin = await User.findOne({ email: adminData.email });
        if (existingAdmin) {
            console.log('⚠️  Admin user already exists with email:', adminData.email);
            console.log('Current role:', existingAdmin.role);

            // Update to admin if not already
            if (existingAdmin.role !== 'admin') {
                existingAdmin.role = 'admin';
                existingAdmin.verificationStatus = 'verified';
                existingAdmin.profileCompleted = true;
                await existingAdmin.save();
                console.log('✅ Updated user to admin role');
            }

            await mongoose.disconnect();
            return;
        }

        // Hash password
        const hashedPassword = await hashPassword(adminData.password);

        // Create admin user
        const admin = await User.create({
            id: uuidv4(),
            username: adminData.username,
            email: adminData.email,
            password: hashedPassword,
            role: 'admin',
            verificationStatus: 'verified',
            profileCompleted: true
        });

        console.log('✅ Admin user created successfully!');
        console.log('\n📧 Email:', adminData.email);
        console.log('🔑 Password:', adminData.password);
        console.log('\n⚠️  IMPORTANT: Change the password after first login!');
        console.log('\n🔗 Access admin dashboard at: /admin');

        await mongoose.disconnect();
        console.log('\n✅ Disconnected from MongoDB');
    } catch (error) {
        console.error('❌ Error creating admin:', error);
        process.exit(1);
    }
}

createAdmin();
