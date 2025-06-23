import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { uploadAnalysisImage } from '../middleware/fileUpload';
import { AIController } from '../controllers/aiController';

const router = Router();

// Face condition analysis endpoint
router.post('/analyze-face', 
    authenticateToken, 
    uploadAnalysisImage.single('image'), 
    asyncHandler(AIController.analyzeFaceCondition)
);

// Treatment recommendation endpoint
router.post('/treatment/recommendation',
    authenticateToken,
    asyncHandler(AIController.getTreatmentRecommendation)
);

// Treatment timeline endpoint
router.get('/treatment/timeline',
    authenticateToken,
    asyncHandler(AIController.getTreatmentTimeline)
);

// Comprehensive analysis endpoint (analysis + treatment in one call)
router.post('/comprehensive-analysis',
    authenticateToken,
    uploadAnalysisImage.single('image'),
    asyncHandler(AIController.getComprehensiveAnalysis)
);

// AI service health check (public endpoint)
router.get('/health', asyncHandler(AIController.getServiceHealth));

// Get available face conditions (public endpoint)
router.get('/conditions', asyncHandler(AIController.getAvailableConditions));

export default router; 