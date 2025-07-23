import mongoose, { Schema, Document } from 'mongoose';

export interface ISubscriptionLog extends Document {
    userId: mongoose.Types.ObjectId;
    subscriptionId: mongoose.Types.ObjectId;
    action: 'created' | 'upgraded' | 'downgraded' | 'cancelled' | 'reactivated' | 'payment_succeeded' | 'payment_failed' | 'trial_started' | 'trial_ended';
    details: {
        planId?: string;
        fromPlanId?: string;
        toPlanId?: string;
        billingCycle?: 'monthly' | 'yearly';
        fromBillingCycle?: 'monthly' | 'yearly';
        toBillingCycle?: 'monthly' | 'yearly';
        amount?: number;
        fromAmount?: number;
        toAmount?: number;
        trialDays?: number;
        cancelAtPeriodEnd?: boolean;
        canceledAt?: Date;
        reactivatedAt?: Date;
        paymentIntentId?: string;
        invoiceId?: string;
        errorMessage?: string;
        metadata?: Record<string, any>;
    };
    createdAt: Date;
    updatedAt: Date;
}

const subscriptionLogSchema = new Schema<ISubscriptionLog>({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    subscriptionId: {
        type: Schema.Types.ObjectId,
        ref: 'Subscription',
        required: true,
        index: true
    },
    action: {
        type: String,
        enum: ['created', 'upgraded', 'downgraded', 'cancelled', 'reactivated', 'payment_succeeded', 'payment_failed', 'trial_started', 'trial_ended'],
        required: true,
        index: true
    },
    details: {
        planId: String,
        fromPlanId: String,
        toPlanId: String,
        billingCycle: {
            type: String,
            enum: ['monthly', 'yearly']
        },
        fromBillingCycle: {
            type: String,
            enum: ['monthly', 'yearly']
        },
        toBillingCycle: {
            type: String,
            enum: ['monthly', 'yearly']
        },
        amount: Number,
        fromAmount: Number,
        toAmount: Number,
        trialDays: Number,
        cancelAtPeriodEnd: Boolean,
        canceledAt: Date,
        reactivatedAt: Date,
        paymentIntentId: String,
        invoiceId: String,
        errorMessage: String,
        metadata: Schema.Types.Mixed
    }
}, {
    timestamps: true
});

// Indexes for efficient queries
subscriptionLogSchema.index({ userId: 1, createdAt: -1 });
subscriptionLogSchema.index({ subscriptionId: 1, createdAt: -1 });
subscriptionLogSchema.index({ action: 1, createdAt: -1 });

// Static method to get subscription history for a user
(subscriptionLogSchema.statics as any).getSubscriptionHistory = function(userId: string, limit: number = 50) {
    return this.find({ userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('subscriptionId', 'planId status billingCycle')
        .populate({
            path: 'subscriptionId',
            populate: {
                path: 'planId',
                model: 'Plan',
                select: 'name price'
            }
        });
};

// Static method to get logs for a specific subscription
(subscriptionLogSchema.statics as any).getSubscriptionLogs = function(subscriptionId: string) {
    return this.find({ subscriptionId })
        .sort({ createdAt: -1 })
        .populate('userId', 'email firstName lastName');
};

// Static method to get recent subscription activities
(subscriptionLogSchema.statics as any).getRecentActivities = function(limit: number = 100) {
    return this.find()
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('userId', 'email firstName lastName')
        .populate('subscriptionId', 'planId status billingCycle')
        .populate({
            path: 'subscriptionId',
            populate: {
                path: 'planId',
                model: 'Plan',
                select: 'name price'
            }
        });
};

export const SubscriptionLog = mongoose.model<ISubscriptionLog>('SubscriptionLog', subscriptionLogSchema); 