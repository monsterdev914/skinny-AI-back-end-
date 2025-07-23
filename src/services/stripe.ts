import Stripe from 'stripe';
import { User } from '../models/User';
import { Plan } from '../models/Plan';
import { Subscription } from '../models/Subscription';
import { SubscriptionLog } from '../models/SubscriptionLog';
import { PaymentMethod } from '../models/PaymentMethod'; // Added import for PaymentMethod

class StripeService {
    private stripe: Stripe | null = null;

    // Lazy initialization of Stripe
    private getStripe(): Stripe {
        if (!this.stripe) {
            const stripeSecretKey = process.env['STRIPE_SECRET_KEY'];
            if (!stripeSecretKey) {
                throw new Error('STRIPE_SECRET_KEY environment variable is required');
            }
            
            this.stripe = new Stripe(stripeSecretKey, {
                apiVersion: '2023-08-16',
                typescript: true,
            });
        }
        return this.stripe;
    }

    // Create a new customer in Stripe
    async createCustomer(email: string, name?: string): Promise<Stripe.Customer> {
        const customerData: Stripe.CustomerCreateParams = { email };
        if (name) {
            customerData.name = name;
        }
        const customer = await this.getStripe().customers.create(customerData);
        return customer;
    }

    // Get existing customer or create new one
    async getOrCreateCustomer(user: any): Promise<Stripe.Customer> {
        // If user already has a Stripe customer ID, retrieve the customer
        if (user.stripeCustomerId) {
            try {
                const customer = await this.getStripe().customers.retrieve(user.stripeCustomerId);
                return customer as Stripe.Customer;
            } catch (error) {
                console.error('Error retrieving existing customer, creating new one:', error);
                // If customer doesn't exist in Stripe, create a new one
            }
        }

        // Create new customer
        const customerName = user.firstName && user.lastName 
            ? `${user.firstName} ${user.lastName}` 
            : undefined;
        
        const customer = await this.createCustomer(user.email, customerName);

        // Update user record with new customer ID
        await User.findByIdAndUpdate(user._id, { 
            stripeCustomerId: customer.id 
        });

        return customer;
    }

    // Create a checkout session for subscription
    async createCheckoutSession(
        customerId: string,
        priceId: string,
        successUrl: string,
        cancelUrl: string
    ): Promise<Stripe.Checkout.Session> {
        const session = await this.getStripe().checkout.sessions.create({
            customer: customerId,
            payment_method_types: ['card'],
            mode: 'subscription',
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            success_url: successUrl,
            cancel_url: cancelUrl,
            subscription_data: {
                trial_period_days: 0, // No trial period since we have a free plan
            },
        });
        return session;
    }

    // Create a one-time payment session (for Free plan setup)
    async createOneTimePaymentSession(
        customerId: string,
        priceId: string,
        successUrl: string,
        cancelUrl: string
    ): Promise<Stripe.Checkout.Session> {
        const session = await this.getStripe().checkout.sessions.create({
            customer: customerId,
            payment_method_types: ['card'],
            mode: 'payment',
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            success_url: successUrl,
            cancel_url: cancelUrl,
        });
        return session;
    }

