import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { 
    SubscriptionController, 
    createSubscriptionValidation, 
    updateSubscriptionValidation 
} from '../controllers/subscription';

const router = Router();

// Get current subscription
router.get('/current', authenticateToken, asyncHandler(SubscriptionController.getCurrentSubscription));

// Get subscription history
router.get('/history', authenticateToken, asyncHandler(SubscriptionController.getSubscriptionHistory));

// Get subscription logs
router.get('/logs', authenticateToken, asyncHandler(SubscriptionController.getSubscriptionLogs));

// Create new subscription
router.post(
    '/', 
    authenticateToken, 
    createSubscriptionValidation, 
    asyncHandler(SubscriptionController.createSubscription)
);

// Update subscription (upgrade/downgrade)
router.put(
    '/:subscriptionId', 
    authenticateToken, 
    updateSubscriptionValidation, 
    asyncHandler(SubscriptionController.updateSubscription)
);

// Get subscription preview for plan changes
router.get(
    '/:subscriptionId/preview', 
    authenticateToken, 
    asyncHandler(SubscriptionController.getSubscriptionPreview)
);

// Cancel subscription
router.post(
    '/:subscriptionId/cancel', 
    authenticateToken, 
    asyncHandler(SubscriptionController.cancelSubscription)
);

// Reactivate subscription
router.post(
    '/:subscriptionId/reactivate', 
    authenticateToken, 
    asyncHandler(SubscriptionController.reactivateSubscription)
);

// Get subscription status (for polling after creation)
router.get(
    '/:subscriptionId/status', 
    authenticateToken, 
    asyncHandler(SubscriptionController.getSubscriptionStatus)
);

export default router; 