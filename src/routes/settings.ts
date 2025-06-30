import { Router } from 'express';
import { SettingsController } from '../controllers/settings';
import { authenticateToken, requireUser } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

// Get user settings
router.get('/', authenticateToken, requireUser, asyncHandler(SettingsController.getSettings));

// Update user settings
router.put('/', authenticateToken, requireUser, asyncHandler(SettingsController.updateSettings));

// Reset settings to default
router.post('/reset', authenticateToken, requireUser, asyncHandler(SettingsController.resetSettings));

// Update notification preferences only
router.put('/notifications', authenticateToken, requireUser, asyncHandler(SettingsController.updateNotifications));

// Update privacy preferences only
router.put('/privacy', authenticateToken, requireUser, asyncHandler(SettingsController.updatePrivacy));

// Get data usage statistics
router.get('/data-usage', authenticateToken, requireUser, asyncHandler(SettingsController.getDataUsage));

// Export user data
router.get('/export', authenticateToken, requireUser, asyncHandler(SettingsController.exportData));

// Delete user account (requires password confirmation)
router.delete('/account', authenticateToken, requireUser, asyncHandler(SettingsController.deleteAccount));

export default router; 