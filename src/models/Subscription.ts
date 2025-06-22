import mongoose, { Schema, Document } from 'mongoose';
import { ISubscription } from '../types';

export interface SubscriptionDocument extends ISubscription, Document { }

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
        enum: ['monthly', 'yearly'],
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

// Method to check if subscription will expire soon (within 7 days)
subscriptionSchema.methods.willExpireSoon = function (): boolean {
    if (!this.currentPeriodEnd) return false;
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    return this.currentPeriodEnd <= sevenDaysFromNow;
};

// Method to get days until expiration
subscriptionSchema.methods.getDaysUntilExpiration = function (): number | null {
    if (!this.currentPeriodEnd) return null;
    const now = new Date();
    const diffTime = this.currentPeriodEnd.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
};

// Static method to find active subscriptions for a user
subscriptionSchema.statics.findActiveByUserId = function (userId: string) {
    return this.findOne({
        userId,
        status: { $in: ['active', 'trialing'] }
    }).populate('planId');
};

// Static method to find subscription by Stripe ID
subscriptionSchema.statics.findByStripeId = function (stripeSubscriptionId: string) {
    return this.findOne({ stripeSubscriptionId }).populate('planId');
};

// Static method to find subscriptions that will expire soon
subscriptionSchema.statics.findExpiringSoon = function (days: number = 7) {
    const date = new Date();
    date.setDate(date.getDate() + days);

    return this.find({
        status: { $in: ['active', 'trialing'] },
        currentPeriodEnd: { $lte: date }
    }).populate('userId planId');
};

export const Subscription = mongoose.model<SubscriptionDocument>('Subscription', subscriptionSchema); 