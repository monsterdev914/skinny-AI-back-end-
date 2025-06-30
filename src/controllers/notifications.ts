import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { Notification } from '../models/Notification';

export class NotificationsController {
    // Get user notifications
    static async getNotifications(req: AuthenticatedRequest, res: Response) {
        try {
                    const userId = req.user?.id;
        const limit = parseInt((req.query as any).limit as string) || 20;
            
            const notifications = await Notification.findByUserId(userId, limit);
            
            return res.json({
                success: true,
                message: 'Notifications retrieved successfully',
                data: notifications
            });
        } catch (error) {
            console.error('Get notifications error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to retrieve notifications'
            });
        }
    }
    
    // Get unread notifications count
    static async getUnreadCount(req: AuthenticatedRequest, res: Response) {
        try {
            const userId = req.user?.id;
            
            const unreadNotifications = await Notification.findUnreadByUserId(userId);
            
            return res.json({
                success: true,
                message: 'Unread count retrieved successfully',
                data: { count: unreadNotifications.length }
            });
        } catch (error) {
            console.error('Get unread count error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to retrieve unread count'
            });
        }
    }
    
    // Mark notification as read
    static async markAsRead(req: AuthenticatedRequest, res: Response) {
        try {
            const userId = req.user?.id;
            const { id } = req.params;
            
            const notification = await Notification.findOneAndUpdate(
                { _id: id, userId },
                { isRead: true },
                { new: true }
            );
            
            if (!notification) {
                return res.status(404).json({
                    success: false,
                    message: 'Notification not found'
                });
            }
            
            return res.json({
                success: true,
                message: 'Notification marked as read',
                data: notification
            });
        } catch (error) {
            console.error('Mark as read error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to mark notification as read'
            });
        }
    }
    
    // Mark all notifications as read
    static async markAllAsRead(req: AuthenticatedRequest, res: Response) {
        try {
            const userId = req.user?.id;
            
            await Notification.markAllAsRead(userId);
            
            return res.json({
                success: true,
                message: 'All notifications marked as read'
            });
        } catch (error) {
            console.error('Mark all as read error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to mark all notifications as read'
            });
        }
    }
    
    // Delete notification
    static async deleteNotification(req: AuthenticatedRequest, res: Response) {
        try {
            const userId = req.user?.id;
            const { id } = req.params;
            
            const notification = await Notification.findOneAndDelete({
                _id: id,
                userId
            });
            
            if (!notification) {
                return res.status(404).json({
                    success: false,
                    message: 'Notification not found'
                });
            }
            
            return res.json({
                success: true,
                message: 'Notification deleted successfully'
            });
        } catch (error) {
            console.error('Delete notification error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to delete notification'
            });
        }
    }
    
    // Create notification (for testing or admin use)
    static async createNotification(req: AuthenticatedRequest, res: Response) {
        try {
            const userId = req.user?.id;
            const { title, message, type, category, actionUrl, metadata } = req.body;
            
            const notification = await Notification.create({
                userId,
                title,
                message,
                type: type || 'info',
                category: category || 'system',
                actionUrl,
                metadata
            });
            
            return res.status(201).json({
                success: true,
                message: 'Notification created successfully',
                data: notification
            });
        } catch (error) {
            console.error('Create notification error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to create notification'
            });
        }
    }
} 