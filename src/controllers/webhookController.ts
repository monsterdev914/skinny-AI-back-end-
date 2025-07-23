import { Request, Response } from 'express';
import stripeService from '../services/stripe';

export class WebhookController {
    // Handle Stripe webhooks
    static async handleStripeWebhook(req: Request, res: Response) {
        try {
            const signature = req.headers['stripe-signature'] as string;
            
            if (!signature) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing Stripe signature'
                });
            }

            // Handle the webhook event
            await stripeService.processWebhook(req.body, signature);
            
            return res.json({
                success: true,
                message: 'Webhook handled successfully'
            });
        } catch (error) {
            console.error('Stripe webhook error:', error);
            return res.status(400).json({
                success: false,
                message: 'Webhook handling failed'
            });
        }
    }
}

// Middleware to parse raw body for webhooks
export const parseRawBody = (req: Request, _res: Response, next: any) => {
    if (req.originalUrl === '/api/webhooks/stripe') {
        req.body = Buffer.from(req.body, 'utf8');
    }
    next();
}; 