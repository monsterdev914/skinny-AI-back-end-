import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Get user subscriptions
router.get('/', authenticateToken, (req, res) => {
    res.json({
        success: true,
        message: 'Subscriptions retrieved successfully',
        data: { subscriptions: [] }
    });
});

export default router; 