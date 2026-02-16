const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");
const ServiceItem = require("../models/ServiceItem");
require("dotenv").config();

const defaultServices = [
    {
        id: uuidv4(),
        name: "General Consultation",
        description: "Standard medical consultation and examination",
        category: "Consultation",
        defaultPrice: 50,
        isGlobal: true
    },
    {
        id: uuidv4(),
        name: "Follow-up Consultation",
        description: "Follow-up visit for existing patients",
        category: "Consultation",
        defaultPrice: 30,
        isGlobal: true
    },
    {
        id: uuidv4(),
        name: "Blood Test",
        description: "Complete blood count and analysis",
        category: "Diagnostic",
        defaultPrice: 25,
        isGlobal: true
    },
    {
        id: uuidv4(),
        name: "X-Ray",
        description: "Radiographic imaging",
        category: "Diagnostic",
        defaultPrice: 75,
        isGlobal: true
    },
    {
        id: uuidv4(),
        name: "ECG",
        description: "Electrocardiogram test",
        category: "Diagnostic",
        defaultPrice: 60,
        isGlobal: true
    },
    {
        id: uuidv4(),
        name: "Ultrasound",
        description: "Ultrasound imaging",
        category: "Diagnostic",
        defaultPrice: 100,
        isGlobal: true
    },
    {
        id: uuidv4(),
        name: "Minor Surgery",
        description: "Minor surgical procedure",
        category: "Surgery",
        defaultPrice: 200,
        isGlobal: true
    },
    {
        id: uuidv4(),
        name: "Prescription",
        description: "Medication prescription",
        category: "Medication",
        defaultPrice: 10,
        isGlobal: true
    },
    {
        id: uuidv4(),
        name: "Vaccination",
        description: "Immunization service",
        category: "Treatment",
        defaultPrice: 35,
        isGlobal: true
    },
    {
        id: uuidv4(),
        name: "Physical Therapy Session",
        description: "Single physical therapy session",
        category: "Treatment",
        defaultPrice: 45,
        isGlobal: true
    }
];

async function seedServices() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB");

        // Check if services already exist
        const existingCount = await ServiceItem.countDocuments({ isGlobal: true });

        if (existingCount > 0) {
            console.log(`${existingCount} global services already exist. Skipping seed.`);
            process.exit(0);
        }

        // Insert default services
        await ServiceItem.insertMany(defaultServices);
        console.log(`✅ Successfully seeded ${defaultServices.length} default services`);

        process.exit(0);
    } catch (error) {
        console.error("Error seeding services:", error);
        process.exit(1);
    }
}

seedServices();
