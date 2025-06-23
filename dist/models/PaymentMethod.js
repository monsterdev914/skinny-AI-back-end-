"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentMethod = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const addressSchema = new mongoose_1.Schema({
    line1: String,
    line2: String,
    city: String,
    state: String,
    postalCode: String,
    country: String
});
const cardSchema = new mongoose_1.Schema({
    brand: String,
    last4: String,
    expMonth: Number,
    expYear: Number,
    country: String
});
const billingDetailsSchema = new mongoose_1.Schema({
    name: String,
    email: String,
    address: addressSchema
});
const paymentMethodSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
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
paymentMethodSchema.index({ userId: 1 });
paymentMethodSchema.index({ stripePaymentMethodId: 1 });
paymentMethodSchema.index({ userId: 1, isDefault: 1 });
paymentMethodSchema.pre('save', async function (next) {
    if (this.isDefault) {
        await this.model('PaymentMethod').updateMany({ userId: this.userId, _id: { $ne: this._id } }, { isDefault: false });
    }
    next();
});
paymentMethodSchema.virtual('maskedCardNumber').get(function () {
    if (this.card && this.card.last4) {
        return `**** **** **** ${this.card.last4}`;
    }
    return null;
});
paymentMethodSchema.virtual('formattedExpiration').get(function () {
    if (this.card && this.card.expMonth && this.card.expYear) {
        return `${this.card.expMonth.toString().padStart(2, '0')}/${this.card.expYear}`;
    }
    return null;
});
paymentMethodSchema.methods.isExpired = function () {
    if (!this.card || !this.card.expMonth || !this.card.expYear) {
        return false;
    }
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    if (this.card.expYear < currentYear)
        return true;
    if (this.card.expYear === currentYear && this.card.expMonth < currentMonth)
        return true;
    return false;
};
paymentMethodSchema.statics.findDefaultByUserId = function (userId) {
    return this.findOne({ userId, isDefault: true });
};
paymentMethodSchema.statics.findByUserId = function (userId) {
    return this.find({ userId }).sort({ isDefault: -1, createdAt: -1 });
};
paymentMethodSchema.statics.findByStripeId = function (stripePaymentMethodId) {
    return this.findOne({ stripePaymentMethodId });
};
exports.PaymentMethod = mongoose_1.default.model('PaymentMethod', paymentMethodSchema);
//# sourceMappingURL=PaymentMethod.js.map