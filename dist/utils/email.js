"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailService = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
class EmailService {
    constructor() {
        this.transporter = nodemailer_1.default.createTransport({
            host: process.env.EMAIL_HOST,
            port: parseInt(process.env.EMAIL_PORT || '587'),
            secure: false,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });
    }
    async sendEmail(options) {
        const mailOptions = {
            from: process.env.EMAIL_FROM,
            to: options.to,
            subject: options.subject,
            html: options.html,
        };
        await this.transporter.sendMail(mailOptions);
    }
    async sendVerificationEmail(email, token) {
        const verificationUrl = `${process.env.APP_URL}/api/auth/verify-email?token=${token}`;
        const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Verify Your Email Address</h2>
        <p>Thank you for signing up! Please click the button below to verify your email address:</p>
        <a href="${verificationUrl}" 
           style="display: inline-block; background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0;">
          Verify Email
        </a>
        <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
        <p>This link will expire in 24 hours.</p>
        <p>If you didn't create an account, you can safely ignore this email.</p>
      </div>
    `;
        await this.sendEmail({
            to: email,
            subject: 'Verify Your Email Address',
            html
        });
    }
    async sendPasswordResetEmail(email, token) {
        const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${token}`;
        const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Reset Your Password</h2>
        <p>You requested a password reset. Click the button below to reset your password:</p>
        <a href="${resetUrl}" 
           style="display: inline-block; background-color: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0;">
          Reset Password
        </a>
        <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #666;">${resetUrl}</p>
        <p>This link will expire in 10 minutes.</p>
        <p>If you didn't request a password reset, you can safely ignore this email.</p>
      </div>
    `;
        await this.sendEmail({
            to: email,
            subject: 'Reset Your Password',
            html
        });
    }
    async sendWelcomeEmail(email, firstName) {
        const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Welcome to Skinny AI!</h2>
        <p>Hi ${firstName || 'there'},</p>
        <p>Welcome to Skinny AI! Your account has been successfully created and verified.</p>
        <p>You can now start using our services. If you have any questions, feel free to contact our support team.</p>
        <p>Best regards,<br>The Skinny AI Team</p>
      </div>
    `;
        await this.sendEmail({
            to: email,
            subject: 'Welcome to Skinny AI!',
            html
        });
    }
}
exports.emailService = new EmailService();
//# sourceMappingURL=email.js.map