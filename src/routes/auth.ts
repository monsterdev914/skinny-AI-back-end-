import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import { User } from '../models/User';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt';
import { emailService } from '../utils/email';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticateToken } from '../middleware/auth';
import { ApiResponse, RegisterRequest, LoginRequest, ForgotPasswordRequest, ResetPasswordRequest } from '../types';

const router = Router();

// Register
router.post('/register', [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('firstName').optional().trim().isLength({ max: 50 }),
    body('lastName').optional().trim().isLength({ max: 50 }),
    body('phoneNumber').optional().trim()
], asyncHandler(async (req: Request, res: Response) => {
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

    res.status(201).json(response);
}));

// Login
router.post('/login', [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty()
], asyncHandler(async (req: Request, res: Response) => {
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

    res.json(response);
}));

// Verify email
router.get('/verify-email', asyncHandler(async (req: Request, res: Response) => {
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

    res.json({
        success: true,
        message: 'Email verified successfully'
    });
}));

// Forgot password
router.post('/forgot-password', [
    body('email').isEmail().normalizeEmail()
], asyncHandler(async (req: Request, res: Response) => {
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

    res.json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent'
    });
}));

// Reset password
router.post('/reset-password', [
    body('token').notEmpty(),
    body('password').isLength({ min: 6 })
], asyncHandler(async (req: Request, res: Response) => {
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

    res.json({
        success: true,
        message: 'Password reset successfully'
    });
}));

// Get current user
router.get('/me', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user;

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

    res.json(response);
}));

export default router; 