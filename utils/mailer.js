const axios = require("axios");
const EmailPreference = require("../models/EmailPreference");

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const GMAIL_USER = process.env.GMAIL_USER;

// ─── Get a fresh access token using the refresh token ────────────────────────
const getAccessToken = async () => {
  const { data } = await axios.post("https://oauth2.googleapis.com/token", {
    client_id: process.env.GMAIL_CLIENT_ID,
    client_secret: process.env.GMAIL_CLIENT_SECRET,
    refresh_token: process.env.GMAIL_REFRESH_TOKEN,
    grant_type: "refresh_token",
  });
  return data.access_token;
};

// ─── Send via Gmail REST API (HTTPS — works on Render) ───────────────────────
const sendGmail = async (to, subject, textBody, htmlBody) => {
  const accessToken = await getAccessToken();

  // Build a minimal RFC-2822 message with HTML body
  const boundary = "medbeacon_boundary";
  const raw = [
    `From: "MedBeacon" <${GMAIL_USER}>`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    ``,
    `--${boundary}`,
    `Content-Type: text/plain; charset="UTF-8"`,
    ``,
    textBody,
    ``,
    `--${boundary}`,
    `Content-Type: text/html; charset="UTF-8"`,
    ``,
    htmlBody,
    ``,
    `--${boundary}--`,
  ].join("\r\n");

  const encoded = Buffer.from(raw)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  await axios.post(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/send`,
    { raw: encoded },
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
};

// ─── Shared OTP email content builder ────────────────────────────────────────
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
        <tr><td style="background:#0f172a;padding:32px 40px;text-align:center;">
          <div style="display:inline-block;background:#1e40af;border-radius:12px;padding:10px 20px;margin-bottom:14px;">
            <span style="font-size:20px;font-weight:800;color:#ffffff;letter-spacing:1px;">Med</span><span style="font-size:20px;font-weight:800;color:#60a5fa;letter-spacing:1px;">Beacon</span>
          </div>
          <p style="margin:0;font-size:13px;color:#94a3b8;letter-spacing:0.5px;">Your Healthcare Companion</p>
        </td></tr>
        <tr><td style="background:linear-gradient(90deg,#1e40af,#2563eb);height:4px;"></td></tr>
        <tr><td style="padding:40px 40px 32px;">${content}</td></tr>
        <tr><td style="padding:0 40px;"><hr style="border:none;border-top:1px solid #e2e8f0;margin:0;"></td></tr>
        <tr><td style="padding:24px 40px;text-align:center;background:#f8fafc;">
          <p style="margin:0 0 6px;font-size:12px;color:#94a3b8;">© ${year} MedBeacon. All rights reserved.</p>
          <p style="margin:0;font-size:11px;color:#cbd5e1;"><a href="${unsubscribeUrl}" style="color:#2563eb;text-decoration:none;">Unsubscribe</a> from these emails</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
};

// ─── Send OTP ─────────────────────────────────────────────────────────────────
const sendOTP = async (email, otp, userId) => {
  console.log(`📧 Attempting to send OTP to: ${email}`);
  try {
    const unsubscribeToken = await EmailPreference.getOrCreateToken(userId, email);
    const content = `
            <h2 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#0f172a;">Verify Your Email Address</h2>
            <p style="margin:0 0 12px;font-size:15px;color:#475569;line-height:1.6;">Hello,</p>
            <p style="margin:0 0 28px;font-size:15px;color:#475569;line-height:1.6;">
                Thank you for registering with <strong>MedBeacon</strong>. Use the verification code below to complete your account setup:
            </p>
            <div style="text-align:center;margin:0 0 28px;">${buildOTPContent(otp)}</div>
            <div style="background:#eff6ff;border-left:4px solid #2563eb;border-radius:6px;padding:14px 18px;margin-bottom:24px;">
                <p style="margin:0;font-size:13px;color:#1e40af;line-height:1.5;">🔒 <strong>Security tip:</strong> MedBeacon will never ask for this code via phone or chat. Keep it private.</p>
            </div>
            <p style="margin:0;font-size:12px;color:#94a3b8;">If you didn't create a MedBeacon account, you can safely ignore this email.</p>
        `;
    const html = generateEmailTemplate(content, unsubscribeToken);
    const text = `Welcome to MedBeacon! Your verification code is: ${otp}. It will expire in 10 minutes.`;

    await sendGmail(email, "Verify Your Account - MedBeacon", text, html);

    console.log("✅ OTP sent successfully via Gmail API to:", email);
    console.log("====================================================");
    console.log("🔐 DEV MODE OTP:", otp);
    console.log("====================================================");
    return true;
  } catch (error) {
    console.error("❌ Failed to send OTP email:", error.response?.data || error.message);
    return false;
  }
};

// ─── Generic email sender ─────────────────────────────────────────────────────
const sendEmail = async (userId, email, subject, content, category = "general") => {
  try {
    const preference = await EmailPreference.findOne({ userId });
    if (preference && !preference.canReceiveEmail(category)) {
      console.log(`⚠️  User ${email} has unsubscribed from ${category} emails`);
      return false;
    }
    const unsubscribeToken = await EmailPreference.getOrCreateToken(userId, email);
    const html = generateEmailTemplate(content, unsubscribeToken);

    await sendGmail(email, subject, "", html);
    console.log("✅ Email sent successfully via Gmail API to:", email);
    return true;
  } catch (error) {
    console.error("❌ Error sending email:", error.response?.data || error.message);
    return false;
  }
};

module.exports = { sendOTP, sendEmail };
