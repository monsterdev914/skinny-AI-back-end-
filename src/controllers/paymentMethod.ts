import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { PaymentMethod } from '../models/PaymentMethod';
import stripeService from '../services/stripe';
import { body, validationResult } from 'express-validator';

export class PaymentMethodController {
    // Get user's payment methods
    static async getUserPaymentMethods(req: AuthenticatedRequest, res: Response) {
        try {
            const userId = req.user?.id;
            
            const paymentMethods = await PaymentMethod.find({ userId })
                .sort({ isDefault: -1, createdAt: -1 });
            
            return res.json({
                success: true,
                message: 'Payment methods retrieved successfully',
                data: { paymentMethods }
            });
        } catch (error) {
            console.error('Get payment methods error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to retrieve payment methods'
            });
        }
    }

    // Create a new payment method
    static async createPaymentMethod(req: AuthenticatedRequest, res: Response) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: errors.array()
                });
            }

            const { paymentMethodId, setAsDefault = false } = req.body;
            
            // Get or create customer
            const customer = await stripeService.getOrCreateCustomer(req.user!);
            
            // Attach payment method to customer
            const paymentMethod = await stripeService.createPaymentMethod(
                customer.id,
                paymentMethodId
            );
            
            // Create database payment method record
            const dbPaymentMethod = new PaymentMethod({
                userId: req.user!._id,
                stripePaymentMethodId: paymentMethod.id,
                type: paymentMethod.type,
                card: paymentMethod.card ? {
                    brand: paymentMethod.card.brand,
                    last4: paymentMethod.card.last4,
                    expMonth: paymentMethod.card.exp_month,
                    expYear: paymentMethod.card.exp_year,
                } : undefined,
                isDefault: setAsDefault,
            });
            
            await dbPaymentMethod.save();
            
            // Set as default if requested
            if (setAsDefault) {
                // Set all other payment methods as non-default
                await PaymentMethod.updateMany(
                    { userId: req.user!._id, _id: { $ne: dbPaymentMethod._id } },
                    { isDefault: false }
                );
                
                // Update Stripe customer default payment method
                await stripeService.updateDefaultPaymentMethod(customer.id, paymentMethod.id);
            }
            
            return res.json({
                success: true,
                message: 'Payment method created successfully',
                data: { paymentMethod: dbPaymentMethod }
            });
        } catch (error) {
            console.error('Create payment method error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to create payment method'
            });
        }
    }

    // Set default payment method
    static async setDefaultPaymentMethod(req: AuthenticatedRequest, res: Response) {
        try {
            const { paymentMethodId } = req.params;
            const userId = req.user?.id;
            
            // Verify payment method belongs to user
            const paymentMethod = await PaymentMethod.findOne({
                _id: paymentMethodId,
                userId
            });
            
            if (!paymentMethod) {
                return res.status(404).json({
                    success: false,
                    message: 'Payment method not found'
                });
            }
            
            // Get customer
            const customer = await stripeService.getOrCreateCustomer(req.user!);
            
            // Update default payment method in Stripe
            await stripeService.updateDefaultPaymentMethod(customer.id, paymentMethod.stripePaymentMethodId!);
            
            // Update database records
            await PaymentMethod.updateMany(
                { userId: req.user!._id },
                { isDefault: false }
            );
            
            paymentMethod.isDefault = true;
            await paymentMethod.save();
            
            return res.json({
                success: true,
                message: 'Default payment method updated successfully',
                data: { paymentMethod }
            });
        } catch (error) {
            console.error('Set default payment method error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to set default payment method'
            });
        }
    }

    // Delete payment method
    static async deletePaymentMethod(req: AuthenticatedRequest, res: Response) {
        try {
            const { paymentMethodId } = req.params;
            const userId = req.user?.id;
            
            // Verify payment method belongs to user
            const paymentMethod = await PaymentMethod.findOne({
                _id: paymentMethodId,
                userId
            });
            
            if (!paymentMethod) {
                return res.status(404).json({
                    success: false,
                    message: 'Payment method not found'
                });
            }
            
            // Check if this is the default payment method
            if (paymentMethod.isDefault) {
                const otherMethods = await PaymentMethod.find({
                    userId,
                    _id: { $ne: paymentMethodId }
                });
                
                if (otherMethods.length > 0) {
                    return res.status(400).json({
                        success: false,
                        message: 'Cannot delete default payment method. Please set another payment method as default first.'
                    });
                }
            }
            
            await stripeService.deletePaymentMethod(paymentMethod.stripePaymentMethodId!);
            
            // Delete from database
            await PaymentMethod.findByIdAndDelete(paymentMethodId);
            
            return res.json({
                success: true,
                message: 'Payment method deleted successfully'
            });
        } catch (error) {
            console.error('Delete payment method error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to delete payment method'
            });
        }
    }

    // Get payment method details
    static async getPaymentMethod(req: AuthenticatedRequest, res: Response) {
        try {
            const { paymentMethodId } = req.params;
            const userId = req.user?.id;
            
            const paymentMethod = await PaymentMethod.findOne({
                _id: paymentMethodId,
                userId
            });
            
            if (!paymentMethod) {
                return res.status(404).json({
                    success: false,
                    message: 'Payment method not found'
                });
            }
            
            return res.json({
                success: true,
                message: 'Payment method retrieved successfully',
                data: { paymentMethod }
            });
        } catch (error) {
            console.error('Get payment method error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to retrieve payment method'
            });
        }
    }

    // Create setup intent for adding new payment method
    static async createSetupIntent(req: AuthenticatedRequest, res: Response) {
        try {
            const customer = await stripeService.getOrCreateCustomer(req.user!);
            const stripe = stripeService.getStripeInstance();
            
            const setupIntent = await stripe.setupIntents.create({
                customer: customer.id,
                payment_method_types: ['card'],
                usage: 'off_session',
            });
            
            return res.json({
                success: true,
                message: 'Setup intent created successfully',
                data: { 
                    clientSecret: setupIntent.client_secret,
                    setupIntentId: setupIntent.id
                }
            });
        } catch (error) {
            console.error('Create setup intent error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to create setup intent'
            });
        }
    }

    // Confirm setup intent and save payment method
    static async confirmSetupIntent(req: AuthenticatedRequest, res: Response) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: errors.array()
                });
            }

            const { setupIntentId, setAsDefault = false } = req.body;
            const stripe = stripeService.getStripeInstance();
            
            // Retrieve setup intent
            const setupIntent = await stripe.setupIntents.retrieve(setupIntentId);
            
            if (setupIntent.status !== 'succeeded') {
                return res.status(400).json({
                    success: false,
                    message: 'Setup intent not succeeded'
                });
            }
            
            if (!setupIntent.payment_method) {
                return res.status(400).json({
                    success: false,
                    message: 'No payment method found in setup intent'
                });
            }
            
            // Get or create customer first
            const customer = await stripeService.getOrCreateCustomer(req.user!);
            
            // Attach payment method to customer
            const paymentMethod = await stripeService.createPaymentMethod(
                customer.id,
                setupIntent.payment_method as string
            );
            
            // Create database payment method record
            const dbPaymentMethod = new PaymentMethod({
                userId: req.user!._id,
                stripePaymentMethodId: paymentMethod.id,
                type: paymentMethod.type,
                card: paymentMethod.card ? {
                    brand: paymentMethod.card.brand,
                    last4: paymentMethod.card.last4,
                    expMonth: paymentMethod.card.exp_month,
                    expYear: paymentMethod.card.exp_year,
                } : undefined,
                isDefault: setAsDefault,
            });
            
            await dbPaymentMethod.save();
            
            // Set as default if requested
            if (setAsDefault) {
                // Set all other payment methods as non-default
                await PaymentMethod.updateMany(
                    { userId: req.user!._id, _id: { $ne: dbPaymentMethod._id } },
                    { isDefault: false }
                );
                
                // Update Stripe customer default payment method
                await stripeService.updateDefaultPaymentMethod(customer.id, paymentMethod.id);
            }
            
            return res.json({
                success: true,
                message: 'Payment method added successfully',
                data: { paymentMethod: dbPaymentMethod }
            });
        } catch (error) {
            console.error('Confirm setup intent error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to confirm setup intent'
            });
        }
    }
}

// Validation middleware
export const createPaymentMethodValidation = [
    body('paymentMethodId')
        .isString()
        .notEmpty()
        .withMessage('Payment method ID is required'),
    body('setAsDefault')
        .optional()
        .isBoolean()
        .withMessage('setAsDefault must be a boolean')
];

export const confirmSetupIntentValidation = [
    body('setupIntentId')
        .isString()
        .notEmpty()
        .withMessage('Setup intent ID is required'),
    body('setAsDefault')
        .optional()
        .isBoolean()
        .withMessage('setAsDefault must be a boolean')
]; 