import express from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { uploadAnalysisImage } from '../middleware/fileUpload';
import { authenticateToken } from '../middleware/auth';
import { AIController } from '../controllers/aiController';

const router = express.Router();

// Age detection endpoint
router.post('/detect-age', uploadAnalysisImage.single('image'), asyncHandler(AIController.detectAge));

// Face analysis endpoints
router.post('/analyze-face', uploadAnalysisImage.single('image'), asyncHandler(AIController.analyzeFaceCondition));

// Comprehensive analysis (requires auth to save history)
router.post('/comprehensive-analysis', authenticateToken, uploadAnalysisImage.single('image'), asyncHandler(AIController.getComprehensiveAnalysis));

// Treatment endpoints
router.post('/treatment/recommendation', asyncHandler(AIController.getTreatmentRecommendation));
router.get('/treatment/timeline', asyncHandler(AIController.getTreatmentTimeline));

// Health and info endpoints
router.get('/health', asyncHandler(AIController.getServiceHealth));
router.get('/conditions', asyncHandler(AIController.getAvailableConditions));

export default router; 