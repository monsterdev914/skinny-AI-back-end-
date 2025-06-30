import { Router } from 'express';
import { NotificationsController } from '../controllers/notifications';
import { authenticateToken, requireUser } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

// Get user notifications
router.get('/', authenticateToken, requireUser, asyncHandler(NotificationsController.getNotifications));

// Get unread notifications count
router.get('/unread-count', authenticateToken, requireUser, asyncHandler(NotificationsController.getUnreadCount));

// Mark notification as read
router.put('/:id/read', authenticateToken, requireUser, asyncHandler(NotificationsController.markAsRead));

// Mark all notifications as read
router.put('/mark-all-read', authenticateToken, requireUser, asyncHandler(NotificationsController.markAllAsRead));

// Delete notification
router.delete('/:id', authenticateToken, requireUser, asyncHandler(NotificationsController.deleteNotification));

// Create notification (for testing or admin use)
router.post('/', authenticateToken, requireUser, asyncHandler(NotificationsController.createNotification));

export default router; 