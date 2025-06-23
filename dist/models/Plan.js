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
exports.Plan = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const featureSchema = new mongoose_1.Schema({
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
        default: null
    }
});
const planSchema = new mongoose_1.Schema({
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
planSchema.index({ isActive: 1 });
planSchema.index({ stripeProductId: 1 });
planSchema.virtual('formattedMonthlyPrice').get(function () {
    return this.priceMonthly ? `$${(this.priceMonthly / 100).toFixed(2)}` : 'Free';
});
planSchema.virtual('formattedYearlyPrice').get(function () {
    return this.priceYearly ? `$${(this.priceYearly / 100).toFixed(2)}` : 'Free';
});
planSchema.methods.hasFeature = function (featureName) {
    const feature = this.features.find((f) => f.name === featureName);
    return feature ? feature.included : false;
};
planSchema.methods.getFeatureLimit = function (featureName) {
    const feature = this.features.find((f) => f.name === featureName);
    return feature ? feature.limit || null : null;
};
planSchema.statics.findActive = function () {
    return this.find({ isActive: true }).sort({ priceMonthly: 1 });
};
planSchema.statics.findByStripeProductId = function (stripeProductId) {
    return this.findOne({ stripeProductId });
};
exports.Plan = mongoose_1.default.model('Plan', planSchema);
//# sourceMappingURL=Plan.js.map