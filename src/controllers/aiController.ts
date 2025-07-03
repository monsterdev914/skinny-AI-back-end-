import { Request, Response } from 'express';
import { FaceAnalysisService } from '../services/ai/faceAnalysisService';
import { SkinAnalyzeProService } from '../services/ai/skinAnalyzeProService';
import AnalysisHistory from '../models/AnalysisHistory';
import { getRelativePath, deleteFile } from '../middleware/fileUpload';
import fs from 'fs';
import sharp from 'sharp';

export class AIController {
    // Detect age from uploaded image
    static async detectAge(req: Request, res: Response) {
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
            
            // Detect age from the image
            const result = await FaceAnalysisService.detectAgeFromImage(imageBuffer);

            if (!result.success) {
                return res.status(500).json({
                    success: false,
                    message: result.message
                });
            }

            return res.json({
                success: true,
                message: 'Age detection completed successfully',
                data: {
                    estimatedAge: result.estimatedAge,
                    confidence: result.confidence,
                    confidencePercentage: result.confidence ? Math.round(result.confidence * 100) : 0
                }
            });

        } catch (error) {
            console.error('Age detection controller error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error during age detection'
            });
        }
    }

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

    // Comprehensive analysis: Face analysis + Age detection + Treatment recommendation in one call
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
            const { skinType, currentProducts } = req.body || {};
            const userId = (req as any).user?.id; // Get user ID from auth middleware

            // Read the saved file for analysis
            const imageBuffer = fs.readFileSync(req.file.path);
            
            // OPTIMIZED: Single comprehensive analysis call instead of multiple separate calls
            console.log('Starting optimized comprehensive analysis...');
            const result = await FaceAnalysisService.getComprehensiveAnalysisOptimized(
                imageBuffer,
                undefined, // No age parameter needed
                skinType,
                currentProducts
            );

            if (!result.success) {
                return res.status(500).json({
                    success: false,
                    message: result.message
                });
            }

            // Save to analysis history (if user is authenticated)
            if (userId) {
                try {
                    // Get relative path for storage
                    const relativePath = getRelativePath(req.file.path);
                    
                    const analysisHistory = new AnalysisHistory({
                        userId,
                        predictions: result.data?.analysis?.predictions || {},
                        topPrediction: result.data?.analysis?.topPrediction || { condition: 'unknown', confidence: 0 },
                        treatmentRecommendation: result.data?.treatment?.recommendation,
                        treatmentTimeline: result.data?.treatment?.timeline?.timeline,
                        personalizedNotes: result.data?.treatment?.recommendation?.personalizedNotes ? [result.data.treatment.recommendation.personalizedNotes] : [],
                        skinType,
                        currentProducts,
                        originalImageName: req.file.originalname,
                        imageSize: req.file.size,
                        imageType: req.file.mimetype,
                        imagePath: relativePath,
                        analysisType: 'comprehensive_analysis',
                        aiModel: 'gpt-4o',
                        success: true
                    });

                    await analysisHistory.save();
                    console.log('Optimized analysis saved to history successfully');
                } catch (historyError) {
                    console.error('Failed to save analysis history:', historyError);
                    // Don't fail the request if history saving fails
                }
            }

            return res.json({
                success: true,
                message: 'Comprehensive analysis completed successfully with optimized single API call',
                data: result.data
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

    // Validate if image contains suitable skin area for analysis
    static async validateSkinArea(req: Request, res: Response) {
        try {
            // Check if image file is provided
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

            // Read the saved file for validation
            const imageBuffer = fs.readFileSync(req.file.path);
            
            console.log('Validating skin area in uploaded image...');
            const result = await FaceAnalysisService.validateSkinArea(imageBuffer);

            // Clean up temporary file
            if (req.file?.path) {
                deleteFile(req.file.path);
            }

            return res.json({
                success: result.success,
                message: result.message,
                data: {
                    hasFace: result.hasFace,
                    skinAreaDetected: result.skinAreaDetected,
                    imageQuality: result.imageQuality,
                    faceRegion: result.faceRegion,
                    visibleSkinAreas: result.visibleSkinAreas,
                    analysisRecommendation: result.analysisRecommendation,
                    issues: result.issues,
                    suitable: result.skinAreaDetected && (result.analysisRecommendation === 'proceed' || !result.analysisRecommendation)
                }
            });

        } catch (error) {
            console.error('Skin validation controller error:', error);
            
            // Clean up temporary file on error
            if (req.file?.path) {
                deleteFile(req.file.path);
            }
            
            return res.status(500).json({
                success: false,
                message: 'Internal server error during skin validation'
            });
        }
    }

    // Comprehensive analysis with coordinate detection
    static async getComprehensiveAnalysisWithCoordinates(req: Request, res: Response) {
        try {
            // Check if image file is provided
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: 'Please upload an image file'
                });
            }

            // Validate file type and size
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
            const { skinType, currentProducts } = req.body || {};
            const userId = (req as any).user?.id;

            // Read the saved file for analysis
            const imageBuffer = fs.readFileSync(req.file.path);
            
            console.log('Starting comprehensive analysis with coordinate detection...');
            const result = await FaceAnalysisService.getComprehensiveAnalysisOptimized(
                imageBuffer,
                undefined,
                skinType,
                currentProducts
            );

            if (!result.success) {
                return res.status(500).json({
                    success: false,
                    message: result.message
                });
            }

            // Save to analysis history with coordinate data
            if (userId) {
                try {
                    const relativePath = getRelativePath(req.file.path);
                    
                    console.log('Saving analysis with coordinate data...');
                    console.log('User ID:', userId);
                    console.log('Analysis data structure:', {
                        predictions: result.data?.analysis?.predictions,
                        topPrediction: result.data?.analysis?.topPrediction,
                        detectedFeatures: result.data?.analysis?.detectedFeatures,
                        imageMetadata: result.data?.analysis?.imageMetadata,
                        treatmentRecommendation: result.data?.treatment?.recommendation,
                        treatmentTimeline: result.data?.treatment?.timeline?.timeline
                    });
                    
                    // Detailed logging for imageMetadata
                    console.log('Detailed imageMetadata:', JSON.stringify(result.data?.analysis?.imageMetadata, null, 2));
                    
                    const analysisHistory = new AnalysisHistory({
                        userId,
                        predictions: result.data?.analysis?.predictions || {},
                        topPrediction: result.data?.analysis?.topPrediction || { condition: 'unknown', confidence: 0 },
                        treatmentRecommendation: result.data?.treatment?.recommendation,
                        treatmentTimeline: result.data?.treatment?.timeline?.timeline,
                        personalizedNotes: result.data?.treatment?.recommendation?.personalizedNotes ? [result.data.treatment.recommendation.personalizedNotes] : [],
                        skinType,
                        currentProducts,
                        originalImageName: req.file.originalname,
                        imageSize: req.file.size,
                        imageType: req.file.mimetype,
                        imagePath: relativePath,
                        analysisType: 'comprehensive_with_coordinates',
                        aiModel: 'gpt-4o-mini',
                        success: true,
                        // Store comprehensive skin analysis data with enhanced features
                        detectedFeatures: (result.data?.analysis?.detectedFeatures || []).map((feature: any) => ({
                            condition: feature.condition || 'unknown',
                            confidence: feature.confidence || 0,
                            coordinates: feature.coordinates || [],
                            boundingBox: feature.boundingBox || undefined,
                            area: feature.area || undefined,
                            severity: feature.severity || 'mild',
                            bodyRegion: feature.bodyRegion || 'etc',
                            description: feature.description || '',
                            distinctiveCharacteristics: feature.distinctiveCharacteristics || '',
                            coordinateVerification: feature.coordinateVerification || {
                                isOnSkin: true,
                                isNotOnClothing: true,
                                isMostDistinctive: true,
                                skinAreaDescription: ''
                            }
                        })),
                        imageMetadata: result.data?.analysis?.imageMetadata
                    });

                    await analysisHistory.save();
                    console.log('Analysis with coordinates saved to history successfully');
                    console.log('Saved analysis ID:', analysisHistory._id);
                } catch (historyError) {
                    console.error('Failed to save analysis history:', historyError);
                    console.error('History save error details:', historyError);
                }
            } else {
                console.log('No userId found - analysis not saved to history');
            }

            return res.json({
                success: true,
                message: 'Comprehensive analysis with coordinates completed successfully',
                data: {
                    ...result.data,
                    analysisType: 'comprehensive_with_coordinates'
                }
            });

        } catch (error) {
            console.error('Comprehensive analysis with coordinates error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error during coordinate analysis'
            });
        }
    }

    // Get available comprehensive skin conditions
    static async getAvailableConditions(_req: Request, res: Response) {
        try {
            // Comprehensive skin conditions that the AI can detect
            const conditions = [
                // Facial conditions
                'hormonal_acne',
                'forehead_wrinkles',
                'oily_skin',
                'dry_skin',
                'normal_skin',
                'dark_spots',
                'under_eye_bags',
                'rosacea',
                // Body conditions
                'eczema',
                'psoriasis',
                'keratosis_pilaris',
                'stretch_marks',
                'scars',
                'moles',
                'sun_damage',
                'age_spots',
                'seborrheic_keratosis'
            ];

            return res.json({
                success: true,
                data: {
                    conditions,
                    total: conditions.length,
                    facialConditions: conditions.slice(0, 8),
                    bodyConditions: conditions.slice(8)
                }
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: 'Failed to get available conditions'
            });
        }
    }

    // Professional skin analysis using Skin Analyze Pro API with accurate location overlays
    static async professionalSkinAnalysis(req: Request, res: Response) {
        try {
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: 'No image file provided'
                });
            }

            console.log('Starting professional skin analysis with Skin Analyze Pro API:', req.file.filename);

            // Save file properties before cleanup
            const fileProperties = {
                originalname: req.file.originalname,
                size: req.file.size,
                mimetype: req.file.mimetype,
                path: req.file.path
            };

            // Get image dimensions
            const imageBuffer = fs.readFileSync(req.file.path);
            const imageMetadata = await sharp(imageBuffer).metadata();

            // Parse optional user details
            const userAge = req.body.userAge ? parseInt(req.body.userAge) : undefined;
            const skinType = req.body.skinType || undefined;
            const currentProducts = req.body.currentProducts ? 
                (Array.isArray(req.body.currentProducts) ? req.body.currentProducts : [req.body.currentProducts]) : 
                undefined;

            console.log('User details:', { userAge, skinType, currentProducts });

            // Step 1: Professional Skin Analysis using Skin Analyze Pro API
            console.log('Step 1: Calling Skin Analyze Pro API for detailed skin analysis...');
            const skinAnalysisResult = await SkinAnalyzeProService.analyzeSkin(imageBuffer);

            if (!skinAnalysisResult.success) {
                console.error('Professional skin analysis failed, but keeping uploaded file for debugging');
                return res.status(500).json({
                    success: false,
                    message: skinAnalysisResult.message,
                    error: skinAnalysisResult.error
                });
            }

            // Step 2: Convert to detected features with accurate locations
            const detectedFeatures = SkinAnalyzeProService.convertToDetectedFeatures(skinAnalysisResult);
            const professionalImageMetadata = SkinAnalyzeProService.convertToImageMetadata(
                skinAnalysisResult, 
                imageMetadata.width || 1024, 
                imageMetadata.height || 1024
            );

            console.log(`Step 2 Complete: Detected ${detectedFeatures.length} skin conditions with precise locations`);

            // Step 3: Generate comprehensive treatment plan using OpenAI (single prompt)
            const primaryCondition = detectedFeatures.length > 0 ? 
                detectedFeatures.reduce((prev, current) => 
                    (prev.confidence > current.confidence) ? prev : current
                ) : 
                { condition: 'normal_skin', confidence: 0.8 };

            console.log('Step 3: Generating comprehensive treatment plan with single OpenAI call...');

            // Single OpenAI call for both treatment recommendation and timeline (already optimized)
            const treatmentPlan = await FaceAnalysisService.generateTreatmentRecommendation(
                primaryCondition.condition,
                primaryCondition.confidence,
                userAge || skinAnalysisResult.data?.skin_age,
                skinType,
                currentProducts
            );

            // Step 4: Save to analysis history
            console.log('Step 4: Saving professional analysis to history...');
            
            // Get relative path for proper URL construction
            const relativePath = getRelativePath(req.file.path);
            console.log('Storing relative path:', relativePath);
            
            const analysisHistory = new AnalysisHistory({
                userId: (req as any).user?.id,
                predictions: detectedFeatures.reduce((acc: any, feature) => {
                    acc[feature.condition] = feature.confidence;
                    return acc;
                }, {}),
                topPrediction: {
                    condition: primaryCondition.condition,
                    confidence: primaryCondition.confidence
                },
                detectedFeatures,
                imageMetadata: professionalImageMetadata,
                treatmentRecommendation: (treatmentPlan.data as any)?.recommendation,
                treatmentTimeline: (treatmentPlan.data as any)?.timeline,
                personalizedNotes: [
                    `Professional skin analysis using Skin Analyze Pro API completed`,
                    `Detected ${detectedFeatures.length} skin conditions with precise location mapping`,
                    `Primary condition: ${primaryCondition.condition}`,
                    `Professional confidence: ${Math.round(primaryCondition.confidence * 100)}%`,
                    `Skin quality score: ${Math.round((skinAnalysisResult.data?.overall_skin_quality_score || 0) * 100)}%`,
                    `Skin age analysis: ${skinAnalysisResult.data?.skin_age || 'Not determined'} years`,
                    `Skin type: ${skinAnalysisResult.data?.skin_type.type || 'Not determined'}`
                ],
                analysisType: 'professional_skin_analyze_pro',
                aiModel: 'Skin Analyze Pro API',
                userAge,
                skinType,
                currentProducts,
                originalImageName: fileProperties.originalname,
                imageSize: fileProperties.size,
                imageType: fileProperties.mimetype,
                imagePath: relativePath,
                success: true
            });

            await analysisHistory.save();
            console.log('Professional analysis saved with ID:', analysisHistory._id);

            // Keep the uploaded file in permanent location for future viewing
            console.log('Image saved permanently at:', relativePath);

            // Step 4: Return comprehensive results with professional metrics
            return res.json({
                success: true,
                message: 'Professional skin analysis completed successfully with precise location mapping',
                data: {
                    analysis: {
                        topPrediction: {
                            condition: primaryCondition.condition,
                            confidence: primaryCondition.confidence
                        },
                        allPredictions: detectedFeatures.map(feature => ({
                            condition: feature.condition,
                            confidence: feature.confidence,
                            percentage: `${Math.round(feature.confidence * 100)}%`,
                            bodyRegion: feature.bodyRegion,
                            severity: feature.severity
                        })).sort((a, b) => b.confidence - a.confidence),
                        rawPredictions: detectedFeatures.reduce((acc: any, feature) => {
                            acc[feature.condition] = feature.confidence;
                            return acc;
                        }, {}),
                        detectedFeatures, // This contains precise bounding boxes for overlays
                        imageMetadata: professionalImageMetadata,
                        professionalMetrics: {
                            skinTone: skinAnalysisResult.data?.skin_tone_classification,
                            skinUndertone: skinAnalysisResult.data?.skin_undertone_classification,
                            skinType: skinAnalysisResult.data?.skin_type.type,
                            skinAge: skinAnalysisResult.data?.skin_age,
                            pigmentationLevel: skinAnalysisResult.data?.pigmentation_level,
                            overallScore: Math.round((skinAnalysisResult.data?.overall_skin_quality_score || 0) * 100),
                            qualityScore: Math.round((skinAnalysisResult.data?.overall_skin_quality_score || 0) * 100),
                            qualityBreakdown: {
                                acnePresent: skinAnalysisResult.data?.acne_analysis.present,
                                blackheadsPresent: skinAnalysisResult.data?.blackheads.present,
                                blackheadsSeverity: skinAnalysisResult.data?.blackheads.severity,
                                blackheadsQuantity: skinAnalysisResult.data?.blackheads.quantity,
                                darkCirclesPresent: skinAnalysisResult.data?.dark_circles.present,
                                eyeBagsPresent: skinAnalysisResult.data?.eye_bags.present,
                                foreheadWrinklesPresent: skinAnalysisResult.data?.wrinkles.forehead.present,
                                enlargedPoresPresent: Object.values(skinAnalysisResult.data?.pores || {}).some((pore: any) => pore.present)
                            }
                        }
                    },
                    treatment: (treatmentPlan.data as any)?.recommendation,
                    timeline: (treatmentPlan.data as any)?.timeline,
                    ageDetection: {
                        estimatedAge: skinAnalysisResult.data?.skin_age || 25,
                        confidence: 0.9,
                        confidencePercentage: 90,
                        skinAgeAnalysis: skinAnalysisResult.data?.skin_age
                    },
                    apiProvider: 'Skin Analyze Pro API',
                    analysisMethod: 'Professional-grade skin analysis with precise location mapping'
                }
            });

        } catch (error) {
            console.error('Professional skin analysis error:', error);
            console.log('Keeping uploaded file for debugging purposes at:', req.file?.path);
            
            return res.status(500).json({
                success: false,
                message: 'Failed to perform professional skin analysis',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    // Enhanced health check for all AI services
    static async healthCheck(_req: Request, res: Response) {
        try {
            const checks = await Promise.all([
                FaceAnalysisService.healthCheck(),
                SkinAnalyzeProService.healthCheck()
            ]);

            const [openAIHealthy, skinAnalyzeProHealthy] = checks;

            res.json({
                success: true,
                services: {
                    openai: {
                        status: openAIHealthy ? 'healthy' : 'unhealthy',
                        name: 'OpenAI GPT-4 Vision',
                        description: 'Treatment recommendations and age detection'
                    },
                    skinAnalyzePro: {
                        status: skinAnalyzeProHealthy ? 'healthy' : 'unhealthy',
                        name: 'Skin Analyze Pro API',
                        description: 'Professional skin condition detection with precise locations'
                    }
                },
                overall: openAIHealthy && skinAnalyzeProHealthy ? 'healthy' : 'degraded',
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Health check failed',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
} 