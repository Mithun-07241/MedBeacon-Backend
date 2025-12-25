const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:5000/api'; // Assuming backend runs on 5000

async function testAuth() {
    console.log("Starting Auth Verification...");

    // 1. Register
    const email = `testuser_${Date.now()}@example.com`;
    const password = "password123";
    const username = `user_${Date.now()}`;

    console.log(`\n1. Testing Registration (${email})...`);
    try {
        const regRes = await fetch(`${BASE_URL}/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username,
                email,
                password,
                role: "patient"
            })
        });

        const regData = await regRes.json();
        if (!regRes.ok) throw new Error(regData.error || "Registration failed");

        console.log("✅ Registration Successful");
        console.log("Token:", regData.token ? "Received" : "Missing");

        const token = regData.token;

        // 2. Get Me
        console.log("\n2. Testing Get Me...");
        const meRes = await fetch(`${BASE_URL}/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const meData = await meRes.json();
        if (!meRes.ok) throw new Error(meData.error || "Get Me failed");

        console.log("✅ Get Me Successful");
        console.log("User Email:", meData.user.email);

        // 3. Login
        console.log("\n3. Testing Login...");
        const loginRes = await fetch(`${BASE_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const loginData = await loginRes.json();
        if (!loginRes.ok) throw new Error(loginData.error || "Login failed");

        console.log("✅ Login Successful");
        console.log("Token:", loginData.token ? "Received" : "Missing");

    } catch (error) {
        console.error("❌ Verification Failed:", error.message);
    }
}

testAuth();
