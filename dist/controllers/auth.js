"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const express_validator_1 = require("express-validator");
const User_1 = require("../models/User");
const jwt_1 = require("../utils/jwt");
const email_1 = require("../utils/email");
class AuthController {
    static async register(req, res) {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                error: errors.array()
            });
        }
        const { email, password, firstName, lastName, phoneNumber } = req.body;
        const existingUser = await User_1.User.findByEmail(email);
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: 'User with this email already exists'
            });
        }
        const user = new User_1.User({
            email,
            passwordHash: password,
            firstName,
            lastName,
            phoneNumber
        });
        const verificationToken = user.generateVerificationToken();
        await user.save();
        try {
            await email_1.emailService.sendVerificationEmail(email, verificationToken);
        }
        catch (error) {
            console.error('Failed to send verification email:', error);
        }
        const accessToken = (0, jwt_1.generateAccessToken)({
            userId: user._id.toString(),
            email: user.email,
            role: user.role
        });
        const refreshToken = (0, jwt_1.generateRefreshToken)({
            userId: user._id.toString(),
            email: user.email,
            role: user.role
        });
        const response = {
            success: true,
            message: 'User registered successfully. Please check your email to verify your account.',
            data: {
                user: {
                    id: user._id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    role: user.role,
                    emailVerified: user.emailVerified
                },
                tokens: {
                    accessToken,
                    refreshToken
                }
            }
        };
        return res.status(201).json(response);
    }
    static async login(req, res) {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                error: errors.array()
            });
        }
        const { email, password } = req.body;
        const user = await User_1.User.findByEmail(email);
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }
        user.lastLogin = new Date();
        await user.save();
        const accessToken = (0, jwt_1.generateAccessToken)({
            userId: user._id.toString(),
            email: user.email,
            role: user.role
        });
        const refreshToken = (0, jwt_1.generateRefreshToken)({
            userId: user._id.toString(),
            email: user.email,
            role: user.role
        });
        const response = {
            success: true,
            message: 'Login successful',
            data: {
                user: {
                    id: user._id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    role: user.role,
                    emailVerified: user.emailVerified
                },
                tokens: {
                    accessToken,
                    refreshToken
                }
            }
        };
        return res.json(response);
    }
    static async verifyEmail(req, res) {
        const { token } = req.query;
        if (!token || typeof token !== 'string') {
            return res.status(400).json({
                success: false,
                message: 'Verification token is required'
            });
        }
        const user = await User_1.User.findByVerificationToken(token);
        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired verification token'
            });
        }
        user.emailVerified = true;
        user.verificationToken = undefined;
        await user.save();
        try {
            await email_1.emailService.sendWelcomeEmail(user.email, user.firstName);
        }
        catch (error) {
            console.error('Failed to send welcome email:', error);
        }
        return res.json({
            success: true,
            message: 'Email verified successfully'
        });
    }
    static async forgotPassword(req, res) {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                error: errors.array()
            });
        }
        const { email } = req.body;
        const user = await User_1.User.findByEmail(email);
        if (!user) {
            return res.json({
                success: true,
                message: 'If an account with that email exists, a password reset link has been sent'
            });
        }
        const resetToken = user.generatePasswordResetToken();
        await user.save();
        try {
            await email_1.emailService.sendPasswordResetEmail(email, resetToken);
        }
        catch (error) {
            console.error('Failed to send password reset email:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to send password reset email'
            });
        }
        return res.json({
            success: true,
            message: 'If an account with that email exists, a password reset link has been sent'
        });
    }
    static async resetPassword(req, res) {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                error: errors.array()
            });
        }
        const { token, password } = req.body;
        const user = await User_1.User.findByResetPasswordToken(token);
        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired reset token'
            });
        }
        user.passwordHash = password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();
        return res.json({
            success: true,
            message: 'Password reset successfully'
        });
    }
    static async getMe(req, res) {
        const user = req.user;
        const response = {
            success: true,
            message: 'User profile retrieved successfully',
            data: {
                user: {
                    id: user._id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    role: user.role,
                    emailVerified: user.emailVerified,
                    avatar: user.avatar,
                    phoneNumber: user.phoneNumber,
                    birth: user.birth,
                    billing: user.billing
                }
            }
        };
        return res.json(response);
    }
}
exports.AuthController = AuthController;
//# sourceMappingURL=auth.js.map