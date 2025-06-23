import express from 'express';
import { AnalysisHistoryController } from '../controllers/analysisHistoryController';
import { authenticateToken } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// POST /api/history - Save analysis to history
router.post('/', asyncHandler(AnalysisHistoryController.saveAnalysis));

// GET /api/history - Get user's analysis history with pagination and filtering
router.get('/', asyncHandler(AnalysisHistoryController.getUserHistory));

// GET /api/history/recent - Get recent analyses
router.get('/recent', asyncHandler(AnalysisHistoryController.getRecentAnalyses));

// GET /api/history/summary - Get progress summary
router.get('/summary', asyncHandler(AnalysisHistoryController.getProgressSummary));

// GET /api/history/analytics - Get dashboard analytics
router.get('/analytics', asyncHandler(AnalysisHistoryController.getDashboardAnalytics));

// GET /api/history/trend/:condition - Get condition trend analysis
router.get('/trend/:condition', asyncHandler(AnalysisHistoryController.getConditionTrend));

// GET /api/history/:id - Get specific analysis by ID
router.get('/:id', asyncHandler(AnalysisHistoryController.getAnalysisById));

// PUT /api/history/:id/notes - Add/update notes for an analysis
router.put('/:id/notes', asyncHandler(AnalysisHistoryController.addNotes));

// DELETE /api/history/:id - Delete an analysis
router.delete('/:id', asyncHandler(AnalysisHistoryController.deleteAnalysis));

export default router; 