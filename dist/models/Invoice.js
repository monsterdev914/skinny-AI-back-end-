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
exports.Invoice = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const invoiceSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    subscriptionId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Subscription'
    },
    stripeInvoiceId: {
        type: String,
        trim: true
    },
    number: {
        type: String,
        trim: true
    },
    amountDue: {
        type: Number,
        required: true,
        min: 0
    },
    amountPaid: {
        type: Number,
        required: true,
        min: 0,
        default: 0
    },
    tax: {
        type: Number,
        required: true,
        min: 0,
        default: 0
    },
    total: {
        type: Number,
        required: true,
        min: 0
    },
    currency: {
        type: String,
        default: 'usd',
        lowercase: true
    },
    status: {
        type: String,
        enum: ['draft', 'open', 'paid', 'uncollectible', 'void'],
        required: true,
        default: 'draft'
    },
    hostedInvoiceUrl: {
        type: String
    },
    invoicePdf: {
        type: String
    },
    periodStart: {
        type: Date
    },
    periodEnd: {
        type: Date
    },
    dueDate: {
        type: Date
    },
    paid: {
        type: Boolean,
        default: false
    },
    paymentIntentId: {
        type: String,
        trim: true
    }
}, {
    timestamps: true
});
invoiceSchema.index({ userId: 1 });
invoiceSchema.index({ stripeInvoiceId: 1 });
invoiceSchema.index({ status: 1 });
invoiceSchema.index({ dueDate: 1 });
invoiceSchema.index({ createdAt: -1 });
invoiceSchema.virtual('formattedAmountDue').get(function () {
    return `$${(this.amountDue / 100).toFixed(2)}`;
});
invoiceSchema.virtual('formattedAmountPaid').get(function () {
    return `$${(this.amountPaid / 100).toFixed(2)}`;
});
invoiceSchema.virtual('formattedTotal').get(function () {
    return `$${(this.total / 100).toFixed(2)}`;
});
invoiceSchema.virtual('formattedTax').get(function () {
    return `$${(this.tax / 100).toFixed(2)}`;
});
invoiceSchema.virtual('isOverdue').get(function () {
    if (!this.dueDate || this.paid || this.status === 'paid')
        return false;
    return new Date() > this.dueDate;
});
invoiceSchema.virtual('daysUntilDue').get(function () {
    if (!this.dueDate)
        return null;
    const now = new Date();
    const diffTime = this.dueDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
});
invoiceSchema.methods.isPaid = function () {
    return this.paid || this.status === 'paid';
};
invoiceSchema.methods.isOverdue = function () {
    if (this.isPaid())
        return false;
    if (!this.dueDate)
        return false;
    return new Date() > this.dueDate;
};
invoiceSchema.methods.getOutstandingAmount = function () {
    return this.amountDue - this.amountPaid;
};
invoiceSchema.statics.findByUserId = function (userId, options = {}) {
    const query = this.find({ userId });
    if (options.status) {
        query.where('status', options.status);
    }
    if (options.paid !== undefined) {
        query.where('paid', options.paid);
    }
    return query.sort({ createdAt: -1 });
};
invoiceSchema.statics.findUnpaid = function () {
    return this.find({
        $or: [
            { paid: false },
            { status: { $nin: ['paid', 'void'] } }
        ]
    }).populate('userId');
};
invoiceSchema.statics.findOverdue = function () {
    const now = new Date();
    return this.find({
        dueDate: { $lt: now },
        paid: false,
        status: { $nin: ['paid', 'void'] }
    }).populate('userId');
};
invoiceSchema.statics.findByStripeId = function (stripeInvoiceId) {
    return this.findOne({ stripeInvoiceId }).populate('userId subscriptionId');
};
exports.Invoice = mongoose_1.default.model('Invoice', invoiceSchema);
//# sourceMappingURL=Invoice.js.map