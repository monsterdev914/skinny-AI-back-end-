import { Router } from 'express';
import { authenticateToken, requireUser } from '../middleware/auth';

const router = Router();

// Get user profile
router.get('/profile', authenticateToken, requireUser, (req, res) => {
    res.json({
        success: true,
        message: 'Profile retrieved successfully',
        data: { user: req.user }
    });
});

// Update user profile
router.put('/profile', authenticateToken, requireUser, (req, res) => {
    res.json({
        success: true,
        message: 'Profile updated successfully'
    });
});

export default router; 