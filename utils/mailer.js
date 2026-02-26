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

// ─── Shared OTP email content builder ───────────────────────────────────────
const buildOTPContent = (otp) => `
    <p style="margin:0 0 8px; font-size:14px; color:#6b7280;">VERIFICATION CODE</p>
    <div style="letter-spacing:10px; font-size:36px; font-weight:700; color:#111827; font-family:'Courier New',monospace; background:#f3f4f6; border:2px solid #e5e7eb; border-radius:10px; padding:18px 24px; display:inline-block; margin:0 0 8px;">
        ${otp}
    </div>
    <p style="margin:8px 0 0; font-size:12px; color:#9ca3af;">Expires in <strong>10 minutes</strong></p>
`;

// ─── Master email wrapper ─────────────────────────────────────────────────────
const generateEmailTemplate = (content, unsubscribeToken) => {
    const unsubscribeUrl = `${FRONTEND_URL}/unsubscribe/${unsubscribeToken}`;
    const year = new Date().getFullYear();

    return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>MedBeacon</title></head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:#0f172a;padding:32px 40px;text-align:center;">
            <!-- Text-based logo — renders in all clients -->
            <div style="display:inline-block;background:#1e40af;border-radius:12px;padding:10px 20px;margin-bottom:14px;">
              <span style="font-size:20px;font-weight:800;color:#ffffff;letter-spacing:1px;">Med</span><span style="font-size:20px;font-weight:800;color:#60a5fa;letter-spacing:1px;">Beacon</span>
            </div>
            <p style="margin:0;font-size:13px;color:#94a3b8;letter-spacing:0.5px;">Your Healthcare Companion</p>
          </td>
        </tr>

        <!-- Blue accent bar -->
        <tr><td style="background:linear-gradient(90deg,#1e40af,#2563eb);height:4px;"></td></tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px 40px 32px;">
            ${content}
          </td>
        </tr>

        <!-- Divider -->
        <tr><td style="padding:0 40px;"><hr style="border:none;border-top:1px solid #e2e8f0;margin:0;"></td></tr>

        <!-- Footer -->
        <tr>
          <td style="padding:24px 40px;text-align:center;background:#f8fafc;">
            <p style="margin:0 0 6px;font-size:12px;color:#94a3b8;">© ${year} MedBeacon. All rights reserved.</p>
            <p style="margin:0;font-size:11px;color:#cbd5e1;">
              <a href="${unsubscribeUrl}" style="color:#2563eb;text-decoration:none;">Unsubscribe</a> from these emails
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
};

// ─── OTP via SendGrid ─────────────────────────────────────────────────────────
const sendOTPViaSendGrid = async (email, otp, userId) => {
    try {
        const unsubscribeToken = await EmailPreference.getOrCreateToken(userId, email);

        const content = `
            <h2 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#0f172a;">Verify Your Email Address</h2>
            <p style="margin:0 0 12px;font-size:15px;color:#475569;line-height:1.6;">Hello,</p>
            <p style="margin:0 0 28px;font-size:15px;color:#475569;line-height:1.6;">
                Thank you for registering with <strong>MedBeacon</strong>. Use the verification code below to complete your account setup:
            </p>
            <div style="text-align:center;margin:0 0 28px;">
                ${buildOTPContent(otp)}
            </div>
            <div style="background:#eff6ff;border-left:4px solid #2563eb;border-radius:6px;padding:14px 18px;margin-bottom:24px;">
                <p style="margin:0;font-size:13px;color:#1e40af;line-height:1.5;">
                    🔒 <strong>Security tip:</strong> MedBeacon will never ask for this code via phone or chat. Keep it private.
                </p>
            </div>
            <p style="margin:0;font-size:12px;color:#94a3b8;">If you didn't create a MedBeacon account, you can safely ignore this email.</p>
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

// ─── OTP via SMTP ─────────────────────────────────────────────────────────────
const sendOTPViaSMTP = async (email, otp, userId) => {
    try {
        const unsubscribeToken = await EmailPreference.getOrCreateToken(userId, email);

        const content = `
            <h2 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#0f172a;">Verify Your Email Address</h2>
            <p style="margin:0 0 12px;font-size:15px;color:#475569;line-height:1.6;">Hello,</p>
            <p style="margin:0 0 28px;font-size:15px;color:#475569;line-height:1.6;">
                Thank you for registering with <strong>MedBeacon</strong>. Use the verification code below to complete your account setup:
            </p>
            <div style="text-align:center;margin:0 0 28px;">
                ${buildOTPContent(otp)}
            </div>
            <div style="background:#eff6ff;border-left:4px solid #2563eb;border-radius:6px;padding:14px 18px;margin-bottom:24px;">
                <p style="margin:0;font-size:13px;color:#1e40af;line-height:1.5;">
                    🔒 <strong>Security tip:</strong> MedBeacon will never ask for this code via phone or chat. Keep it private.
                </p>
            </div>
            <p style="margin:0;font-size:12px;color:#94a3b8;">If you didn't create a MedBeacon account, you can safely ignore this email.</p>
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

