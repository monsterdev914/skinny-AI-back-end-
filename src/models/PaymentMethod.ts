import mongoose, { Schema, Document } from 'mongoose';
import { IPaymentMethod } from '../types';

export interface PaymentMethodDocument extends IPaymentMethod, Document { }

const addressSchema = new Schema({
    line1: String,
    line2: String,
    city: String,
    state: String,
    postalCode: String,
    country: String
});

const cardSchema = new Schema({
    brand: String,
    last4: String,
    expMonth: Number,
    expYear: Number,
    country: String
});

const billingDetailsSchema = new Schema({
    name: String,
    email: String,
    address: addressSchema
});

const paymentMethodSchema = new Schema<PaymentMethodDocument>({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    stripePaymentMethodId: {
        type: String,
        trim: true
    },
    type: {
        type: String,
        enum: ['card', 'bank_account', 'sepa_debit'],
        required: true
    },
    card: cardSchema,
    billingDetails: billingDetailsSchema,
    isDefault: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Indexes for better query performance
paymentMethodSchema.index({ userId: 1 });
paymentMethodSchema.index({ stripePaymentMethodId: 1 });
paymentMethodSchema.index({ userId: 1, isDefault: 1 });

// Pre-save middleware to ensure only one default payment method per user
paymentMethodSchema.pre('save', async function (next) {
    if (this.isDefault) {
        await this.constructor.updateMany(
            { userId: this.userId, _id: { $ne: this._id } },
            { isDefault: false }
        );
    }
    next();
});

// Virtual for masked card number
paymentMethodSchema.virtual('maskedCardNumber').get(function () {
    if (this.card && this.card.last4) {
        return `**** **** **** ${this.card.last4}`;
    }
    return null;
});

// Virtual for formatted expiration date
paymentMethodSchema.virtual('formattedExpiration').get(function () {
    if (this.card && this.card.expMonth && this.card.expYear) {
        return `${this.card.expMonth.toString().padStart(2, '0')}/${this.card.expYear}`;
    }
    return null;
});

// Method to check if payment method is expired
paymentMethodSchema.methods.isExpired = function (): boolean {
    if (!this.card || !this.card.expMonth || !this.card.expYear) {
        return false;
    }

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // getMonth() returns 0-11

    if (this.card.expYear < currentYear) return true;
    if (this.card.expYear === currentYear && this.card.expMonth < currentMonth) return true;

    return false;
};

// Static method to find default payment method for user
paymentMethodSchema.statics.findDefaultByUserId = function (userId: string) {
    return this.findOne({ userId, isDefault: true });
};

// Static method to find all payment methods for user
paymentMethodSchema.statics.findByUserId = function (userId: string) {
    return this.find({ userId }).sort({ isDefault: -1, createdAt: -1 });
};

// Static method to find payment method by Stripe ID
paymentMethodSchema.statics.findByStripeId = function (stripePaymentMethodId: string) {
    return this.findOne({ stripePaymentMethodId });
};

export const PaymentMethod = mongoose.model<PaymentMethodDocument>('PaymentMethod', paymentMethodSchema); 