import { Router } from 'express';

// Routes
import authRouter from './auth';
import userRouter from './users';
import planRouter from './plans';
import subscriptionRouter from './subscriptions';
import paymentMethodRouter from './paymentMethods';
import aiRouter from './ai';
import analysisHistoryRouter from './analysisHistory';
import settingsRouter from './settings';
import notificationsRouter from './notifications';
import webhookRouter from './webhooks';

// Router
const router = Router();

router.use('/auth', authRouter);
router.use('/users', userRouter);
router.use('/plans', planRouter);
router.use('/subscriptions', subscriptionRouter);
router.use('/payment-methods', paymentMethodRouter);
router.use('/ai', aiRouter);
router.use('/history', analysisHistoryRouter);
router.use('/settings', settingsRouter);
router.use('/notifications', notificationsRouter);
router.use('/webhooks', webhookRouter);

export default router;