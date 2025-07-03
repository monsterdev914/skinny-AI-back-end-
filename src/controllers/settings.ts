import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { UserSettings } from '../models/UserSettings';
import { User } from '../models/User';
import AnalysisHistory from '../models/AnalysisHistory';
import { Subscription } from '../models/Subscription';
import { PaymentMethod } from '../models/PaymentMethod';

export class SettingsController {
    // Get user settings
    static async getSettings(req: AuthenticatedRequest, res: Response) {
        try {
            const userId = req.user?.id;
            
            let settings = await UserSettings.findOne({ userId });
            
            // If no settings exist, create default settings
            if (!settings) {
                settings = new UserSettings({ userId });
                await settings.save();
            }
            
            return res.json({
                success: true,
                message: 'Settings retrieved successfully',
                data: settings
            });
        } catch (error) {
            console.error('Get settings error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to retrieve settings'
            });
        }
    }
    
    // Update user settings
    static async updateSettings(req: AuthenticatedRequest, res: Response) {
        try {
            const userId = req.user?.id;
            const updateData = req.body;
            
            // Find existing settings or create new ones
            let settings = await UserSettings.findOne({ userId });
            
            if (!settings) {
                settings = new UserSettings({ userId, ...updateData });
            } else {
                // Merge the update data with existing settings
                Object.assign(settings, updateData);
            }
            
            await settings.save();
            
            return res.json({
                success: true,
                message: 'Settings updated successfully',
                data: settings
            });
        } catch (error) {
            console.error('Update settings error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to update settings'
            });
        }
    }
    
    // Reset settings to default
    static async resetSettings(req: AuthenticatedRequest, res: Response) {
        try {
            const userId = req.user?.id;
            
            // Delete existing settings
            await UserSettings.deleteOne({ userId });
            
            // Create new default settings
            const defaultSettings = new UserSettings({ userId });
            await defaultSettings.save();
            
            return res.json({
                success: true,
                message: 'Settings reset to defaults successfully',
                data: defaultSettings
            });
        } catch (error) {
            console.error('Reset settings error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to reset settings'
            });
        }
    }
    
    // Export user data as CSV
    static async exportData(req: AuthenticatedRequest, res: Response) {
        try {
            const userId = req.user?.id;
            
            // Gather all user data
            const [user, settings, analysisHistory, subscription] = await Promise.all([
                User.findById(userId).select('-passwordHash'),
                UserSettings.findOne({ userId }),
                AnalysisHistory.find({ userId }).sort({ createdAt: -1 }),
                Subscription.findOne({ userId }).populate('planId')
            ]);

            // Helper function to escape CSV values
            const escapeCsvValue = (value: any): string => {
                if (value === null || value === undefined) return '';
                const str = String(value);
                if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                    return `"${str.replace(/"/g, '""')}"`;
                }
                return str;
            };

            // Create CSV content
            let csvContent = '';

            // User Information Section
            csvContent += 'USER INFORMATION\n';
            csvContent += 'Field,Value\n';
            csvContent += `Email,${escapeCsvValue(user?.email)}\n`;
            csvContent += `First Name,${escapeCsvValue(user?.firstName)}\n`;
            csvContent += `Last Name,${escapeCsvValue(user?.lastName)}\n`;
            csvContent += `Phone Number,${escapeCsvValue(user?.phoneNumber)}\n`;
            csvContent += `Birth Date,${escapeCsvValue(user?.birth)}\n`;
            csvContent += `Email Verified,${escapeCsvValue(user?.emailVerified)}\n`;
            csvContent += `Member Since,${escapeCsvValue(user?.createdAt)}\n`;
            csvContent += '\n';

            // Settings Section
            if (settings) {
                csvContent += 'SETTINGS\n';
                csvContent += 'Category,Setting,Value\n';
                csvContent += `Account,Language,${escapeCsvValue(settings.language)}\n`;
                csvContent += `Account,Timezone,${escapeCsvValue(settings.timezone)}\n`;
                csvContent += `Account,Theme,${escapeCsvValue(settings.theme)}\n`;
                csvContent += `Account,Date Format,${escapeCsvValue(settings.dateFormat)}\n`;
                csvContent += `Notifications,Analysis Complete,${escapeCsvValue(settings.notifications.analysisComplete)}\n`;
                csvContent += `Notifications,Treatment Reminders,${escapeCsvValue(settings.notifications.treatmentReminders)}\n`;
                csvContent += `Notifications,Weekly Reports,${escapeCsvValue(settings.notifications.weeklyReports)}\n`;
                csvContent += `Notifications,Marketing Emails,${escapeCsvValue(settings.notifications.marketingEmails)}\n`;
                csvContent += `Privacy,Profile Visibility,${escapeCsvValue(settings.privacy.profileVisibility)}\n`;
                csvContent += `Privacy,Data Sharing,${escapeCsvValue(settings.privacy.dataSharing)}\n`;
                csvContent += `Privacy,Analytics Tracking,${escapeCsvValue(settings.privacy.analyticsTracking)}\n`;
                csvContent += '\n';
            }

            // Analysis History Section
            if (analysisHistory && analysisHistory.length > 0) {
                csvContent += 'ANALYSIS HISTORY\n';
                csvContent += 'Date,Condition,Confidence,Analysis Type,User Age,Skin Type,Notes\n';
                
                analysisHistory.forEach((analysis: any) => {
                    csvContent += `${escapeCsvValue(analysis.createdAt)},`;
                    csvContent += `${escapeCsvValue(analysis.topPrediction?.condition)},`;
                    csvContent += `${escapeCsvValue(analysis.topPrediction?.confidence)},`;
                    csvContent += `${escapeCsvValue(analysis.analysisType)},`;
                    csvContent += `${escapeCsvValue(analysis.userAge)},`;
                    csvContent += `${escapeCsvValue(analysis.skinType)},`;
                    csvContent += `${escapeCsvValue(analysis.notes)}\n`;
                });
                csvContent += '\n';
            }

            // Subscription Section
            if (subscription) {
                csvContent += 'SUBSCRIPTION\n';
                csvContent += 'Field,Value\n';
                csvContent += `Status,${escapeCsvValue(subscription.status)}\n`;
                const planName = subscription.planId && typeof subscription.planId === 'object' 
                    ? (subscription.planId as any).name 
                    : 'N/A';
                csvContent += `Plan,${escapeCsvValue(planName)}\n`;
                csvContent += `Current Period End,${escapeCsvValue(subscription.currentPeriodEnd)}\n`;
                csvContent += `Cancel At Period End,${escapeCsvValue(subscription.cancelAtPeriodEnd)}\n`;
                csvContent += '\n';
            }

            // Export metadata
            csvContent += 'EXPORT INFORMATION\n';
            csvContent += 'Field,Value\n';
            csvContent += `Export Date,${escapeCsvValue(new Date().toISOString())}\n`;
            csvContent += `Export Version,1.0\n`;

            // Set response headers for CSV download
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="skinny-ai-data-export-${new Date().toISOString().split('T')[0]}.csv"`);
            
            return res.send(csvContent);
        } catch (error) {
            console.error('Export data error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to export data'
            });
        }
    }
    
    // Delete user account and all associated data
    static async deleteAccount(req: AuthenticatedRequest, res: Response) {
        try {
            const userId = req.user?.id;
            const { confirmPassword } = req.body;
            
            if (!confirmPassword) {
                return res.status(400).json({
                    success: false,
                    message: 'Password confirmation is required'
                });
            }
            
            // Verify password
            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }
            
            const isPasswordValid = await (user as any).comparePassword(confirmPassword);
            if (!isPasswordValid) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid password'
                });
            }
            
            // Delete all user data
            await Promise.all([
                UserSettings.deleteMany({ userId }),
                AnalysisHistory.deleteMany({ userId }),
                Subscription.deleteMany({ userId }),
                PaymentMethod.deleteMany({ userId }),
                User.findByIdAndDelete(userId)
            ]);
            
            return res.json({
                success: true,
                message: 'Account and all associated data have been permanently deleted'
            });
        } catch (error) {
            console.error('Delete account error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to delete account'
            });
        }
    }
    
    // Get data usage statistics
    static async getDataUsage(req: AuthenticatedRequest, res: Response) {
        try {
            const userId = req.user?.id;
            
            const [analysisCount, totalImageSize, settingsCount] = await Promise.all([
                AnalysisHistory.countDocuments({ userId }),
                AnalysisHistory.aggregate([
                    { $match: { userId } },
                    { $group: { _id: null, totalSize: { $sum: '$imageSize' } } }
                ]),
                UserSettings.countDocuments({ userId })
            ]);
            
            const dataUsage = {
                totalAnalyses: analysisCount,
                totalImageSize: totalImageSize[0]?.totalSize || 0,
                settingsRecords: settingsCount,
                estimatedTotalSize: (totalImageSize[0]?.totalSize || 0) + (analysisCount * 1024), // Rough estimate
                lastUpdated: new Date().toISOString()
            };
            
            return res.json({
                success: true,
                message: 'Data usage retrieved successfully',
                data: dataUsage
            });
        } catch (error) {
            console.error('Get data usage error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to retrieve data usage'
            });
        }
    }
    
    // Update notification preferences specifically
    static async updateNotifications(req: AuthenticatedRequest, res: Response) {
        try {
            const userId = req.user?.id;
            const { notifications } = req.body;
            
            let settings = await UserSettings.findOne({ userId });
            
            if (!settings) {
                settings = new UserSettings({ userId });
            }
            
            settings.notifications = { ...settings.notifications, ...notifications };
            await settings.save();
            
            return res.json({
                success: true,
                message: 'Notification preferences updated successfully',
                data: { notifications: settings.notifications }
            });
        } catch (error) {
            console.error('Update notifications error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to update notification preferences'
            });
        }
    }
    
    // Update privacy preferences specifically
    static async updatePrivacy(req: AuthenticatedRequest, res: Response) {
        try {
            const userId = req.user?.id;
            const { privacy } = req.body;
            
            let settings = await UserSettings.findOne({ userId });
            
            if (!settings) {
                settings = new UserSettings({ userId });
            }
            
            settings.privacy = { ...settings.privacy, ...privacy };
            await settings.save();
            
            return res.json({
                success: true,
                message: 'Privacy preferences updated successfully',
                data: { privacy: settings.privacy }
            });
        } catch (error) {
            console.error('Update privacy error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to update privacy preferences'
            });
        }
    }
} 