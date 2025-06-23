import mongoose, { Schema } from 'mongoose';
import { IInvoice } from '../types';

export interface InvoiceDocument extends IInvoice { }

const invoiceSchema = new Schema<InvoiceDocument>({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    subscriptionId: {
        type: Schema.Types.ObjectId,
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

// Indexes for better query performance
invoiceSchema.index({ userId: 1 });
invoiceSchema.index({ stripeInvoiceId: 1 });
invoiceSchema.index({ status: 1 });
invoiceSchema.index({ dueDate: 1 });
invoiceSchema.index({ createdAt: -1 });

// Virtual for formatted amount due
invoiceSchema.virtual('formattedAmountDue').get(function () {
    return `$${(this.amountDue / 100).toFixed(2)}`;
});

// Virtual for formatted amount paid
invoiceSchema.virtual('formattedAmountPaid').get(function () {
    return `$${(this.amountPaid / 100).toFixed(2)}`;
});

// Virtual for formatted total
invoiceSchema.virtual('formattedTotal').get(function () {
    return `$${(this.total / 100).toFixed(2)}`;
});

// Virtual for formatted tax
invoiceSchema.virtual('formattedTax').get(function () {
    return `$${(this.tax / 100).toFixed(2)}`;
});

// Virtual for checking if invoice is overdue
invoiceSchema.virtual('isOverdue').get(function () {
    if (!this.dueDate || this.paid || this.status === 'paid') return false;
    return new Date() > this.dueDate;
});

// Virtual for days until due
invoiceSchema.virtual('daysUntilDue').get(function () {
    if (!this.dueDate) return null;
    const now = new Date();
    const diffTime = this.dueDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
});

// Method to check if invoice is paid
(invoiceSchema.methods as any).isPaid = function (): boolean {
    return (this as any).paid || (this as any).status === 'paid';
};

// Method to check if invoice is overdue
(invoiceSchema.methods as any).isOverdue = function (): boolean {
    if ((this as any).isPaid()) return false;
    if (!(this as any).dueDate) return false;
    return new Date() > (this as any).dueDate;
};

// Method to get outstanding amount
(invoiceSchema.methods as any).getOutstandingAmount = function (): number {
    return (this as any).amountDue - (this as any).amountPaid;
};

// Static method to find invoices for a user
(invoiceSchema.statics as any).findByUserId = function (userId: string, options: any = {}) {
    const query = this.find({ userId });

    if (options.status) {
        query.where('status', options.status);
    }

    if (options.paid !== undefined) {
        query.where('paid', options.paid);
    }

    return query.sort({ createdAt: -1 });
};

// Static method to find unpaid invoices
(invoiceSchema.statics as any).findUnpaid = function () {
    return this.find({
        $or: [
            { paid: false },
            { status: { $nin: ['paid', 'void'] } }
        ]
    }).populate('userId');
};

// Static method to find overdue invoices
(invoiceSchema.statics as any).findOverdue = function () {
    const now = new Date();
    return this.find({
        dueDate: { $lt: now },
        paid: false,
        status: { $nin: ['paid', 'void'] }
    }).populate('userId');
};

// Static method to find invoice by Stripe ID
(invoiceSchema.statics as any).findByStripeId = function (stripeInvoiceId: string) {
    return this.findOne({ stripeInvoiceId }).populate('userId subscriptionId');
};

export const Invoice = mongoose.model<InvoiceDocument>('Invoice', invoiceSchema); 