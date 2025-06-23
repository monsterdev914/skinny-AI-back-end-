"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIController = void 0;
const faceAnalysisService_1 = require("../services/ai/faceAnalysisService");
class AIController {
    static async analyzeFaceCondition(req, res) {
        try {
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: 'Please upload an image file'
                });
            }
            if (!req.file.mimetype.startsWith('image/')) {
                return res.status(400).json({
                    success: false,
                    message: 'Please upload a valid image file'
                });
            }
            const maxSize = 10 * 1024 * 1024;
            if (req.file.size > maxSize) {
                return res.status(400).json({
                    success: false,
                    message: 'Image file too large. Maximum size is 10MB'
                });
            }
            const result = await faceAnalysisService_1.FaceAnalysisService.analyzeFaceCondition(req.file.buffer);
            if (!result.success) {
                return res.status(500).json({
                    success: false,
                    message: result.message
                });
            }
            const formattedResults = faceAnalysisService_1.FaceAnalysisService.formatResults(result.predictions, 3);
            return res.json({
                success: true,
                message: 'Face analysis completed successfully',
                data: {
                    topPrediction: result.topPrediction,
                    allPredictions: formattedResults,
                    rawPredictions: result.predictions
                }
            });
        }
        catch (error) {
            console.error('Face analysis controller error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error during face analysis'
            });
        }
    }
    static async getTreatmentRecommendation(req, res) {
        try {
            const { condition, confidence, userAge, skinType, currentProducts } = req.body;
            if (!condition || confidence === undefined) {
                return res.status(400).json({
                    success: false,
                    message: 'Condition and confidence are required'
                });
            }
            const validConditions = [
                'hormonal_acne', 'forehead_wrinkles', 'oily_skin',
                'dry_skin', 'normal_skin', 'dark_spots',
                'under_eye_bags', 'rosacea'
            ];
            if (!validConditions.includes(condition)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid condition specified'
                });
            }
            if (confidence < 0 || confidence > 1) {
                return res.status(400).json({
                    success: false,
                    message: 'Confidence must be between 0 and 1'
                });
            }
            const result = await faceAnalysisService_1.FaceAnalysisService.generateTreatmentRecommendation(condition, confidence, userAge, skinType, currentProducts);
            if (!result.success) {
                return res.status(500).json({
                    success: false,
                    message: result.message
                });
            }
            return res.json({
                success: true,
                message: 'Treatment recommendation generated successfully',
                data: result.data
            });
        }
        catch (error) {
            console.error('Treatment recommendation controller error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error generating treatment recommendation'
            });
        }
    }
    static async getTreatmentTimeline(req, res) {
        try {
            const { condition, severity } = req.query;
            if (!condition) {
                return res.status(400).json({
                    success: false,
                    message: 'Condition is required'
                });
            }
            const validConditions = [
                'hormonal_acne', 'forehead_wrinkles', 'oily_skin',
                'dry_skin', 'normal_skin', 'dark_spots',
                'under_eye_bags', 'rosacea'
            ];
            if (!validConditions.includes(condition)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid condition specified'
                });
            }
            const validSeverities = ['mild', 'moderate', 'severe'];
            const severityLevel = severity || 'moderate';
            if (!validSeverities.includes(severityLevel)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid severity level. Must be mild, moderate, or severe'
                });
            }
            const result = await faceAnalysisService_1.FaceAnalysisService.getTreatmentTimeline(condition, severityLevel);
            if (!result.success) {
                return res.status(500).json({
                    success: false,
                    message: result.message
                });
            }
            return res.json({
                success: true,
                message: 'Treatment timeline generated successfully',
                data: result.timeline
            });
        }
        catch (error) {
            console.error('Treatment timeline controller error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error generating treatment timeline'
            });
        }
    }
    static async getComprehensiveAnalysis(req, res) {
        try {
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: 'Please upload an image file'
                });
            }
            if (!req.file.mimetype.startsWith('image/')) {
                return res.status(400).json({
                    success: false,
                    message: 'Please upload a valid image file'
                });
            }
            const maxSize = 10 * 1024 * 1024;
            if (req.file.size > maxSize) {
                return res.status(400).json({
                    success: false,
                    message: 'Image file too large. Maximum size is 10MB'
                });
            }
            const { userAge, skinType, currentProducts } = req.body;
            const analysisResult = await faceAnalysisService_1.FaceAnalysisService.analyzeFaceCondition(req.file.buffer);
            if (!analysisResult.success) {
                return res.status(500).json({
                    success: false,
                    message: analysisResult.message
                });
            }
            const topCondition = analysisResult.topPrediction;
            const treatmentResult = await faceAnalysisService_1.FaceAnalysisService.generateTreatmentRecommendation(topCondition.condition, topCondition.confidence, userAge, skinType, currentProducts);
            if (!treatmentResult.success) {
                return res.status(500).json({
                    success: false,
                    message: treatmentResult.message
                });
            }
            const formattedResults = faceAnalysisService_1.FaceAnalysisService.formatResults(analysisResult.predictions, 3);
            return res.json({
                success: true,
                message: 'Comprehensive analysis completed successfully',
                data: {
                    analysis: {
                        topPrediction: analysisResult.topPrediction,
                        allPredictions: formattedResults,
                        rawPredictions: analysisResult.predictions
                    },
                    treatment: treatmentResult.data
                }
            });
        }
        catch (error) {
            console.error('Comprehensive analysis controller error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error during comprehensive analysis'
            });
        }
    }
    static async getServiceHealth(_req, res) {
        try {
            const isHealthy = await faceAnalysisService_1.FaceAnalysisService.healthCheck();
            return res.json({
                success: true,
                data: {
                    service: 'Face Analysis AI',
                    status: isHealthy ? 'healthy' : 'unhealthy',
                    timestamp: new Date().toISOString()
                }
            });
        }
        catch (error) {
            return res.status(500).json({
                success: false,
                message: 'Health check failed'
            });
        }
    }
    static async getAvailableConditions(_req, res) {
        try {
            const conditions = [
                'hormonal_acne',
                'forehead_wrinkles',
                'oily_skin',
                'dry_skin',
                'normal_skin',
                'dark_spots',
                'under_eye_bags',
                'rosacea'
            ];
            return res.json({
                success: true,
                data: {
                    conditions,
                    total: conditions.length
                }
            });
        }
        catch (error) {
            return res.status(500).json({
                success: false,
                message: 'Failed to get available conditions'
            });
        }
    }
}
exports.AIController = AIController;
//# sourceMappingURL=aiController.js.map