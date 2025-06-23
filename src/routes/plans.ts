import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { PlanController } from '../controllers/plan';

const router = Router();

// Get all active plans
router.get('/', asyncHandler(PlanController.getAllPlans));

// Get plan by ID
router.get('/:id', asyncHandler(PlanController.getPlanById));

export default router; 