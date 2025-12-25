const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.ethereal.email",
    port: process.env.SMTP_PORT || 587,
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER || "ethereal.user@ethereal.email",
        pass: process.env.SMTP_PASS || "ethereal_pass",
    },
});

const sendOTP = async (email, otp) => {
    try {
        const info = await transporter.sendMail({
            from: process.env.MAIL_FROM || process.env.SMTP_USER || '"MedBeacon" <no-reply@medbeacon.com>', // sender address
            to: email, // list of receivers
            subject: "Verify Your Account - MedBeacon", // Subject line
            text: `Welcome to MedBeacon! Your verification code is: ${otp}. It will expire in 10 minutes.`, // plain text body
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
            `, // html body
        });

        console.log("Message sent: %s", info.messageId);
        // Preview only available when sending through an Ethereal account
        console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
        console.log("====================================================");
        console.log("DEV MODE OTP: %s", otp);
        console.log("====================================================");
        return true;
    } catch (error) {
        console.error("Error sending email: ", error);
        return false;
    }
};

module.exports = { sendOTP };
