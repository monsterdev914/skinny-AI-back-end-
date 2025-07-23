import mongoose, { Schema } from 'mongoose';
import { ISubscription } from '../types';

export interface SubscriptionDocument extends ISubscription { }

const subscriptionSchema = new Schema<SubscriptionDocument>({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    planId: {
        type: Schema.Types.ObjectId,
        ref: 'Plan',
        required: true
    },
    stripeSubscriptionId: {
        type: String,
        trim: true
    },
    status: {
        type: String,
        enum: ['active', 'past_due', 'unpaid', 'canceled', 'incomplete', 'incomplete_expired', 'trialing'],
        required: true,
        default: 'incomplete'
    },
    currentPeriodStart: {
        type: Date
    },
    currentPeriodEnd: {
        type: Date
    },
    cancelAtPeriodEnd: {
        type: Boolean,
        default: false
    },
    canceledAt: {
        type: Date
    },
    startedAt: {
        type: Date
    },
    trialStart: {
        type: Date
    },
    trialEnd: {
        type: Date
    },
    billingCycle: {
        type: String,
        enum: ['monthly', 'yearly', 'one-time'],
        required: true
    },
    paymentMethodId: {
        type: Schema.Types.ObjectId,
        ref: 'PaymentMethod'
    }
}, {
    timestamps: true
});

// Indexes for better query performance
subscriptionSchema.index({ userId: 1 });
subscriptionSchema.index({ stripeSubscriptionId: 1 });
subscriptionSchema.index({ status: 1 });
subscriptionSchema.index({ currentPeriodEnd: 1 });

// Virtual for checking if subscription is active
subscriptionSchema.virtual('isActive').get(function () {
    return this.status === 'active' || this.status === 'trialing';
});

// Virtual for checking if subscription is in trial
subscriptionSchema.virtual('isTrialing').get(function () {
    return this.status === 'trialing';
});

// Virtual for checking if subscription is canceled
subscriptionSchema.virtual('isCanceled').get(function () {
    return this.status === 'canceled' || this.cancelAtPeriodEnd;
});

// Method to check if subscription will expire soon
(subscriptionSchema.methods as any).willExpireSoon = function (): boolean {
    if (!(this as any).currentPeriodEnd) return false;
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    return (this as any).currentPeriodEnd <= sevenDaysFromNow;
};

// Method to get days until expiration
(subscriptionSchema.methods as any).getDaysUntilExpiration = function (): number | null {
    if (!(this as any).currentPeriodEnd) return null;
    const now = new Date();
    const diffTime = (this as any).currentPeriodEnd.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
};

// Static method to find active subscription by user ID
(subscriptionSchema.statics as any).findActiveByUserId = function (userId: string) {
    return this.findOne({ 
        userId, 
        status: { $in: ['active', 'trialing'] } 
    }).populate('planId');
};

// Static method to find subscription by Stripe ID
(subscriptionSchema.statics as any).findByStripeId = function (stripeSubscriptionId: string) {
    return this.findOne({ stripeSubscriptionId }).populate('userId planId');
};

// Static method to find subscriptions expiring soon
(subscriptionSchema.statics as any).findExpiringSoon = function (days: number = 7) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    return this.find({
        currentPeriodEnd: { $lte: futureDate, $gte: new Date() },
        status: { $in: ['active', 'trialing'] },
        cancelAtPeriodEnd: false
    }).populate('userId planId');
};

export const Subscription = mongoose.model<SubscriptionDocument>('Subscription', subscriptionSchema); 