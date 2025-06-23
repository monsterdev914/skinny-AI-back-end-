import { Router } from 'express';
import { authenticateToken, requireUser } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { uploadAvatarImage } from '../middleware/fileUpload';
import { UserController } from '../controllers/user';

const router = Router();

// Get user profile
router.get('/profile', authenticateToken, requireUser, asyncHandler(UserController.getProfile));

// Update user profile
router.put('/profile', authenticateToken, requireUser, asyncHandler(UserController.updateProfile));

// Upload user avatar
router.post('/avatar', 
    authenticateToken, 
    requireUser, 
    uploadAvatarImage.single('avatar'), 
    asyncHandler(UserController.uploadAvatar)
);

// Delete user avatar
router.delete('/avatar', 
    authenticateToken, 
    requireUser, 
    asyncHandler(UserController.deleteAvatar)
);

export default router; 