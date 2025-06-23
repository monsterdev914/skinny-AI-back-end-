import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { User } from '../models/User';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt';
import { emailService } from '../utils/email';
import { ApiResponse, RegisterRequest, LoginRequest, ForgotPasswordRequest, ResetPasswordRequest, AuthenticatedRequest } from '../types';

export class AuthController {
    static async register(req: Request, res: Response) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                error: errors.array()
            });
        }

        const { email, password, firstName, lastName, phoneNumber }: RegisterRequest = req.body;

        // Check if user already exists
        const existingUser = await User.findByEmail(email);
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: 'User with this email already exists'
            });
        }

        // Create new user
        const user = new User({
            email,
            passwordHash: password, // Will be hashed by pre-save middleware
            firstName,
            lastName,
            phoneNumber
        });

        // Generate verification token
        const verificationToken = user.generateVerificationToken();
        await user.save();

        // Send verification email
        try {
            await emailService.sendVerificationEmail(email, verificationToken);
        } catch (error) {
            console.error('Failed to send verification email:', error);
        }

        // Generate tokens
        const accessToken = generateAccessToken({
            userId: user._id.toString(),
            email: user.email,
            role: user.role
        });

        const refreshToken = generateRefreshToken({
            userId: user._id.toString(),
            email: user.email,
            role: user.role
        });

        const response: ApiResponse = {
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

    static async login(req: Request, res: Response) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                error: errors.array()
            });
        }

        const { email, password }: LoginRequest = req.body;

        // Find user
        const user = await User.findByEmail(email);
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Check password
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Update last login
        user.lastLogin = new Date();
        await user.save();

        // Generate tokens
        const accessToken = generateAccessToken({
            userId: user._id.toString(),
            email: user.email,
            role: user.role
        });

        const refreshToken = generateRefreshToken({
            userId: user._id.toString(),
            email: user.email,
            role: user.role
        });

        const response: ApiResponse = {
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

    static async verifyEmail(req: Request, res: Response) {
        const { token } = req.query;

        if (!token || typeof token !== 'string') {
            return res.status(400).json({
                success: false,
                message: 'Verification token is required'
            });
        }

        const user = await User.findByVerificationToken(token);
        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired verification token'
            });
        }

        user.emailVerified = true;
        user.verificationToken = undefined;
        await user.save();

        // Send welcome email
        try {
            await emailService.sendWelcomeEmail(user.email, user.firstName);
        } catch (error) {
            console.error('Failed to send welcome email:', error);
        }

        return res.json({
            success: true,
            message: 'Email verified successfully'
        });
    }

    static async forgotPassword(req: Request, res: Response) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                error: errors.array()
            });
        }

        const { email }: ForgotPasswordRequest = req.body;

        const user = await User.findByEmail(email);
        if (!user) {
            // Don't reveal if user exists or not
            return res.json({
                success: true,
                message: 'If an account with that email exists, a password reset link has been sent'
            });
        }

        const resetToken = user.generatePasswordResetToken();
        await user.save();

        try {
            await emailService.sendPasswordResetEmail(email, resetToken);
        } catch (error) {
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

    static async resetPassword(req: Request, res: Response) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                error: errors.array()
            });
        }

        const { token, password }: ResetPasswordRequest = req.body;

        const user = await User.findByResetPasswordToken(token);
        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired reset token'
            });
        }

        user.passwordHash = password; // Will be hashed by pre-save middleware
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        return res.json({
            success: true,
            message: 'Password reset successfully'
        });
    }

    static async getMe(req: AuthenticatedRequest, res: Response) {
        const user = req.user!;

        const response: ApiResponse = {
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

    static async changePassword(req: AuthenticatedRequest, res: Response) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                error: errors.array()
            });
        }

        const { currentPassword, newPassword } = req.body;
        const user = req.user!;

        // Get the full user document to access methods
        const userDoc = await User.findById(user._id);
        if (!userDoc) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Verify current password
        const isCurrentPasswordValid = await (userDoc as any).comparePassword(currentPassword);
        if (!isCurrentPasswordValid) {
            return res.status(400).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }

        // Update password
        (userDoc as any).passwordHash = newPassword; // Will be hashed by pre-save middleware
        await userDoc.save();

        const response: ApiResponse = {
            success: true,
            message: 'Password changed successfully'
        };

        return res.json(response);
    }
} 