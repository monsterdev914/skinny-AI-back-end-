import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { SubscriptionController } from '../controllers/subscription';

const router = Router();

// Get user subscriptions
router.get('/', authenticateToken, asyncHandler(SubscriptionController.getUserSubscriptions));

export default router; 