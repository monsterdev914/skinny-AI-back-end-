import mongoose, { Schema } from 'mongoose';
import { IPlan } from '../types';

export interface PlanDocument extends IPlan { }

interface PlanModel extends mongoose.Model<PlanDocument> {
    findActive(): Promise<PlanDocument[]>;
    findByStripeProductId(stripeProductId: string): Promise<PlanDocument | null>;
}

const featureSchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    included: {
        type: Boolean,
        required: true,
        default: false
    },
    limit: {
        type: Number,
        default: null // null for unlimited
    }
});

const planSchema = new Schema<PlanDocument>({
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    description: {
        type: String,
        trim: true,
        maxlength: 500
    },
    price: {
        type: Number,
        min: 0,
        default: 0
    },
    stripeProductId: {
        type: String,
        trim: true
    },
    stripePriceId: {
        type: String,
        trim: true
    },
    features: [featureSchema],
    isActive: {
        type: Boolean,
        default: true
    },
    trialPeriodDays: {
        type: Number,
        default: 0,
        min: 0
    }
}, {
    timestamps: true
});

// Indexes for better query performance
planSchema.index({ isActive: 1 });
planSchema.index({ stripeProductId: 1 });

// Virtual for formatted monthly price
planSchema.virtual('formattedMonthlyPrice').get(function () {
    return (this as any).priceMonthly ? `$${((this as any).priceMonthly / 100).toFixed(2)}` : 'Free';
});

// Virtual for formatted yearly price
planSchema.virtual('formattedYearlyPrice').get(function () {
    return (this as any).priceYearly ? `$${((this as any).priceYearly / 100).toFixed(2)}` : 'Free';
});

// Method to check if plan has a specific feature
(planSchema.methods as any).hasFeature = function (featureName: string): boolean {
    const feature = (this as any).features.find((f: any) => f.name === featureName);
    return feature ? feature.included : false;
};

// Method to get feature limit
(planSchema.methods as any).getFeatureLimit = function (featureName: string): number | null {
    const feature = (this as any).features.find((f: any) => f.name === featureName);
    return feature ? feature.limit || null : null;
};

// Static method to find all active plans
(planSchema.statics as any).findActive = function () {
    return this.find({ isActive: true }).sort({ priceMonthly: 1 });
};

// Static method to find plan by Stripe product ID
(planSchema.statics as any).findByStripeProductId = function (stripeProductId: string) {
    return this.findOne({ stripeProductId });
};

export const Plan = mongoose.model<PlanDocument, PlanModel>('Plan', planSchema); 