    // Create a subscription for a user
    async createSubscription(
        user: any,
        planId: string,
        billingCycle: 'monthly' | 'yearly' | 'one-time',
        paymentMethodId?: string
    ): Promise<{ subscription: Stripe.Subscription | null; dbSubscription: any }> {
        // Get or create customer
        const customer = await this.getOrCreateCustomer(user);

        // Get plan details
        const plan = await Plan.findById(planId);
        if (!plan) {
            throw new Error('Plan not found');
        }

        let stripeSubscription: Stripe.Subscription | null = null;

        // For paid plans, create Stripe subscription
        if (plan.price && plan.price > 0 && plan.stripePriceId) {
            const subscriptionData: any = {
                customer: customer.id,
                items: [{ price: plan.stripePriceId }],
                trial_period_days: 0,
                expand: ['latest_invoice.payment_intent'], // Expand to get payment intent details
                payment_behavior: 'default_incomplete', // Handle incomplete payments properly
            };

            // Add payment method if provided
            if (paymentMethodId) {
                subscriptionData.default_payment_method = paymentMethodId;
            }

            stripeSubscription = await this.getStripe().subscriptions.create(subscriptionData);
        }

        // Create database subscription record
        const dbSubscription = new Subscription({
            userId: user._id,
            planId: plan._id,
            stripeSubscriptionId: stripeSubscription?.id || null,
            stripeCustomerId: customer.id,
            stripePriceId: plan.stripePriceId || null,
            status: stripeSubscription ? stripeSubscription.status : 'active',
            billingCycle: billingCycle,
            currentPeriodStart: stripeSubscription 
                ? new Date(stripeSubscription.current_period_start * 1000)
                : new Date(),
            currentPeriodEnd: stripeSubscription 
                ? new Date(stripeSubscription.current_period_end * 1000)
                : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year for free plan
            cancelAtPeriodEnd: false,
        });

        await dbSubscription.save();

        // Log the subscription creation
        await SubscriptionLog.create({
            userId: user._id,
            subscriptionId: dbSubscription._id,
            action: 'created',
            oldStatus: null,
            newStatus: dbSubscription.status,
            metadata: {
                planName: plan.name,
                billingCycle: billingCycle,
                amount: plan.price || 0,
            }
        });

        return {
            subscription: stripeSubscription,
            dbSubscription: dbSubscription
        };
    }

    // Create a customer portal session
    async createCustomerPortalSession(
        customerId: string,
        returnUrl: string
    ): Promise<Stripe.BillingPortal.Session> {
        const session = await this.getStripe().billingPortal.sessions.create({
            customer: customerId,
            return_url: returnUrl,
        });
        return session;
    }

    // Retrieve a customer
    async getCustomer(customerId: string): Promise<Stripe.Customer> {
        const customer = await this.getStripe().customers.retrieve(customerId);
        return customer as Stripe.Customer;
    }

