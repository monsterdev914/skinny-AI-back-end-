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
exports.Subscription = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const subscriptionSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    planId: {
        type: mongoose_1.Schema.Types.ObjectId,
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
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'PaymentMethod'
    }
}, {
    timestamps: true
});
subscriptionSchema.index({ userId: 1 });
subscriptionSchema.index({ stripeSubscriptionId: 1 });
subscriptionSchema.index({ status: 1 });
subscriptionSchema.index({ currentPeriodEnd: 1 });
subscriptionSchema.virtual('isActive').get(function () {
    return this.status === 'active' || this.status === 'trialing';
});
subscriptionSchema.virtual('isTrialing').get(function () {
    return this.status === 'trialing';
});
subscriptionSchema.virtual('isCanceled').get(function () {
    return this.status === 'canceled' || this.cancelAtPeriodEnd;
});
subscriptionSchema.methods.willExpireSoon = function () {
    if (!this.currentPeriodEnd)
        return false;
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    return this.currentPeriodEnd <= sevenDaysFromNow;
};
subscriptionSchema.methods.getDaysUntilExpiration = function () {
    if (!this.currentPeriodEnd)
        return null;
    const now = new Date();
    const diffTime = this.currentPeriodEnd.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
};
subscriptionSchema.statics.findActiveByUserId = function (userId) {
    return this.findOne({
        userId,
        status: { $in: ['active', 'trialing'] }
    }).populate('planId');
};
subscriptionSchema.statics.findByStripeId = function (stripeSubscriptionId) {
    return this.findOne({ stripeSubscriptionId }).populate('userId planId');
};
subscriptionSchema.statics.findExpiringSoon = function (days = 7) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    return this.find({
        currentPeriodEnd: { $lte: futureDate, $gte: new Date() },
        status: { $in: ['active', 'trialing'] },
        cancelAtPeriodEnd: false
    }).populate('userId planId');
};
exports.Subscription = mongoose_1.default.model('Subscription', subscriptionSchema);
//# sourceMappingURL=Subscription.js.map