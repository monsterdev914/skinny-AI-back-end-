import { Request, Response } from 'express';
import { FaceAnalysisService } from '../services/ai/faceAnalysisService';
import AnalysisHistory from '../models/AnalysisHistory';
import { getRelativePath, getFileUrl } from '../middleware/fileUpload';
import fs from 'fs';

export class AIController {
    // Analyze face condition from uploaded image
    static async analyzeFaceCondition(req: Request, res: Response) {
        try {
            // Check if image file is provided (using multer middleware)
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: 'Please upload an image file'
                });
            }

            // Validate file type
            if (!req.file.mimetype.startsWith('image/')) {
                return res.status(400).json({
                    success: false,
                    message: 'Please upload a valid image file'
                });
            }

            // Validate file size (10MB limit)
            const maxSize = 10 * 1024 * 1024; // 10MB
            if (req.file.size > maxSize) {
                return res.status(400).json({
                    success: false,
                    message: 'Image file too large. Maximum size is 10MB'
                });
            }

            // Read the saved file for analysis
            const imageBuffer = fs.readFileSync(req.file.path);
            
            // Analyze the image
            const result = await FaceAnalysisService.analyzeFaceCondition(imageBuffer);

            if (!result.success) {
                return res.status(500).json({
                    success: false,
                    message: result.message
                });
            }

            // Format top 3 results for response
            const formattedResults = FaceAnalysisService.formatResults(result.predictions, 3);

            return res.json({
                success: true,
                message: 'Face analysis completed successfully',
                data: {
                    topPrediction: result.topPrediction,
                    allPredictions: formattedResults,
                    rawPredictions: result.predictions
                }
            });

        } catch (error) {
            console.error('Face analysis controller error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error during face analysis'
            });
        }
    }

    // Get treatment recommendations based on detected condition
    static async getTreatmentRecommendation(req: Request, res: Response) {
        try {
            const { condition, confidence, userAge, skinType, currentProducts } = req.body;

            // Validate required fields
            if (!condition || confidence === undefined) {
                return res.status(400).json({
                    success: false,
                    message: 'Condition and confidence are required'
                });
            }

            // Validate condition
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

            // Validate confidence (should be between 0 and 1)
            if (confidence < 0 || confidence > 1) {
                return res.status(400).json({
                    success: false,
                    message: 'Confidence must be between 0 and 1'
                });
            }

            // Generate treatment recommendation
            const result = await FaceAnalysisService.generateTreatmentRecommendation(
                condition,
                confidence,
                userAge,
                skinType,
                currentProducts
            );

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

        } catch (error) {
            console.error('Treatment recommendation controller error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error generating treatment recommendation'
            });
        }
    }

    // Get treatment timeline for a specific condition
    static async getTreatmentTimeline(req: Request, res: Response) {
        try {
            const { condition, severity } = req.query;

            // Validate required fields
            if (!condition) {
                return res.status(400).json({
                    success: false,
                    message: 'Condition is required'
                });
            }

            // Validate condition
            const validConditions = [
                'hormonal_acne', 'forehead_wrinkles', 'oily_skin', 
                'dry_skin', 'normal_skin', 'dark_spots', 
                'under_eye_bags', 'rosacea'
            ];

            if (!validConditions.includes(condition as string)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid condition specified'
                });
            }

            // Validate severity if provided
            const validSeverities = ['mild', 'moderate', 'severe'];
            const severityLevel = (severity as string) || 'moderate';
            
            if (!validSeverities.includes(severityLevel)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid severity level. Must be mild, moderate, or severe'
                });
            }

            // Generate treatment timeline
            const result = await FaceAnalysisService.getTreatmentTimeline(
                condition as string,
                severityLevel as 'mild' | 'moderate' | 'severe'
            );

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

        } catch (error) {
            console.error('Treatment timeline controller error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error generating treatment timeline'
            });
        }
    }

    // Comprehensive analysis: Face analysis + Treatment recommendation in one call
    static async getComprehensiveAnalysis(req: Request, res: Response) {
        try {
            // Check if image file is provided
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: 'Please upload an image file'
                });
            }

            // Validate file type and size (same as analyzeFaceCondition)
            if (!req.file.mimetype.startsWith('image/')) {
                return res.status(400).json({
                    success: false,
                    message: 'Please upload a valid image file'
                });
            }

            const maxSize = 10 * 1024 * 1024; // 10MB
            if (req.file.size > maxSize) {
                return res.status(400).json({
                    success: false,
                    message: 'Image file too large. Maximum size is 10MB'
                });
            }

            // Get optional user details from request body
            const { userAge, skinType, currentProducts } = req.body;
            const userId = (req as any).user?.id; // Get user ID from auth middleware

            // Read the saved file for analysis
            const imageBuffer = fs.readFileSync(req.file.path);
            
            // Step 1: Analyze face condition
            const analysisResult = await FaceAnalysisService.analyzeFaceCondition(imageBuffer);

            if (!analysisResult.success) {
                return res.status(500).json({
                    success: false,
                    message: analysisResult.message
                });
            }

            // Step 2: Generate treatment recommendation for top condition
            const topCondition = analysisResult.topPrediction;
            const treatmentResult = await FaceAnalysisService.generateTreatmentRecommendation(
                topCondition.condition,
                topCondition.confidence,
                userAge,
                skinType,
                currentProducts
            );

            if (!treatmentResult.success) {
                return res.status(500).json({
                    success: false,
                    message: treatmentResult.message
                });
            }

            // Step 3: Save to analysis history (if user is authenticated)
            if (userId) {
                try {
                    // Get relative path for storage
                    const relativePath = getRelativePath(req.file.path);
                    
                    const analysisHistory = new AnalysisHistory({
                        userId,
                        predictions: analysisResult.predictions,
                        topPrediction: analysisResult.topPrediction,
                        treatmentRecommendation: treatmentResult.data?.recommendation,
                        treatmentTimeline: treatmentResult.data?.timeline,
                        personalizedNotes: treatmentResult.data?.personalizedNotes,
                        userAge,
                        skinType,
                        currentProducts,
                        originalImageName: req.file.originalname,
                        imageSize: req.file.size,
                        imageType: req.file.mimetype,
                        imagePath: relativePath, // Save relative path to file
                        analysisType: 'comprehensive_analysis',
                        aiModel: 'gpt-4o',
                        success: true
                    });

                    await analysisHistory.save();
                    console.log('Analysis saved to history successfully');
                } catch (historyError) {
                    console.error('Failed to save analysis history:', historyError);
                    // Don't fail the request if history saving fails
                }
            }

            // Format analysis results
            const formattedResults = FaceAnalysisService.formatResults(analysisResult.predictions, 3);

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

        } catch (error) {
            console.error('Comprehensive analysis controller error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error during comprehensive analysis'
            });
        }
    }

    // Get AI service health status
    static async getServiceHealth(_req: Request, res: Response) {
        try {
            const isHealthy = await FaceAnalysisService.healthCheck();
            
            return res.json({
                success: true,
                data: {
                    service: 'Face Analysis AI',
                    status: isHealthy ? 'healthy' : 'unhealthy',
                    timestamp: new Date().toISOString()
                }
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: 'Health check failed'
            });
        }
    }

    // Get available face conditions
    static async getAvailableConditions(_req: Request, res: Response) {
        try {
            // Face conditions that OpenAI Vision can detect
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
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: 'Failed to get available conditions'
            });
        }
    }
} 