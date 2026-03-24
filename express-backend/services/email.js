const nodemailer = require("nodemailer");

// Create reusable transporter using SMTP settings from .env
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true", // true for 465, false for 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const FROM_ADDRESS = process.env.SMTP_FROM || process.env.SMTP_USER;

/**
 * Send an email. Logs errors but does not throw (fire-and-forget for notifications).
 */
async function sendEmail(to, subject, html) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log(`[EMAIL] ⚠️  SMTP not configured — skipping email to ${to}: ${subject}`);
    return;
  }
  try {
    await transporter.sendMail({
      from: `"IRIS Bus Tracker" <${FROM_ADDRESS}>`,
      to,
      subject,
      html,
    });
    console.log(`[EMAIL] ✅ Sent to ${to}: ${subject}`);
  } catch (err) {
    console.error(`[EMAIL] ❌ Failed to send to ${to}: ${err.message}`);
  }
}

// ── Notification templates ───────────────────────────────

function notifyStudentBoarded(parentEmail, studentName, busNumber, routeName) {
  const subject = `🚌 ${studentName} has boarded the bus`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color: #2563eb;">IRIS Bus Notification</h2>
      <p>Hello,</p>
      <p>Your child <strong>${studentName}</strong> has <span style="color: #16a34a; font-weight: bold;">boarded</span> the bus.</p>
      <table style="margin: 16px 0; border-collapse: collapse;">
        <tr><td style="padding: 4px 12px 4px 0; color: #666;">Bus:</td><td><strong>${busNumber}</strong></td></tr>
        ${routeName ? `<tr><td style="padding: 4px 12px 4px 0; color: #666;">Route:</td><td>${routeName}</td></tr>` : ""}
        <tr><td style="padding: 4px 12px 4px 0; color: #666;">Time:</td><td>${new Date().toLocaleString()}</td></tr>
      </table>
      <p style="color: #888; font-size: 12px;">— IRIS School Bus Tracking System</p>
    </div>`;
  return sendEmail(parentEmail, subject, html);
}

function notifyStudentExited(parentEmail, studentName, busNumber, routeName) {
  const subject = `🏫 ${studentName} has exited the bus`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color: #2563eb;">IRIS Bus Notification</h2>
      <p>Hello,</p>
      <p>Your child <strong>${studentName}</strong> has <span style="color: #dc2626; font-weight: bold;">exited</span> the bus.</p>
      <table style="margin: 16px 0; border-collapse: collapse;">
        <tr><td style="padding: 4px 12px 4px 0; color: #666;">Bus:</td><td><strong>${busNumber}</strong></td></tr>
        ${routeName ? `<tr><td style="padding: 4px 12px 4px 0; color: #666;">Route:</td><td>${routeName}</td></tr>` : ""}
        <tr><td style="padding: 4px 12px 4px 0; color: #666;">Time:</td><td>${new Date().toLocaleString()}</td></tr>
      </table>
      <p style="color: #888; font-size: 12px;">— IRIS School Bus Tracking System</p>
    </div>`;
  return sendEmail(parentEmail, subject, html);
}

function notifyBusArrived(parentEmail, studentName, busNumber, routeName) {
  const subject = `🏫 Bus ${busNumber} has arrived at the university`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color: #2563eb;">IRIS Bus Notification</h2>
      <p>Hello,</p>
      <p>Bus <strong>${busNumber}</strong> carrying your child <strong>${studentName}</strong> has
         <span style="color: #16a34a; font-weight: bold;">arrived at the university</span>.</p>
      <table style="margin: 16px 0; border-collapse: collapse;">
        ${routeName ? `<tr><td style="padding: 4px 12px 4px 0; color: #666;">Route:</td><td>${routeName}</td></tr>` : ""}
        <tr><td style="padding: 4px 12px 4px 0; color: #666;">Arrival Time:</td><td>${new Date().toLocaleString()}</td></tr>
      </table>
      <p style="color: #888; font-size: 12px;">— IRIS School Bus Tracking System</p>
    </div>`;
  return sendEmail(parentEmail, subject, html);
}

function sendPasswordResetEmail(toEmail, resetToken) {
  const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:5173"}/reset-password?token=${resetToken}`;
  const subject = "🔑 IRIS Password Reset";
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color: #2563eb;">IRIS Password Reset</h2>
      <p>Hello,</p>
      <p>We received a request to reset your password. Click the button below to set a new password:</p>
      <div style="text-align: center; margin: 24px 0;">
        <a href="${resetUrl}"
           style="background: #2563eb; color: #fff; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Reset Password
        </a>
      </div>
      <p style="color: #666; font-size: 13px;">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
      <p style="color: #888; font-size: 12px;">— IRIS School Bus Tracking System</p>
    </div>`;
  return sendEmail(toEmail, subject, html);
}

module.exports = {
  sendEmail,
  notifyStudentBoarded,
  notifyStudentExited,
  notifyBusArrived,
  sendPasswordResetEmail,
};
