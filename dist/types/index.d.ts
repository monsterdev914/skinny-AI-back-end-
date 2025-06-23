import { Request } from 'express';
import { Document, Types } from 'mongoose';
export interface BaseDocument extends Document {
    _id: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
export interface IUser extends BaseDocument {
    email: string;
    passwordHash: string;
    avatar?: string;
    firstName?: string;
    lastName?: string;
    birth?: Date;
    phoneNumber?: string;
    role: 'admin' | 'user';
    emailVerified: boolean;
    verificationToken?: string | undefined;
    resetPasswordToken?: string | undefined;
    resetPasswordExpires?: Date | undefined;
    lastLogin?: Date;
    stripeCustomerId?: string;
    billing?: {
        address: {
            line1?: string;
            line2?: string;
            city?: string;
            state?: string;
            postalCode?: string;
            country?: string;
        };
    };
}
export interface IPlan extends BaseDocument {
    name: string;
    description?: string;
    priceMonthly?: number;
    priceYearly?: number;
    stripeProductId?: string;
    stripeMonthlyPriceId?: string;
    stripeYearlyPriceId?: string;
    features: Array<{
        name: string;
        included: boolean;
        limit?: number;
    }>;
    isActive: boolean;
    trialPeriodDays: number;
}
export interface ISubscription extends BaseDocument {
    userId: Types.ObjectId;
    planId: Types.ObjectId;
    stripeSubscriptionId?: string;
    status: 'active' | 'past_due' | 'unpaid' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'trialing';
    currentPeriodStart?: Date;
    currentPeriodEnd?: Date;
    cancelAtPeriodEnd: boolean;
    canceledAt?: Date;
    startedAt?: Date;
    trialStart?: Date;
    trialEnd?: Date;
    billingCycle: 'monthly' | 'yearly';
    paymentMethodId?: Types.ObjectId;
}
export interface IPaymentMethod extends BaseDocument {
    userId: Types.ObjectId;
    stripePaymentMethodId?: string;
    type: 'card' | 'bank_account' | 'sepa_debit';
    card?: {
        brand?: string;
        last4?: string;
        expMonth?: number;
        expYear?: number;
        country?: string;
    };
    billingDetails?: {
        name?: string;
        email?: string;
        address?: {
            line1?: string;
            line2?: string;
            city?: string;
            state?: string;
            postalCode?: string;
            country?: string;
        };
    };
    isDefault: boolean;
}
export interface IInvoice extends BaseDocument {
    userId: Types.ObjectId;
    subscriptionId?: Types.ObjectId;
    stripeInvoiceId?: string;
    number?: string;
    amountDue: number;
    amountPaid: number;
    tax: number;
    total: number;
    currency: string;
    status: 'draft' | 'open' | 'paid' | 'uncollectible' | 'void';
    hostedInvoiceUrl?: string;
    invoicePdf?: string;
    periodStart?: Date;
    periodEnd?: Date;
    dueDate?: Date;
    paid: boolean;
    paymentIntentId?: string;
}
export interface JWTPayload {
    userId: string;
    email: string;
    role: string;
    iat?: number;
    exp?: number;
}
export interface AuthenticatedRequest extends Request {
    user?: IUser;
}
export interface ApiResponse<T = any> {
    success: boolean;
    message: string;
    data?: T;
    error?: string;
}
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}
export interface LoginRequest {
    email: string;
    password: string;
}
export interface RegisterRequest {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
}
export interface ForgotPasswordRequest {
    email: string;
}
export interface ResetPasswordRequest {
    token: string;
    password: string;
}
export interface VerifyEmailRequest {
    token: string;
}
export interface StripeWebhookEvent {
    id: string;
    object: string;
    api_version: string;
    created: number;
    data: {
        object: any;
    };
    livemode: boolean;
    pending_webhooks: number;
    request: {
        id: string;
        idempotency_key: string | null;
    };
    type: string;
}
export interface AppError extends Error {
    statusCode: number;
    isOperational: boolean;
}
export interface ValidationError {
    field: string;
    message: string;
}
export * from './ai';
//# sourceMappingURL=index.d.ts.map