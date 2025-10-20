import nodemailer from "nodemailer";
import crypto from "crypto";

const createTransporter = () => {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

export const sendPasswordResetEmail = async (email, resetCode, firstName) => {
  try {
    const transporter = createTransporter();

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
    console.error("Error sending password reset email:", error);
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

    const result = await transporter.sendMail(mailOptions);
    console.log("Email verification sent successfully:", result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error("Error sending email verification:", error);
    throw new Error("Failed to send email verification");
  }
};

export const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const isVerificationTokenExpired = (emailVerificationExpiry) => {
  return new Date() > new Date(emailVerificationExpiry);
};
