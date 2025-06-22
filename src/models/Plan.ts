import mongoose, { Schema, Document } from 'mongoose';
import { IPlan } from '../types';

export interface PlanDocument extends IPlan, Document { }

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
    priceMonthly: {
        type: Number,
        min: 0,
        default: 0
    },
    priceYearly: {
        type: Number,
        min: 0,
        default: 0
    },
    stripeProductId: {
        type: String,
        trim: true
    },
    stripeMonthlyPriceId: {
        type: String,
        trim: true
    },
    stripeYearlyPriceId: {
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
    return this.priceMonthly ? `$${(this.priceMonthly / 100).toFixed(2)}` : 'Free';
});

// Virtual for formatted yearly price
planSchema.virtual('formattedYearlyPrice').get(function () {
    return this.priceYearly ? `$${(this.priceYearly / 100).toFixed(2)}` : 'Free';
});

// Method to check if plan has a specific feature
planSchema.methods.hasFeature = function (featureName: string): boolean {
    const feature = this.features.find((f: any) => f.name === featureName);
    return feature ? feature.included : false;
};

// Method to get feature limit
planSchema.methods.getFeatureLimit = function (featureName: string): number | null {
    const feature = this.features.find((f: any) => f.name === featureName);
    return feature ? feature.limit : null;
};

// Static method to find active plans
planSchema.statics.findActive = function () {
    return this.find({ isActive: true }).sort({ priceMonthly: 1 });
};

// Static method to find plan by Stripe product ID
planSchema.statics.findByStripeProductId = function (stripeProductId: string) {
    return this.findOne({ stripeProductId });
};

export const Plan = mongoose.model<PlanDocument>('Plan', planSchema); 