const nodemailer = require("nodemailer");

// Resend API configuration (works on all hosting platforms)
const RESEND_API_KEY = process.env.RESEND_API_KEY;
// Use user's email if provided, otherwise fall back to default
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || process.env.EMAIL_USER || 'onboarding@resend.dev';

// Gmail SMTP fallback (for local development)
const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER || process.env.SMTP_USER,
        pass: process.env.EMAIL_PASS || process.env.SMTP_PASS,
    },
    tls: {
        rejectUnauthorized: false,
        ciphers: 'SSLv3'
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
});

// Verify SMTP on startup (only if no Resend key)
if (!RESEND_API_KEY) {
    console.log("⚠️  No RESEND_API_KEY found, using Gmail SMTP fallback");
    transporter.verify(function (error, success) {
        if (error) {
            console.error("❌ SMTP Configuration Error:", error);
            console.error("Check your EMAIL_USER and EMAIL_PASS environment variables");
        } else {
            console.log("✅ Gmail SMTP is ready to send emails");
        }
    });
} else {
    console.log("✅ Using Resend API for email delivery");
}

const sendOTPViaResend = async (email, otp) => {
    try {
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: RESEND_FROM_EMAIL,
                to: email,
                subject: "Verify Your Account - MedBeacon",
                html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px; background-color: #f9f9f9;">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <h1 style="color: #333; margin: 0;">MedBeacon</h1>
                        <p style="color: #666; font-size: 14px;">Your Healthcare Companion</p>
                    </div>
                    <div style="background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                        <h2 style="color: #333; margin-top: 0;">Verify Your Email Address</h2>
                        <p style="color: #555; line-height: 1.6;">Hello,</p>
                        <p style="color: #555; line-height: 1.6;">Thank you for registering with MedBeacon. To complete your account setup, please use the verification code below:</p>
                        <div style="text-align: center; margin: 30px 0;">
                            <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #000; background-color: #f0f0f0; padding: 10px 20px; border-radius: 5px; border: 1px solid #ddd;">${otp}</span>
                        </div>
                        <p style="color: #555; line-height: 1.6;">This code will expire in <strong>10 minutes</strong>.</p>
                        <p style="color: #999; font-size: 12px; margin-top: 30px;">If you didn't request this code, you can safely ignore this email.</p>
                    </div>
                    <div style="text-align: center; margin-top: 20px; color: #888; font-size: 12px;">
                        &copy; ${new Date().getFullYear()} MedBeacon. All rights reserved.
                    </div>
                </div>
                `
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("❌ Resend API Error:", errorData);
            return false;
        }

        const data = await response.json();
        console.log("✅ Email sent successfully via Resend:", data.id);
        return true;

    } catch (error) {
        console.error("❌ Resend API Error:", error);
        return false;
    }
};

const sendOTPViaSMTP = async (email, otp) => {
    try {
        const info = await transporter.sendMail({
            from: process.env.MAIL_FROM || process.env.SMTP_USER || '"MedBeacon" <no-reply@medbeacon.com>',
            to: email,
            subject: "Verify Your Account - MedBeacon",
            text: `Welcome to MedBeacon! Your verification code is: ${otp}. It will expire in 10 minutes.`,
            html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px; background-color: #f9f9f9;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <h1 style="color: #333; margin: 0;">MedBeacon</h1>
                    <p style="color: #666; font-size: 14px;">Your Healthcare Companion</p>
                </div>
                <div style="background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                    <h2 style="color: #333; margin-top: 0;">Verify Your Email Address</h2>
                    <p style="color: #555; line-height: 1.6;">Hello,</p>
                    <p style="color: #555; line-height: 1.6;">Thank you for registering with MedBeacon. To complete your account setup, please use the verification code below:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #000; background-color: #f0f0f0; padding: 10px 20px; border-radius: 5px; border: 1px solid #ddd;">${otp}</span>
                    </div>
                    <p style="color: #555; line-height: 1.6;">This code will expire in <strong>10 minutes</strong>.</p>
                    <p style="color: #999; font-size: 12px; margin-top: 30px;">If you didn't request this code, you can safely ignore this email.</p>
                </div>
                <div style="text-align: center; margin-top: 20px; color: #888; font-size: 12px;">
                    &copy; ${new Date().getFullYear()} MedBeacon. All rights reserved.
                </div>
            </div>
            `,
        });

        console.log("✅ Email sent successfully via SMTP:", info.messageId);
        return true;

    } catch (error) {
        console.error("❌ SMTP Error:", error.message);
        return false;
    }
};

const sendOTP = async (email, otp) => {
    console.log(`📧 Attempting to send OTP to: ${email}`);

    // Try Resend first (if API key exists)
    if (RESEND_API_KEY) {
        const success = await sendOTPViaResend(email, otp);
        if (success) {
            console.log("====================================================");
            console.log("🔐 DEV MODE OTP:", otp);
            console.log("====================================================");
            return true;
        }
        console.log("⚠️  Resend failed, falling back to SMTP...");
    }

    // Fallback to SMTP (for local development)
    const success = await sendOTPViaSMTP(email, otp);
    if (success) {
        console.log("====================================================");
        console.log("🔐 DEV MODE OTP:", otp);
        console.log("====================================================");
    }
    return success;
};

module.exports = { sendOTP };
