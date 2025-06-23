import mongoose, { Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { IUser } from '../types';

export interface UserDocument extends IUser {
    comparePassword(candidatePassword: string): Promise<boolean>;
    generateVerificationToken(): string;
    generatePasswordResetToken(): string;
}

interface UserModel extends mongoose.Model<UserDocument> {
    findByEmail(email: string): Promise<UserDocument | null>;
    findByVerificationToken(token: string): Promise<UserDocument | null>;
    findByResetPasswordToken(token: string): Promise<UserDocument | null>;
}

const userSchema = new Schema<UserDocument>({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    passwordHash: {
        type: String,
        required: true
    },
    avatar: {
        type: String,
        default: null
    },
    avatarPath: {
        type: String,
        default: null
    },
    firstName: {
        type: String,
        trim: true,
        maxlength: 50
    },
    lastName: {
        type: String,
        trim: true,
        maxlength: 50
    },
    birth: {
        type: Date
    },
    phoneNumber: {
        type: String,
        trim: true
    },
    role: {
        type: String,
        enum: ['admin', 'user'],
        default: 'user'
    },
    emailVerified: {
        type: Boolean,
        default: false
    },
    verificationToken: {
        type: String
    },
    resetPasswordToken: {
        type: String
    },
    resetPasswordExpires: {
        type: Date
    },
    lastLogin: {
        type: Date
    },
    stripeCustomerId: {
        type: String
    },
    billing: {
        address: {
            line1: String,
            line2: String,
            city: String,
            state: String,
            postalCode: String,
            country: String
        }
    }
}, {
    timestamps: true,
    toJSON: {
        transform: function (_doc, ret) {
            delete (ret as any).passwordHash;
            delete (ret as any).verificationToken;
            delete (ret as any).resetPasswordToken;
            delete (ret as any).resetPasswordExpires;
            return ret;
        }
    }
});

// Index for better query performance
userSchema.index({ email: 1 });
userSchema.index({ stripeCustomerId: 1 });

// Pre-save middleware to hash password
userSchema.pre('save', async function (next) {
    if (!this.isModified('passwordHash')) return next();

    try {
        const salt = await bcrypt.genSalt(parseInt((process.env as any).BCRYPT_ROUNDS || '12'));
        (this as any).passwordHash = await bcrypt.hash((this as any).passwordHash, salt);
        next();
    } catch (error) {
        next(error as Error);
    }
});

// Method to compare password
(userSchema.methods as any).comparePassword = async function (candidatePassword: string): Promise<boolean> {
    return bcrypt.compare(candidatePassword, (this as any).passwordHash);
};

// Method to generate verification token
(userSchema.methods as any).generateVerificationToken = function (): string {
    const token = crypto.randomBytes(32).toString('hex');
    (this as any).verificationToken = token;
    return token;
};

// Method to generate password reset token
(userSchema.methods as any).generatePasswordResetToken = function (): string {
    const token = crypto.randomBytes(32).toString('hex');
    (this as any).resetPasswordToken = token;
    (this as any).resetPasswordExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    return token;
};

// Static method to find user by email
(userSchema.statics as any).findByEmail = function (email: string) {
    return this.findOne({ email: email.toLowerCase() });
};

// Static method to find user by verification token
(userSchema.statics as any).findByVerificationToken = function (token: string) {
    return this.findOne({ verificationToken: token });
};

// Static method to find user by reset password token
(userSchema.statics as any).findByResetPasswordToken = function (token: string) {
    return this.findOne({
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: Date.now() }
    });
};

export const User = mongoose.model<UserDocument, UserModel>('User', userSchema); 