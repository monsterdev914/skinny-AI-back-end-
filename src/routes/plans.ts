import { Router } from 'express';
import { Plan } from '../models/Plan';

const router = Router();

// Get all active plans
router.get('/', async (req, res) => {
    try {
        const plans = await Plan.findActive();
        res.json({
            success: true,
            message: 'Plans retrieved successfully',
            data: { plans }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve plans'
        });
    }
});

// Get plan by ID
router.get('/:id', async (req, res) => {
    try {
        const plan = await Plan.findById(req.params.id);
        if (!plan) {
            return res.status(404).json({
                success: false,
                message: 'Plan not found'
            });
        }
        res.json({
            success: true,
            message: 'Plan retrieved successfully',
            data: { plan }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve plan'
        });
    }
});

export default router; 