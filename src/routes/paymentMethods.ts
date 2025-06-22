import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Get user payment methods
router.get('/', authenticateToken, (req, res) => {
    res.json({
        success: true,
        message: 'Payment methods retrieved successfully',
        data: { paymentMethods: [] }
    });
});

export default router; 