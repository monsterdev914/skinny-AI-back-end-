import express from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { uploadAnalysisImage, uploadTempImage } from '../middleware/fileUpload';
import { authenticateToken } from '../middleware/auth';
import { AIController } from '../controllers/aiController';

const router = express.Router();

// Age detection endpoint
router.post('/detect-age', uploadAnalysisImage.single('image'), asyncHandler(AIController.detectAge));

// Face analysis endpoints
router.post('/analyze-face', uploadAnalysisImage.single('image'), asyncHandler(AIController.analyzeFaceCondition));

// Skin area validation endpoint (no auth required)
router.post('/validate-skin', uploadTempImage.single('image'), asyncHandler(AIController.validateSkinArea));

// Comprehensive analysis (requires auth to save history)
router.post('/comprehensive-analysis', authenticateToken, uploadAnalysisImage.single('image'), asyncHandler(AIController.getComprehensiveAnalysis));

// Comprehensive analysis with coordinate detection (requires auth)
router.post('/comprehensive-analysis-coordinates', authenticateToken, uploadAnalysisImage.single('image'), asyncHandler(AIController.getComprehensiveAnalysisWithCoordinates));

// Treatment endpoints
router.post('/treatment/recommendation', asyncHandler(AIController.getTreatmentRecommendation));
router.get('/treatment/timeline', asyncHandler(AIController.getTreatmentTimeline));

// Health and info endpoints
router.get('/health', asyncHandler(AIController.getServiceHealth));
router.get('/conditions', asyncHandler(AIController.getAvailableConditions));

export default router; 