import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { 
    PaymentMethodController, 
    createPaymentMethodValidation, 
    confirmSetupIntentValidation 
} from '../controllers/paymentMethod';

const router = Router();

// Get user payment methods
router.get('/', authenticateToken, asyncHandler(PaymentMethodController.getUserPaymentMethods));

// Get specific payment method
router.get('/:paymentMethodId', authenticateToken, asyncHandler(PaymentMethodController.getPaymentMethod));

// Create setup intent for adding new payment method
router.post('/setup-intent', authenticateToken, asyncHandler(PaymentMethodController.createSetupIntent));

// Confirm setup intent and save payment method
router.post(
    '/confirm-setup-intent', 
    authenticateToken, 
    confirmSetupIntentValidation, 
    asyncHandler(PaymentMethodController.confirmSetupIntent)
);

// Create payment method (legacy - for direct payment method creation)
router.post(
    '/', 
    authenticateToken, 
    createPaymentMethodValidation, 
    asyncHandler(PaymentMethodController.createPaymentMethod)
);

// Set default payment method
router.post(
    '/:paymentMethodId/set-default', 
    authenticateToken, 
    asyncHandler(PaymentMethodController.setDefaultPaymentMethod)
);

// Delete payment method
router.delete('/:paymentMethodId', authenticateToken, asyncHandler(PaymentMethodController.deletePaymentMethod));

export default router; 