import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { getRelativePath, getFileUrl, deleteFile } from '../middleware/fileUpload';
import { User } from '../models/User';
import { Subscription } from '../models/Subscription';
import AnalysisHistory from '../models/AnalysisHistory';
import fs from 'fs';
import path from 'path';

export class UserController {
    static async getProfile(req: AuthenticatedRequest, res: Response) {
        try {
            const userId = req.user?.id;
            
            // Get user data
            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            // Get subscription data
            const subscription = await Subscription.findOne({ userId })
                .populate('planId')
                .sort({ createdAt: -1 });

            // Get analysis usage stats
            const analysisCount = await AnalysisHistory.countDocuments({ userId });
            const thisMonthStart = new Date();
            thisMonthStart.setDate(1);
            thisMonthStart.setHours(0, 0, 0, 0);
            
            const thisMonthAnalyses = await AnalysisHistory.countDocuments({
                userId,
                createdAt: { $gte: thisMonthStart }
            });

            // Remove sensitive fields
            const { passwordHash, verificationToken, resetPasswordToken, resetPasswordExpires, ...userWithoutSensitive } = user.toObject();

            // Build profile response
            // Debug: Check avatar path
            if (user.avatarPath) {
                console.log('User avatar path:', user.avatarPath);
            }
            
            const profileData = {
                user: {
                    ...userWithoutSensitive,
                    avatarUrl: user.avatarPath ? getFileUrl(req, user.avatarPath) : null
                },
                subscription: subscription ? {
                    status: subscription.status,
                    plan: subscription.planId,
                    currentPeriodEnd: subscription.currentPeriodEnd,
                    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd
                } : null,
                usage: {
                    totalAnalyses: analysisCount,
                    thisMonthAnalyses: thisMonthAnalyses,
                    memberSince: user.createdAt
                }
            };

            return res.json({
                success: true,
                message: 'Profile retrieved successfully',
                data: profileData
            });

        } catch (error) {
            console.error('Get profile error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to retrieve profile'
            });
        }
    }

    static async updateProfile(req: AuthenticatedRequest, res: Response) {
        try {
            const userId = req.user?.id;
            const updateData = req.body;

            // Find the user
            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            // Fields that can be updated
            const allowedFields = ['firstName', 'lastName', 'phoneNumber', 'birth'];
            const updates: any = {};

            // Only update allowed fields that are provided
            allowedFields.forEach(field => {
                if (updateData[field] !== undefined) {
                    updates[field] = updateData[field];
                }
            });

            // Special handling for birth date
            if (updates.birth) {
                updates.birth = new Date(updates.birth);
            }

            // Update the user
            Object.assign(user, updates);
            await user.save();

            // Get subscription data (same as getProfile)
            const subscription = await Subscription.findOne({ userId })
                .populate('planId')
                .sort({ createdAt: -1 });

            // Get analysis usage stats (same as getProfile)
            const analysisCount = await AnalysisHistory.countDocuments({ userId });
            const thisMonthStart = new Date();
            thisMonthStart.setDate(1);
            thisMonthStart.setHours(0, 0, 0, 0);
            
            const thisMonthAnalyses = await AnalysisHistory.countDocuments({
                userId,
                createdAt: { $gte: thisMonthStart }
            });

            // Return updated user (without sensitive fields)
            const { passwordHash, verificationToken, resetPasswordToken, resetPasswordExpires, ...userWithoutSensitive } = user.toObject();

            // Build updated profile response (same structure as getProfile)
            const profileData = {
                user: {
                    ...userWithoutSensitive,
                    avatarUrl: user.avatarPath ? getFileUrl(req, user.avatarPath) : null
                },
                subscription: subscription ? {
                    status: subscription.status,
                    plan: subscription.planId,
                    currentPeriodEnd: subscription.currentPeriodEnd,
                    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd
                } : null,
                usage: {
                    totalAnalyses: analysisCount,
                    thisMonthAnalyses: thisMonthAnalyses,
                    memberSince: user.createdAt
                }
            };

            return res.json({
                success: true,
                message: 'Profile updated successfully',
                data: profileData
            });

        } catch (error) {
            console.error('Profile update error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to update profile'
            });
        }
    }

    static async uploadAvatar(req: AuthenticatedRequest, res: Response) {
        try {
            console.log('=== AVATAR UPLOAD START ===');
            console.log('Request received at:', new Date().toISOString());
            
            if (!req.file) {
                console.log('ERROR: No file in request');
                return res.status(400).json({
                    success: false,
                    message: 'Please upload an avatar image'
                });
            }

            console.log('File received:');
            console.log('- Original name:', req.file.originalname);
            console.log('- Mimetype:', req.file.mimetype);
            console.log('- Size:', req.file.size);
            console.log('- Field name:', req.file.fieldname);
            console.log('- File path:', req.file.path);
            console.log('- File exists before processing:', require('fs').existsSync(req.file.path));

            const userId = req.user?.id;
            console.log('User ID:', userId);
            
            const user = await User.findById(userId);

            if (!user) {
                console.log('ERROR: User not found in database');
                // Clean up uploaded file if user not found
                deleteFile(req.file.path);
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            console.log('User found:', user.email);

            // Delete old avatar if exists
            if (user.avatarPath) {
                const oldAvatarPath = path.join(process.cwd(), user.avatarPath);
                console.log('Deleting old avatar:', oldAvatarPath);
                console.log('Old file exists:', require('fs').existsSync(oldAvatarPath));
                deleteFile(oldAvatarPath);
            }

            // Save new avatar path
            const relativePath = getRelativePath(req.file.path);
            console.log('Path processing:');
            console.log('- Original file path:', req.file.path);
            console.log('- Relative path after processing:', relativePath);
            console.log('- File exists after path processing:', require('fs').existsSync(req.file.path));
            console.log('- Working directory:', process.cwd());
            
            // Check if file exists at the expected location
            const expectedPath = path.join(process.cwd(), 'uploads', 'avatars', path.basename(req.file.path));
            console.log('- Expected path:', expectedPath);
            console.log('- File exists at expected path:', require('fs').existsSync(expectedPath));
            
            user.avatarPath = relativePath;
            await user.save();
            console.log('User saved with avatarPath:', user.avatarPath);

            // Generate file URL for response
            const avatarUrl = getFileUrl(req, relativePath);
            console.log('- Generated URL:', avatarUrl);

            // Final file check
            console.log('Final verification:');
            console.log('- Original path exists:', require('fs').existsSync(req.file.path));
            console.log('- Expected path exists:', require('fs').existsSync(expectedPath));
            
            // List all files in avatars directory
            const avatarsDir = path.join(process.cwd(), 'uploads', 'avatars');
            console.log('Files in avatars directory:');
            try {
                const files = require('fs').readdirSync(avatarsDir);
                console.log(files);
            } catch (error) {
                console.log('Error reading avatars directory:', error);
            }

            console.log('=== AVATAR UPLOAD SUCCESS ===');

            return res.json({
                success: true,
                message: 'Avatar uploaded successfully',
                data: {
                    avatarUrl,
                    avatarPath: relativePath
                }
            });

        } catch (error) {
            console.error('=== AVATAR UPLOAD ERROR ===');
            console.error('Error details:', error);
            
            // Clean up uploaded file on error
            if (req.file) {
                console.log('Cleaning up file on error:', req.file.path);
                deleteFile(req.file.path);
            }

            return res.status(500).json({
                success: false,
                message: 'Failed to upload avatar'
            });
        }
    }

    static async deleteAvatar(req: AuthenticatedRequest, res: Response) {
        try {
            const userId = req.user?.id;
            const user = await User.findById(userId);

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            if (!user.avatarPath) {
                return res.status(400).json({
                    success: false,
                    message: 'No avatar to delete'
                });
            }

            // Delete avatar file
            const avatarPath = path.join(process.cwd(), user.avatarPath);
            deleteFile(avatarPath);

            // Remove avatar path from user
            delete user.avatarPath;
            await user.save();

            return res.json({
                success: true,
                message: 'Avatar deleted successfully'
            });

        } catch (error) {
            console.error('Avatar deletion error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to delete avatar'
            });
        }
    }
} 