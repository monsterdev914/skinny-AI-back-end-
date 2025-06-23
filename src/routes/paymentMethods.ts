import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { PaymentMethodController } from '../controllers/paymentMethod';

const router = Router();

// Get user payment methods
router.get('/', authenticateToken, asyncHandler(PaymentMethodController.getUserPaymentMethods));

export default router; 