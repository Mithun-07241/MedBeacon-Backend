/**
 * Quick MongoDB command to create admin user
 * Copy and paste this into MongoDB Compass or MongoDB Shell
 */

// Use your database (replace 'medbeacon' with your actual database name)
use medbeacon

// Create admin user
db.users.insertOne({
    id: "admin-" + new Date().getTime(),
    username: "admin",
    email: "admin@medbeacon.com",
    password: "$2b$10$YourHashedPasswordHere", // This will be replaced
    role: "admin",
    verificationStatus: "verified",
    profileCompleted: true,
    createdAt: new Date(),
    updatedAt: new Date()
})

// OR if you want to update an existing user to admin:
db.users.updateOne(
    { email: "admin@medbeacon.com" },
    {
        $set: {
            role: "admin",
            verificationStatus: "verified",
            profileCompleted: true
        }
    }
)
