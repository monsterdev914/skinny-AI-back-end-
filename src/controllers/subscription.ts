import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { Subscription } from '../models/Subscription';
import { SubscriptionLog } from '../models/SubscriptionLog';
import { Plan } from '../models/Plan';
import stripeService from '../services/stripe';
import { body, validationResult } from 'express-validator';

export class SubscriptionController {
    // Get user's current subscription
    static async getCurrentSubscription(req: AuthenticatedRequest, res: Response) {
        try {
            const userId = req.user?.id;
            
            const subscription = await Subscription.findOne({
                userId,
                status: { $in: ['active', 'trialing', 'past_due'] }
            }).populate('planId').populate('paymentMethodId');
            
            if (!subscription) {
                return res.json({
                    success: true,
                    message: 'No active subscription found',
                    data: { subscription: null }
                });
            }
            
            return res.json({
                success: true,
                message: 'Subscription retrieved successfully',
                data: { subscription }
            });
        } catch (error) {
            console.error('Get current subscription error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to retrieve subscription'
            });
        }
    }

    // Get user's subscription history
    static async getSubscriptionHistory(req: AuthenticatedRequest, res: Response) {
        try {
            const userId = req.user?.id;
            const limit = parseInt(req.query['limit'] as string) || 50;
            
            const subscriptions = await Subscription.find({ userId })
                .sort({ createdAt: -1 })
                .limit(limit)
                .populate('planId')
                .populate('paymentMethodId');
            
            return res.json({
                success: true,
                message: 'Subscription history retrieved successfully',
                data: { subscriptions }
            });
        } catch (error) {
            console.error('Get subscription history error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to retrieve subscription history'
            });
        }
    }

    // Get subscription logs
    static async getSubscriptionLogs(req: AuthenticatedRequest, res: Response) {
        try {
            const userId = req.user?.id;
            const limit = parseInt(req.query['limit'] as string) || 50;
            
            const logs = await (SubscriptionLog as any).getSubscriptionHistory(userId, limit);
            
            return res.json({
                success: true,
                message: 'Subscription logs retrieved successfully',
                data: { logs }
            });
        } catch (error) {
            console.error('Get subscription logs error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to retrieve subscription logs'
            });
        }
    }

    // Create a new subscription
    static async createSubscription(req: AuthenticatedRequest, res: Response) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: errors.array()
                });
            }

            const userId = req.user?.id;
            const { planId, paymentMethodId } = req.body;
            
            // Check if user already has an active subscription
            const existingSubscription = await Subscription.findOne({
                userId,
                status: { $in: ['active', 'trialing', 'past_due'] }
            });
            
            if (existingSubscription) {
                return res.status(400).json({
                    success: false,
                    message: 'User already has an active subscription'
                });
            }
            
            // Verify plan exists
            const plan = await Plan.findById(planId);
            if (!plan) {
                return res.status(404).json({
                    success: false,
                    message: 'Plan not found'
                });
            }
            
            
            
            const { subscription, dbSubscription } = await stripeService.createSubscription(
                req.user!,
                planId,
                paymentMethodId
            );
            
            // For free plans, subscription is immediately active
            if (!subscription) {
                return res.json({
                    success: true,
                    message: 'Free subscription activated successfully',
                    data: {
                        subscription: dbSubscription,
                        status: 'active',
                        requiresAction: false
                    }
                });
            }
            
            // For paid plans, handle different subscription states
            const response: any = {
                success: true,
                data: {
                    subscription: dbSubscription,
                    status: subscription.status,
                    requiresAction: false,
                    clientSecret: null
                }
            };
            
            switch (subscription.status) {
                case 'active':
                case 'trialing':
                    response.message = 'Subscription created and activated successfully';
                    break;
                    
                case 'incomplete':
                    response.message = 'Subscription created - payment confirmation required';
                    response.data.requiresAction = true;
                    
                    // Extract client secret for payment confirmation
                    if (typeof subscription.latest_invoice === 'object' && 
                        subscription.latest_invoice?.payment_intent) {
                        const paymentIntent = subscription.latest_invoice.payment_intent;
                        if (typeof paymentIntent === 'object' && paymentIntent.client_secret) {
                            response.data.clientSecret = paymentIntent.client_secret;
                        }
                    }
                    break;
                    
                case 'incomplete_expired':
                    response.success = false;
                    response.message = 'Subscription creation failed - payment expired';
                    break;
                    
                default:
                    response.message = `Subscription created with status: ${subscription.status}`;
                    response.data.requiresAction = ['incomplete', 'past_due'].includes(subscription.status);
            }
            
            return res.json(response);
        } catch (error) {
            console.error('Create subscription error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to create subscription'
            });
        }
    }
    
    // Get subscription status (for polling after creation)
    static async getSubscriptionStatus(req: AuthenticatedRequest, res: Response) {
        try {
            const { subscriptionId } = req.params;
            const userId = req.user?.id;
            
            // Find subscription that belongs to user
            const subscription = await Subscription.findOne({
                _id: subscriptionId,
                userId
            }).populate('planId');
            
            if (!subscription) {
                return res.status(404).json({
                    success: false,
                    message: 'Subscription not found'
                });
            }
            
            // If it's a Stripe subscription, get latest status
            let stripeStatus = subscription.status;
            if (subscription.stripeSubscriptionId) {
                try {
                    const stripeSubscription = await stripeService.getSubscription(subscription.stripeSubscriptionId);
                    stripeStatus = stripeSubscription.status as any;
                    
                    // Update local status if different (webhook might be delayed)
                    if (stripeStatus !== subscription.status) {
                        subscription.status = stripeStatus;
                        await subscription.save();
                    }
                } catch (error) {
                    console.error('Error fetching Stripe subscription status:', error);
                    // Use local status as fallback
                }
            }
            
            return res.json({
                success: true,
                message: 'Subscription status retrieved successfully',
                data: {
                    subscription,
                    status: stripeStatus,
                    isActive: ['active', 'trialing'].includes(stripeStatus),
                    requiresPayment: ['incomplete', 'past_due'].includes(stripeStatus)
                }
            });
        } catch (error) {
            console.error('Get subscription status error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to retrieve subscription status'
            });
        }
    }

    // Update subscription (upgrade/downgrade)
    static async updateSubscription(req: AuthenticatedRequest, res: Response) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: errors.array()
                });
            }

            const userId = req.user?.id;
            const { subscriptionId } = req.params;
            const { planId } = req.body;
            
            // Verify subscription belongs to user
            const subscription = await Subscription.findOne({
                _id: subscriptionId,
                userId,
                status: { $in: ['active', 'trialing', 'past_due'] }
            });
            
            if (!subscription) {
                return res.status(404).json({
                    success: false,
                    message: 'Subscription not found'
                });
            }
            
            // Verify plan exists
            const plan = await Plan.findById(planId);
            if (!plan) {
                return res.status(404).json({
                    success: false,
                    message: 'Plan not found'
                });
            }
            
            const stripeSubscription = await stripeService.updateSubscription(
                subscription.stripeSubscriptionId!,
                plan.stripePriceId!
            );
            
            // Store old plan for logging
            const oldPlanId = subscription.planId;
            
            // Update local subscription record
            subscription.planId = planId;
            subscription.updatedAt = new Date();
            await subscription.save();
            
            // Determine action type (upgraded vs downgraded)
            const oldPlan = await Plan.findById(oldPlanId);
            const isUpgrade = (plan.price || 0) > (oldPlan?.price || 0);
            
            // Log the subscription change
            await SubscriptionLog.create({
                userId: subscription.userId,
                subscriptionId: subscription._id,
                action: isUpgrade ? 'upgraded' : 'downgraded',
                details: { 
                    fromPlanId: oldPlanId?.toString(),
                    toPlanId: planId,
                    fromAmount: oldPlan?.price,
                    toAmount: plan.price
                }
            });
            
            return res.json({
                success: true,
                message: 'Subscription updated successfully',
                data: { subscription: stripeSubscription }
            });
        } catch (error) {
            console.error('Update subscription error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to update subscription'
            });
        }
    }

    // Cancel subscription
    static async cancelSubscription(req: AuthenticatedRequest, res: Response) {
        try {
            const userId = req.user?.id;
            const { subscriptionId } = req.params;
            const { cancelAtPeriodEnd = true } = req.body;
            
            // Verify subscription belongs to user
            const subscription = await Subscription.findOne({
                _id: subscriptionId,
                userId,
                status: { $in: ['active', 'trialing', 'past_due'] }
            });
            
            if (!subscription) {
                return res.status(404).json({
                    success: false,
                    message: 'Subscription not found'
                });
            }
            
            const stripeSubscription = await stripeService.cancelSubscription(subscription.stripeSubscriptionId!);
            
            return res.json({
                success: true,
                message: 'Subscription cancelled successfully',
                data: { 
                    subscription: {
                        ...subscription.toObject(),
                        cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
                        canceledAt: stripeSubscription.canceled_at ? new Date(stripeSubscription.canceled_at * 1000) : null
                    }
                }
            });
        } catch (error) {
            console.error('Cancel subscription error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to cancel subscription'
            });
        }
    }

    // Reactivate subscription
    static async reactivateSubscription(req: AuthenticatedRequest, res: Response) {
        try {
            const userId = req.user?.id;
            const { subscriptionId } = req.params;
            
            // Verify subscription belongs to user
            const subscription = await Subscription.findOne({
                _id: subscriptionId,
                userId,
                cancelAtPeriodEnd: true
            });
            
            if (!subscription) {
                return res.status(404).json({
                    success: false,
                    message: 'Subscription not found or not cancelled'
                });
            }
            
            await stripeService.reactivateSubscription(subscription.stripeSubscriptionId!);
            
            return res.json({
                success: true,
                message: 'Subscription reactivated successfully',
                data: { 
                    subscription: {
                        ...subscription.toObject(),
                        cancelAtPeriodEnd: false,
                        canceledAt: null
                    }
                }
            });
        } catch (error) {
            console.error('Reactivate subscription error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to reactivate subscription'
            });
        }
    }

    // Get subscription details with invoice preview for plan changes
    static async getSubscriptionPreview(req: AuthenticatedRequest, res: Response) {
        try {
            const userId = req.user?.id;
            const { subscriptionId } = req.params;
            const { planId } = req.query;
            
            // Verify subscription belongs to user
            const subscription = await Subscription.findOne({
                _id: subscriptionId,
                userId,
                status: { $in: ['active', 'trialing', 'past_due'] }
            }).populate('planId');
            
            if (!subscription) {
                return res.status(404).json({
                    success: false,
                    message: 'Subscription not found'
                });
            }
            
            if (!planId) {
                return res.status(400).json({
                    success: false,
                    message: 'planId is required'
                });
            }
            
            // Get plan details
            const newPlan = await Plan.findById(planId);
            if (!newPlan) {
                return res.status(404).json({
                    success: false,
                    message: 'Plan not found'
                });
            }
            
            // Get preview from Stripe
            const stripeService = (await import('../services/stripe')).default;
            const stripe = stripeService.getStripeInstance();
            
            const newPriceId = newPlan.stripePriceId;
            
            const stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripeSubscriptionId!);
            
            if (!stripeSubscription.items.data[0]?.id) {
                return res.status(400).json({
                    success: false,
                    message: 'Subscription item not found'
                });
            }
            
            // Create preview invoice
            const preview = await stripe.invoices.retrieveUpcoming({
                customer: stripeSubscription.customer as string,
                subscription: subscription.stripeSubscriptionId!,
                subscription_items: [{
                    id: stripeSubscription.items.data[0].id,
                    price: newPriceId!,
                }],
                subscription_proration_behavior: 'always_invoice',
            });
            
            return res.json({
                success: true,
                message: 'Subscription preview retrieved successfully', 
                data: {
                    preview: {
                        amountDue: preview.amount_due,
                        currency: preview.currency,
                        periodStart: new Date(preview.period_start * 1000),
                        periodEnd: new Date(preview.period_end * 1000),
                        prorationAmount: preview.lines.data
                            .filter(line => line.proration)
                            .reduce((sum, line) => sum + line.amount, 0),
                        items: preview.lines.data.map(line => ({
                            description: line.description,
                            amount: line.amount,
                            currency: line.currency,
                            proration: line.proration
                        }))
                    },
                    currentPlan: subscription.planId,
                    newPlan: newPlan
                }
            });
        } catch (error) {
            console.error('Get subscription preview error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to get subscription preview'
            });
        }
    }
}

// Validation middleware
export const createSubscriptionValidation = [
    body('planId')
        .isMongoId()
        .withMessage('Valid plan ID is required'),
    body('paymentMethodId')
        .optional()
        .isString()
        .withMessage('Payment method ID must be a string')
];

export const updateSubscriptionValidation = [
    body('planId')
        .isMongoId()
        .withMessage('Valid plan ID is required'),
]; 