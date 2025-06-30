import mongoose, { Schema, Document } from 'mongoose';

export interface INotification extends Document {
    userId: mongoose.Types.ObjectId;
    title: string;
    message: string;
    type: 'success' | 'info' | 'warning' | 'error';
    category: 'analysis' | 'treatment' | 'subscription' | 'system' | 'feature';
    isRead: boolean;
    actionUrl?: string;
    metadata?: {
        analysisId?: string;
        subscriptionId?: string;
        [key: string]: any;
    };
    timeAgo: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface INotificationModel extends mongoose.Model<INotification> {
    findByUserId(userId: string, limit?: number): Promise<INotification[]>;
    findUnreadByUserId(userId: string): Promise<INotification[]>;
    markAllAsRead(userId: string): Promise<any>;
    createAnalysisCompleteNotification(userId: string, analysisId: string): Promise<INotification>;
    createTreatmentReminderNotification(userId: string, treatmentType: string): Promise<INotification>;
    createSubscriptionExpiringNotification(userId: string, daysLeft: number): Promise<INotification>;
}

const notificationSchema = new Schema<INotification>({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    message: {
        type: String,
        required: true,
        trim: true,
        maxlength: 500
    },
    type: {
        type: String,
        enum: ['success', 'info', 'warning', 'error'],
        required: true,
        default: 'info'
    },
    category: {
        type: String,
        enum: ['analysis', 'treatment', 'subscription', 'system', 'feature'],
        required: true,
        default: 'system'
    },
    isRead: {
        type: Boolean,
        default: false,
        index: true
    },
    actionUrl: {
        type: String,
        trim: true
    },
    metadata: {
        type: Schema.Types.Mixed,
        default: {}
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes for better query performance
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, isRead: 1 });
notificationSchema.index({ createdAt: 1 }); // For cleanup of old notifications

// Virtual for relative time
notificationSchema.virtual('timeAgo').get(function() {
    const now = new Date();
    const diffMs = now.getTime() - this.createdAt.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 60) {
        return diffMins <= 1 ? 'Just now' : `${diffMins} minutes ago`;
    } else if (diffHours < 24) {
        return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
    } else if (diffDays < 7) {
        return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
    } else {
        return this.createdAt.toLocaleDateString();
    }
});

// Static methods
(notificationSchema.statics as any).findByUserId = function(userId: string, limit: number = 20) {
    return this.find({ userId })
        .sort({ createdAt: -1 })
        .limit(limit);
};

(notificationSchema.statics as any).findUnreadByUserId = function(userId: string) {
    return this.find({ userId, isRead: false })
        .sort({ createdAt: -1 });
};

(notificationSchema.statics as any).markAllAsRead = function(userId: string) {
    return this.updateMany(
        { userId, isRead: false },
        { isRead: true }
    );
};

// Helper method to create common notification types
(notificationSchema.statics as any).createAnalysisCompleteNotification = function(userId: string, analysisId: string) {
    return this.create({
        userId,
        title: 'Analysis Complete',
        message: 'Your skin analysis has been completed successfully.',
        type: 'success',
        category: 'analysis',
        actionUrl: `/dashboard?tab=history&highlight=${analysisId}`,
        metadata: { analysisId }
    });
};

(notificationSchema.statics as any).createTreatmentReminderNotification = function(userId: string, treatmentType: string) {
    return this.create({
        userId,
        title: 'Treatment Reminder',
        message: `Don't forget to apply your recommended ${treatmentType}.`,
        type: 'info',
        category: 'treatment'
    });
};

(notificationSchema.statics as any).createSubscriptionExpiringNotification = function(userId: string, daysLeft: number) {
    return this.create({
        userId,
        title: 'Subscription Expiring',
        message: `Your Premium subscription expires in ${daysLeft} ${daysLeft === 1 ? 'day' : 'days'}.`,
        type: 'warning',
        category: 'subscription',
        actionUrl: '/pricing'
    });
};

export const Notification = mongoose.model<INotification, INotificationModel>('Notification', notificationSchema); 