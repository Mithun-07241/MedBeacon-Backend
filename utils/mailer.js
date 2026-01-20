const nodemailer = require("nodemailer");
const sgMail = require('@sendgrid/mail');
const EmailPreference = require("../models/EmailPreference");

// SendGrid API configuration (works on all hosting platforms)
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const FROM_EMAIL = process.env.SMTP_USER || process.env.SENDGRID_FROM_EMAIL;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

// Initialize SendGrid
if (SENDGRID_API_KEY) {
    sgMail.setApiKey(SENDGRID_API_KEY);
    console.log("✅ Using SendGrid API for email delivery");
} else {
    console.log("⚠️  No SENDGRID_API_KEY found, using Gmail SMTP fallback");
}

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

// Verify SMTP on startup (only if no SendGrid key)
if (!SENDGRID_API_KEY) {
    transporter.verify(function (error, success) {
        if (error) {
            console.error("❌ SMTP Configuration Error:", error);
            console.error("Check your EMAIL_USER and EMAIL_PASS environment variables");
        } else {
            console.log("✅ Gmail SMTP is ready to send emails");
        }
    });
}

// Generate email template with logos and unsubscribe link
const generateEmailTemplate = (content, unsubscribeToken) => {
    const unsubscribeUrl = `${FRONTEND_URL}/unsubscribe/${unsubscribeToken}`;

    return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px; background-color: #f9f9f9;">
        <div style="text-align: center; margin-bottom: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 8px;">
            <img src="${FRONTEND_URL}/logo-light.png" alt="MedBeacon Logo" style="max-width: 180px; height: auto; margin-bottom: 10px;" />
            <p style="color: #ffffff; font-size: 14px; margin: 0;">Your Healthcare Companion</p>
        </div>
        <div style="background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
            ${content}
        </div>
        <div style="text-align: center; margin-top: 20px; padding: 15px; border-top: 1px solid #e0e0e0;">
            <img src="${FRONTEND_URL}/developer-watermark.png" alt="Developer Watermark" style="max-width: 120px; height: auto; opacity: 0.6; margin-bottom: 10px;" />
            <p style="color: #888; font-size: 12px; margin: 5px 0;">© ${new Date().getFullYear()} MedBeacon. All rights reserved.</p>
            <p style="color: #999; font-size: 11px; margin: 10px 0;">
                <a href="${unsubscribeUrl}" style="color: #667eea; text-decoration: none;">Unsubscribe</a> from these emails
            </p>
        </div>
    </div>
    `;
};

const sendOTPViaSendGrid = async (email, otp, userId) => {
    try {
        // Get or create unsubscribe token
        const unsubscribeToken = await EmailPreference.getOrCreateToken(userId, email);

        const content = `
            <h2 style="color: #333; margin-top: 0;">Verify Your Email Address</h2>
            <p style="color: #555; line-height: 1.6;">Hello,</p>
            <p style="color: #555; line-height: 1.6;">Thank you for registering with MedBeacon. To complete your account setup, please use the verification code below:</p>
            <div style="text-align: center; margin: 30px 0;">
                <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #000; background-color: #f0f0f0; padding: 10px 20px; border-radius: 5px; border: 1px solid #ddd;">${otp}</span>
            </div>
            <p style="color: #555; line-height: 1.6;">This code will expire in <strong>10 minutes</strong>.</p>
            <p style="color: #999; font-size: 12px; margin-top: 30px;">If you didn't request this code, you can safely ignore this email.</p>
        `;

        const msg = {
            to: email,
            from: FROM_EMAIL,
            subject: "Verify Your Account - MedBeacon",
            text: `Welcome to MedBeacon! Your verification code is: ${otp}. It will expire in 10 minutes.`,
            html: generateEmailTemplate(content, unsubscribeToken)
        };

        await sgMail.send(msg);
        console.log("✅ Email sent successfully via SendGrid to:", email);
        return true;

    } catch (error) {
        console.error("❌ SendGrid API Error:", error.message);
        if (error.response) {
            console.error("Error details:", error.response.body);
        }
        return false;
    }
};

const sendOTPViaSMTP = async (email, otp, userId) => {
    try {
        // Get or create unsubscribe token
        const unsubscribeToken = await EmailPreference.getOrCreateToken(userId, email);

        const content = `
            <h2 style="color: #333; margin-top: 0;">Verify Your Email Address</h2>
            <p style="color: #555; line-height: 1.6;">Hello,</p>
            <p style="color: #555; line-height: 1.6;">Thank you for registering with MedBeacon. To complete your account setup, please use the verification code below:</p>
            <div style="text-align: center; margin: 30px 0;">
                <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #000; background-color: #f0f0f0; padding: 10px 20px; border-radius: 5px; border: 1px solid #ddd;">${otp}</span>
            </div>
            <p style="color: #555; line-height: 1.6;">This code will expire in <strong>10 minutes</strong>.</p>
            <p style="color: #999; font-size: 12px; margin-top: 30px;">If you didn't request this code, you can safely ignore this email.</p>
        `;

        const info = await transporter.sendMail({
            from: process.env.MAIL_FROM || process.env.SMTP_USER || '"MedBeacon" <no-reply@medbeacon.com>',
            to: email,
            subject: "Verify Your Account - MedBeacon",
            text: `Welcome to MedBeacon! Your verification code is: ${otp}. It will expire in 10 minutes.`,
            html: generateEmailTemplate(content, unsubscribeToken),
        });

        console.log("✅ Email sent successfully via SMTP:", info.messageId);
        return true;

    } catch (error) {
        console.error("❌ SMTP Error:", error.message);
        return false;
    }
};

const sendOTP = async (email, otp, userId) => {
    console.log(`📧 Attempting to send OTP to: ${email}`);

    // Check if user has unsubscribed (skip for OTP emails as they're critical)
    // OTP emails are always sent regardless of preferences

    // Try SendGrid first (if API key exists)
    if (SENDGRID_API_KEY) {
        const success = await sendOTPViaSendGrid(email, otp, userId);
        if (success) {
            console.log("====================================================");
            console.log("🔐 DEV MODE OTP:", otp);
            console.log("====================================================");
            return true;
        }
        console.log("⚠️  SendGrid failed, falling back to SMTP...");
    }

    // Fallback to SMTP (for local development)
    const success = await sendOTPViaSMTP(email, otp, userId);
    if (success) {
        console.log("====================================================");
        console.log("🔐 DEV MODE OTP:", otp);
        console.log("====================================================");
    }
    return success;
};

// Generic email sending function with unsubscribe support
const sendEmail = async (userId, email, subject, content, category = "general") => {
    try {
        // Check if user can receive emails
        const preference = await EmailPreference.findOne({ userId });
        if (preference && !preference.canReceiveEmail(category)) {
            console.log(`⚠️  User ${email} has unsubscribed from ${category} emails`);
            return false;
        }

        // Get or create unsubscribe token
        const unsubscribeToken = await EmailPreference.getOrCreateToken(userId, email);

        const htmlContent = generateEmailTemplate(content, unsubscribeToken);

        if (SENDGRID_API_KEY) {
            const msg = {
                to: email,
                from: FROM_EMAIL,
                subject: subject,
                html: htmlContent
            };
            await sgMail.send(msg);
            console.log("✅ Email sent successfully via SendGrid to:", email);
            return true;
        } else {
            const info = await transporter.sendMail({
                from: process.env.MAIL_FROM || process.env.SMTP_USER || '"MedBeacon" <no-reply@medbeacon.com>',
                to: email,
                subject: subject,
                html: htmlContent,
            });
            console.log("✅ Email sent successfully via SMTP:", info.messageId);
            return true;
        }
    } catch (error) {
        console.error("❌ Error sending email:", error.message);
        return false;
    }
};

module.exports = { sendOTP, sendEmail };

