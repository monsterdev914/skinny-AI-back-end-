import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { WebhookController } from '../controllers/webhookController';
import express from 'express';

const router = Router();

// Handle Stripe webhooks - use raw body parser
router.post(
    '/stripe',
    express.raw({ type: 'application/json' }),
    asyncHandler(WebhookController.handleStripeWebhook)
);

export default router; 