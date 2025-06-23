import { Router } from 'express';
import { body } from 'express-validator';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticateToken } from '../middleware/auth';
import { AuthController } from '../controllers/auth';

const router = Router();

// Register
router.post('/register', [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('firstName').optional().trim().isLength({ max: 50 }),
    body('lastName').optional().trim().isLength({ max: 50 }),
    body('phoneNumber').optional().trim()
], asyncHandler(AuthController.register));

// Login
router.post('/login', [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty()
], asyncHandler(AuthController.login));

// Verify email
router.get('/verify-email', asyncHandler(AuthController.verifyEmail));

// Forgot password
router.post('/forgot-password', [
    body('email').isEmail().normalizeEmail()
], asyncHandler(AuthController.forgotPassword));

// Reset password
router.post('/reset-password', [
    body('token').notEmpty(),
    body('password').isLength({ min: 6 })
], asyncHandler(AuthController.resetPassword));

// Get current user
router.get('/me', authenticateToken, asyncHandler(AuthController.getMe));

// Change password
router.post('/change-password', [
    authenticateToken,
    body('currentPassword').notEmpty(),
    body('newPassword').isLength({ min: 6 })
], asyncHandler(AuthController.changePassword));

export default router; 