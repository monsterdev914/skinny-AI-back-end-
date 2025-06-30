import mongoose, { Schema, Document } from 'mongoose';

export interface IUserSettings extends Document {
    userId: mongoose.Types.ObjectId;
    
    // Account preferences
    language: string;
    timezone: string;
    
    // Notification preferences  
    notifications: {
        analysisComplete: boolean;
        treatmentReminders: boolean;
        weeklyReports: boolean;
        marketingEmails: boolean;
        pushNotifications: boolean;
        emailNotifications: boolean;
    };
    
    // Privacy & security settings
    privacy: {
        profileVisibility: 'public' | 'private' | 'friends';
        dataSharing: boolean;
        analyticsTracking: boolean;
        marketingCommunications: boolean;
    };
    
    // Display preferences
    theme: 'light' | 'dark' | 'auto';
    currency: string;
    dateFormat: string;
    
    // Analysis preferences
    analysisDefaults: {
        skinType?: 'oily' | 'dry' | 'combination' | 'sensitive' | 'normal';
        includeAdvancedAnalysis: boolean;
        autoSaveResults: boolean;
    };
    
    createdAt: Date;
    updatedAt: Date;
}

const userSettingsSchema = new Schema<IUserSettings>({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    
    // Account preferences
    language: {
        type: String,
        enum: ['en', 'es', 'fr', 'de', 'zh', 'ja'],
        default: 'en'
    },
    timezone: {
        type: String,
        default: 'utc'
    },
    
    // Notification preferences
    notifications: {
        analysisComplete: { type: Boolean, default: true },
        treatmentReminders: { type: Boolean, default: true },
        weeklyReports: { type: Boolean, default: false },
        marketingEmails: { type: Boolean, default: false },
        pushNotifications: { type: Boolean, default: true },
        emailNotifications: { type: Boolean, default: true }
    },
    
    // Privacy & security settings
    privacy: {
        profileVisibility: {
            type: String,
            enum: ['public', 'private', 'friends'],
            default: 'private'
        },
        dataSharing: { type: Boolean, default: false },
        analyticsTracking: { type: Boolean, default: true },
        marketingCommunications: { type: Boolean, default: false }
    },
    
    // Display preferences
    theme: {
        type: String,
        enum: ['light', 'dark', 'auto'],
        default: 'light'
    },
    currency: {
        type: String,
        default: 'USD'
    },
    dateFormat: {
        type: String,
        enum: ['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'],
        default: 'MM/DD/YYYY'
    },
    
    // Analysis preferences
    analysisDefaults: {
        skinType: {
            type: String,
            enum: ['oily', 'dry', 'combination', 'sensitive', 'normal'],
            required: false
        },
        includeAdvancedAnalysis: { type: Boolean, default: true },
        autoSaveResults: { type: Boolean, default: true }
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes for better query performance
userSettingsSchema.index({ userId: 1 });

export const UserSettings = mongoose.model<IUserSettings>('UserSettings', userSettingsSchema); 