const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");
const ClinicProfile = require("../models/ClinicProfile");
require("dotenv").config();

async function seedClinicProfile() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB");

        // Check if clinic profile already exists
        const existingClinic = await ClinicProfile.findOne({ isSingleton: true });

        if (existingClinic) {
            console.log("Clinic profile already exists. Skipping seed.");
            console.log("Existing clinic:", existingClinic.clinicName);
            process.exit(0);
        }

        // Create default clinic profile
        const clinic = await ClinicProfile.create({
            id: uuidv4(),
            clinicName: "MedBeacon Health Center",
            description: "Comprehensive healthcare services for your well-being",
            address: "123 Medical Plaza",
            city: "New York",
            state: "NY",
            zipCode: "10001",
            phone: "+1-555-0123",
            email: "contact@medbeacon.com",
            website: "www.medbeacon.com",
            isSingleton: true
        });

        console.log("✅ Successfully created default clinic profile");
        console.log("Clinic Name:", clinic.clinicName);
        console.log("\nYou can update these details from the Admin Dashboard → Clinic Settings");

        process.exit(0);
    } catch (error) {
        console.error("Error seeding clinic profile:", error);
        process.exit(1);
    }
}

seedClinicProfile();