    // Retrieve a subscription
    async getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
        const subscription = await this.getStripe().subscriptions.retrieve(subscriptionId);
        return subscription;
    }

    // Cancel a subscription
    async cancelSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
        const subscription = await this.getStripe().subscriptions.update(subscriptionId, {
            cancel_at_period_end: true,
        });
        return subscription;
    }

    // Reactivate a subscription
    async reactivateSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
        const subscription = await this.getStripe().subscriptions.update(subscriptionId, {
            cancel_at_period_end: false,
        });
        return subscription;
    }

    // Get all subscriptions for a customer
    async getCustomerSubscriptions(customerId: string): Promise<Stripe.Subscription[]> {
        const subscriptions = await this.getStripe().subscriptions.list({
            customer: customerId,
            status: 'all',
        });
        return subscriptions.data;
    }

    // Process webhook events
    async processWebhook(payload: string, signature: string): Promise<void> {
        const webhookSecret = process.env['STRIPE_WEBHOOK_SECRET'];
        if (!webhookSecret) {
            throw new Error('STRIPE_WEBHOOK_SECRET environment variable is required');
        }

        let event: Stripe.Event;

        try {
            event = this.getStripe().webhooks.constructEvent(payload, signature, webhookSecret);
        } catch (err) {
            throw new Error(`Webhook signature verification failed: ${err}`);
        }

        switch (event.type) {
            // Subscription lifecycle events
            case 'customer.subscription.created':
                await this.handleSubscriptionCreated(event.data.object as Stripe.Subscription);
                break;
            case 'customer.subscription.updated':
                await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
                break;
            case 'customer.subscription.deleted':
                await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
                break;
            case 'customer.subscription.trial_will_end':
                await this.handleTrialWillEnd(event.data.object as Stripe.Subscription);
                break;
                
            // Payment events
            case 'invoice.payment_succeeded':
                await this.handlePaymentSucceeded(event.data.object as Stripe.Invoice);
                break;
            case 'invoice.payment_failed':
                await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
                break;
            case 'invoice.upcoming':
                await this.handleUpcomingInvoice(event.data.object as Stripe.Invoice);
                break;
                
            // Customer events
            case 'customer.created':
                await this.handleCustomerCreated(event.data.object as Stripe.Customer);
                break;
                
            // Payment method events
            case 'payment_method.attached':
                await this.handlePaymentMethodAttached(event.data.object as Stripe.PaymentMethod);
                break;
            case 'setup_intent.succeeded':
                await this.handleSetupIntentSucceeded(event.data.object as Stripe.SetupIntent);
                break;
                
            default:
                console.log(`Unhandled event type: ${event.type}`);
        }
    }

    // Handle subscription created webhook
    private async handleSubscriptionCreated(stripeSubscription: Stripe.Subscription): Promise<void> {
        try {
            // Find the user by customer ID
            const user = await User.findOne({ stripeCustomerId: stripeSubscription.customer });
            if (!user) {
                console.error('User not found for customer:', stripeSubscription.customer);
                return;
            }

            // Get the price ID from the subscription
            const priceId = stripeSubscription.items.data[0]?.price.id;
            if (!priceId) {
                console.error('No price ID found in subscription');
                return;
            }

            // Find the plan by price ID
            const plan = await Plan.findOne({ stripePriceId: priceId });
            if (!plan) {
                console.error('Plan not found for price ID:', priceId);
                return;
            }

            // Create subscription record
            const subscription = new Subscription({
                userId: user._id,
                planId: plan._id,
                stripeSubscriptionId: stripeSubscription.id,
                stripeCustomerId: stripeSubscription.customer,
                stripePriceId: priceId,
                status: stripeSubscription.status,
                currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
                currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
                cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
            });

            await subscription.save();

            // Log the subscription change
            await SubscriptionLog.create({
                userId: user._id,
                subscriptionId: subscription._id,
                action: 'created',
                oldStatus: null,
                newStatus: stripeSubscription.status,
                metadata: {
                    planName: plan.name,
                    priceId: priceId,
                    amount: stripeSubscription.items.data[0]?.price.unit_amount || 0,
                }
            });

            console.log('Subscription created successfully:', subscription._id);
        } catch (error) {
            console.error('Error handling subscription created:', error);
        }
    }

    // Handle subscription updated webhook
    private async handleSubscriptionUpdated(stripeSubscription: Stripe.Subscription): Promise<void> {
        try {
            // Find the subscription by Stripe subscription ID
            const subscription = await Subscription.findOne({ 
                stripeSubscriptionId: stripeSubscription.id 
            });
            
            if (!subscription) {
                console.error('Subscription not found:', stripeSubscription.id);
                return;
            }

            const oldStatus = subscription.status;
            
            // Update subscription details
            subscription.status = stripeSubscription.status as any; // Handle Stripe's additional status types
            subscription.currentPeriodStart = new Date(stripeSubscription.current_period_start * 1000);
            subscription.currentPeriodEnd = new Date(stripeSubscription.current_period_end * 1000);
            subscription.cancelAtPeriodEnd = stripeSubscription.cancel_at_period_end;

            await subscription.save();

            // Log the subscription change
            await SubscriptionLog.create({
                userId: subscription.userId,
                subscriptionId: subscription._id,
                action: 'updated',
                oldStatus: oldStatus,
                newStatus: stripeSubscription.status,
                metadata: {
                    cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
                }
            });

            console.log('Subscription updated successfully:', subscription._id);
        } catch (error) {
            console.error('Error handling subscription updated:', error);
        }
    }

    // Handle subscription deleted webhook
    private async handleSubscriptionDeleted(stripeSubscription: Stripe.Subscription): Promise<void> {
        try {
            // Find the subscription by Stripe subscription ID
            const subscription = await Subscription.findOne({ 
                stripeSubscriptionId: stripeSubscription.id 
            });
            
            if (!subscription) {
                console.error('Subscription not found:', stripeSubscription.id);
                return;
            }

            const oldStatus = subscription.status;
            
            // Update subscription status
            subscription.status = 'canceled';
            subscription.canceledAt = new Date();

            await subscription.save();

            // Log the subscription change
            await SubscriptionLog.create({
                userId: subscription.userId,
                subscriptionId: subscription._id,
                action: 'deleted',
                oldStatus: oldStatus,
                newStatus: 'canceled',
                metadata: {
                    canceledAt: new Date(),
                }
            });

            console.log('Subscription deleted successfully:', subscription._id);
        } catch (error) {
            console.error('Error handling subscription deleted:', error);
        }
    }

    // Handle payment succeeded webhook
    private async handlePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
        try {
            if (invoice.subscription) {
                // Find the subscription by Stripe subscription ID
                const subscription = await Subscription.findOne({ 
                    stripeSubscriptionId: invoice.subscription 
                });
                
                if (subscription) {
                    // Log the payment
                    await SubscriptionLog.create({
                        userId: subscription.userId,
                        subscriptionId: subscription._id,
                        action: 'payment_succeeded',
                        oldStatus: null,
                        newStatus: null,
                        metadata: {
                            invoiceId: invoice.id,
                            amount: invoice.amount_paid,
                            currency: invoice.currency,
                        }
                    });
                }
            }

            console.log('Payment succeeded for invoice:', invoice.id);
        } catch (error) {
            console.error('Error handling payment succeeded:', error);
        }
    }

    // Handle payment failed webhook
    private async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
        try {
            if (invoice.subscription) {
                // Find the subscription by Stripe subscription ID
                const subscription = await Subscription.findOne({ 
                    stripeSubscriptionId: invoice.subscription 
                });
                
                if (subscription) {
                    // Log the failed payment
                    await SubscriptionLog.create({
                        userId: subscription.userId,
                        subscriptionId: subscription._id,
                        action: 'payment_failed',
                        oldStatus: null,
                        newStatus: null,
                        metadata: {
                            invoiceId: invoice.id,
                            amount: invoice.amount_due,
                            currency: invoice.currency,
                            failureReason: invoice.status_transitions?.finalized_at ? 'finalized' : 'unknown',
                        }
                    });
                }
            }

            console.log('Payment failed for invoice:', invoice.id);
        } catch (error) {
            console.error('Error handling payment failed:', error);
        }
    }

    // Handle trial ending soon (send notification)
    private async handleTrialWillEnd(stripeSubscription: Stripe.Subscription): Promise<void> {
        try {
            const subscription = await Subscription.findOne({ 
                stripeSubscriptionId: stripeSubscription.id 
            });
            
            if (subscription) {
                // Create notification for trial ending
                await SubscriptionLog.create({
                    userId: subscription.userId,
                    subscriptionId: subscription._id,
                    action: 'trial_will_end',
                    oldStatus: null,
                    newStatus: null,
                    metadata: {
                        trialEnd: stripeSubscription.trial_end ? new Date(stripeSubscription.trial_end * 1000) : null,
                        daysLeft: stripeSubscription.trial_end ? Math.ceil((stripeSubscription.trial_end * 1000 - Date.now()) / (1000 * 60 * 60 * 24)) : 0,
                    }
                });
            }

            console.log('Trial ending notification created for subscription:', stripeSubscription.id);
        } catch (error) {
            console.error('Error handling trial will end:', error);
        }
    }

    // Handle upcoming invoice (7 days before charge)
    private async handleUpcomingInvoice(invoice: Stripe.Invoice): Promise<void> {
        try {
            if (invoice.subscription) {
                const subscription = await Subscription.findOne({ 
                    stripeSubscriptionId: invoice.subscription 
                });
                
                if (subscription) {
                    // Log upcoming invoice
                    await SubscriptionLog.create({
                        userId: subscription.userId,
                        subscriptionId: subscription._id,
                        action: 'upcoming_invoice',
                        oldStatus: null,
                        newStatus: null,
                        metadata: {
                            invoiceId: invoice.id,
                            amount: invoice.amount_due,
                            currency: invoice.currency,
                            dueDate: invoice.due_date ? new Date(invoice.due_date * 1000) : null,
                        }
                    });
                }
            }

            console.log('Upcoming invoice notification created for invoice:', invoice.id);
        } catch (error) {
            console.error('Error handling upcoming invoice:', error);
        }
    }

    // Handle customer created
    private async handleCustomerCreated(customer: Stripe.Customer): Promise<void> {
        try {
            // Find user by email and update with Stripe customer ID if not already set
            if (customer.email) {
                const user = await User.findOne({ 
                    email: customer.email,
                    stripeCustomerId: { $exists: false }
                });
                
                if (user) {
                    user.stripeCustomerId = customer.id;
                    await user.save();
                    console.log('Updated user with Stripe customer ID:', customer.id);
                }
            }
        } catch (error) {
            console.error('Error handling customer created:', error);
        }
    }

    // Handle payment method attached
    private async handlePaymentMethodAttached(paymentMethod: Stripe.PaymentMethod): Promise<void> {
        try {
            // Find user by customer ID
            const user = await User.findOne({ stripeCustomerId: paymentMethod.customer });
            if (!user) return;

            // Check if payment method already exists in our database
            const existingPM = await PaymentMethod.findOne({ 
                stripePaymentMethodId: paymentMethod.id 
            });
            
            if (!existingPM) {
                // Create payment method record
                const dbPaymentMethod = new PaymentMethod({
                    userId: user._id,
                    stripePaymentMethodId: paymentMethod.id,
                    type: paymentMethod.type,
                    card: paymentMethod.card ? {
                        brand: paymentMethod.card.brand,
                        last4: paymentMethod.card.last4,
                        expMonth: paymentMethod.card.exp_month,
                        expYear: paymentMethod.card.exp_year,
                    } : undefined,
                    isDefault: false,
                });
                
                await dbPaymentMethod.save();
                console.log('Payment method created from webhook:', paymentMethod.id);
            }
        } catch (error) {
            console.error('Error handling payment method attached:', error);
        }
    }

    // Handle setup intent succeeded
    private async handleSetupIntentSucceeded(setupIntent: Stripe.SetupIntent): Promise<void> {
        try {
            console.log('Setup intent succeeded:', setupIntent.id);
            // Additional logic if needed for setup intent completion
        } catch (error) {
            console.error('Error handling setup intent succeeded:', error);
        }
    }

    // Create a payment method
    async createPaymentMethod(
        customerId: string,
        paymentMethodId: string
    ): Promise<Stripe.PaymentMethod> {
        const paymentMethod = await this.getStripe().paymentMethods.attach(paymentMethodId, {
            customer: customerId,
        });
        return paymentMethod;
    }

    // Get customer's payment methods
    async getCustomerPaymentMethods(customerId: string): Promise<Stripe.PaymentMethod[]> {
        const paymentMethods = await this.getStripe().paymentMethods.list({
            customer: customerId,
            type: 'card',
        });
        return paymentMethods.data;
    }

    // Delete a payment method
    async deletePaymentMethod(paymentMethodId: string): Promise<Stripe.PaymentMethod> {
        const paymentMethod = await this.getStripe().paymentMethods.detach(paymentMethodId);
        return paymentMethod;
    }

    // Update default payment method
    async updateDefaultPaymentMethod(
        customerId: string,
        paymentMethodId: string
    ): Promise<Stripe.Customer> {
        const customer = await this.getStripe().customers.update(customerId, {
            invoice_settings: {
                default_payment_method: paymentMethodId,
            },
        });
        return customer;
    }

    // Get upcoming invoice
    async getUpcomingInvoice(customerId: string): Promise<Stripe.UpcomingInvoice> {
        const invoice = await this.getStripe().invoices.retrieveUpcoming({
            customer: customerId,
        });
        return invoice;
    }

    // Get customer's invoices
    async getCustomerInvoices(customerId: string): Promise<Stripe.Invoice[]> {
        const invoices = await this.getStripe().invoices.list({
            customer: customerId,
            limit: 10,
        });
        return invoices.data;
    }

    // Create a setup intent for saving payment method
    async createSetupIntent(customerId: string): Promise<Stripe.SetupIntent> {
        const setupIntent = await this.getStripe().setupIntents.create({
            customer: customerId,
            payment_method_types: ['card'],
        });
        return setupIntent;
    }

    // Get subscription with expanded data
    async getSubscriptionWithDetails(subscriptionId: string): Promise<Stripe.Subscription> {
        const subscription = await this.getStripe().subscriptions.retrieve(subscriptionId, {
            expand: ['latest_invoice', 'customer', 'items.data.price'],
        });
        return subscription;
    }

    // Update subscription (change plan)
    async updateSubscription(
        subscriptionId: string,
        newPriceId: string
    ): Promise<Stripe.Subscription> {
        const subscription = await this.getStripe().subscriptions.retrieve(subscriptionId);
        
        const firstItem = subscription.items.data[0];
        if (!firstItem?.id) {
            throw new Error('No subscription item found');
        }
        
        const updatedSubscription = await this.getStripe().subscriptions.update(subscriptionId, {
            items: [{
                id: firstItem.id,
                price: newPriceId,
            }],
            proration_behavior: 'create_prorations',
        });

        return updatedSubscription;
    }

    // Get Stripe instance for advanced operations
    getStripeInstance(): Stripe {
        return this.getStripe();
    }
}

export default new StripeService(); 