import nodemailer from "nodemailer";
import crypto from "crypto";

const createTransporter = () => {
  // If EMAIL_USER/PASS aren't set, return null and let callers handle it gracefully
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn("EMAIL_USER or EMAIL_PASS not set — emails will not be sent.");
    return null;
  }

  // Configure timeouts to avoid excessive blocking when SMTP is unreachable
  const connectionTimeout = parseInt(process.env.EMAIL_CONNECTION_TIMEOUT) || 5000;
  const greetingTimeout = parseInt(process.env.EMAIL_GREETING_TIMEOUT) || 5000;
  const socketTimeout = parseInt(process.env.EMAIL_SOCKET_TIMEOUT) || 5000;

  // Prefer explicit host/port so we can control behavior and log more clearly
  const host = process.env.EMAIL_HOST || "smtp.gmail.com";
  const port = parseInt(process.env.EMAIL_PORT) || 587;
  const secure = process.env.EMAIL_SECURE === "true" || false;

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    requireTLS: true,
    // Avoid blocking for too long if SMTP cannot be reached
    connectionTimeout,
    greetingTimeout,
    socketTimeout,
    tls: {
      // In some hosting envs, TLS can cause handshake issues — keep it explicit
      rejectUnauthorized: false,
    },
    logger: !!(process.env.EMAIL_DEBUG === "true"),
  });

  // Helpful debug info for live logs
  if (process.env.NODE_ENV === "production" || process.env.EMAIL_DEBUG === "true") {
    console.log(`Email transporter configured: host=${host} port=${port} secure=${secure}`);
  }

  return transporter;
};

// Verify transporter connectivity (non-fatal). Useful to run at server start or via an admin endpoint.
export const verifyTransporter = async () => {
  const transporter = createTransporter();
  if (!transporter) {
    const msg = "Transporter not configured (EMAIL_USER / EMAIL_PASS missing)";
    console.warn(msg);
    return { ok: false, message: msg };
  }

  try {
    // nodemailer verify() will attempt connection and authentication
    await transporter.verify();
    return { ok: true, message: "SMTP transporter is reachable" };
  } catch (err) {
    console.error("SMTP transporter verify failed:", err && err.message ? err.message : err);
    return { ok: false, message: err && err.message ? err.message : String(err) };
  }
};

export const sendPasswordResetEmail = async (email, resetCode, firstName) => {
  try {
    const transporter = createTransporter();
    if (!transporter) {
      // Not configured to send emails in this environment; just log and return
      console.warn("sendPasswordResetEmail skipped — transporter not configured");
      return { success: false, message: "Email transporter not configured" };
    }

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Password Reset Code - Vibely",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Password Reset Request</h2>
          <p>Hi ${firstName},</p>
          <p>You requested a password reset for your Vibely account. Please use the following verification code to reset your password:</p>
          <div style="background-color: #f4f4f4; padding: 20px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 3px; margin: 20px 0;">
            ${resetCode}
          </div>
          <p><strong>This code will expire in 15 minutes.</strong></p>
          <p>If you didn't request this password reset, please ignore this email.</p>
          <hr style="margin: 30px 0;">
          <p style="color: #666; font-size: 12px;">This is an automated email, please do not reply.</p>
        </div>
      `,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log("Password reset email sent successfully:", result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error("Error sending password reset email:", error && error.message ? error.message : error, {
      code: error && error.code ? error.code : undefined,
    });
    if (error && error.code === "ETIMEDOUT") {
      console.warn(
        "SMTP connection timed out — your hosting provider may be blocking outbound SMTP (port may be restricted)."
      );
    }
    throw new Error("Failed to send password reset email");
  }
};

export const generateResetCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const isResetCodeExpired = (resetTokenExpiry) => {
  return new Date() > new Date(resetTokenExpiry);
};

export const sendEmailVerification = async (
  email,
  verificationCode,
  firstName
) => {
  try {
    const transporter = createTransporter();
    if (!transporter) {
      console.warn("sendEmailVerification skipped — transporter not configured");
      return { success: false, message: "Email transporter not configured" };
    }

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Email Verification Code - Vibely",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h2 style="color: #333; text-align: center; margin-bottom: 30px;">Welcome to Vibely!</h2>
            <p style="font-size: 16px; color: #666;">Hi ${firstName},</p>
            <p style="font-size: 16px; color: #666; line-height: 1.6;">
              Thank you for signing up with Vibely! To complete your registration and start connecting with others, 
              please use the following verification code:
            </p>
            <div style="background-color: #f4f4f4; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 30px 0; border-radius: 8px; border: 2px solid #007bff;">
              ${verificationCode}
            </div>
            <p style="font-size: 14px; color: #666; line-height: 1.6;">
              Enter this code on the verification page to activate your account.
            </p>
            <p style="font-size: 14px; color: #999; margin-top: 30px;">
              <strong>This verification code will expire in 15 minutes.</strong>
            </p>
            <p style="font-size: 14px; color: #999; margin-top: 30px;">
              <strong>This verification link will expire in 24 hours.</strong>
            </p>
            <p style="font-size: 14px; color: #666;">
              If you didn't create an account with Vibely, please ignore this email.
            </p>
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
            <p style="color: #999; font-size: 12px; text-align: center;">
              This is an automated email, please do not reply.
            </p>
          </div>
        </div>
      `,
    };

    const result = await Promise.race([
      transporter.sendMail(mailOptions),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Email send timed out")), 10000)
      ),
    ]);
    console.log("Email verification sent successfully:", result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
      console.error("Error sending email verification:", error && error.message ? error.message : error, {
        code: error && error.code ? error.code : undefined,
      });
      if (error && error.code === "ETIMEDOUT") {
        console.warn(
          "SMTP connection timed out — your hosting provider may be blocking outbound SMTP (port may be restricted)."
        );
      }
    throw new Error("Failed to send email verification");
  }
};

export const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const isVerificationTokenExpired = (emailVerificationExpiry) => {
  return new Date() > new Date(emailVerificationExpiry);
};
