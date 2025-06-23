import { Request, Response } from 'express';
import AnalysisHistory, { IAnalysisHistory } from '../models/AnalysisHistory';

export class AnalysisHistoryController {
    // Save analysis result to history
    static async saveAnalysis(req: Request, res: Response) {
        try {
            const userId = (req as any).user.id;
            const {
                predictions,
                topPrediction,
                treatmentRecommendation,
                treatmentTimeline,
                personalizedNotes,
                analysisType,
                aiModel,
                userAge,
                skinType,
                currentProducts,
                imageMetadata,
                tags,
                notes
            } = req.body;

            const analysisHistory = new AnalysisHistory({
                userId,
                predictions,
                topPrediction,
                treatmentRecommendation,
                treatmentTimeline,
                personalizedNotes,
                analysisType,
                aiModel: aiModel || 'gpt-4o',
                userAge,
                skinType,
                currentProducts,
                originalImageName: imageMetadata?.originalName,
                imageSize: imageMetadata?.size,
                imageType: imageMetadata?.type,
                tags,
                notes,
                success: true
            });

            const savedAnalysis = await analysisHistory.save();

            res.status(201).json({
                success: true,
                message: 'Analysis saved to history successfully',
                data: savedAnalysis
            });

        } catch (error) {
            console.error('Error saving analysis history:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to save analysis history'
            });
        }
    }

    // Get user's analysis history
    static async getUserHistory(req: Request, res: Response) {
        try {
            const userId = (req as any).user.id;
            const page = parseInt((req.query as any).page as string) || 1;
            const limit = parseInt((req.query as any).limit as string) || 10;
            const condition = (req.query as any).condition as string;
            const analysisType = (req.query as any).analysisType as string;
            
            const skip = (page - 1) * limit;
            
            // Build query
            let query: any = { userId, success: true };
            
            if (condition) {
                query['topPrediction.condition'] = condition;
            }
            
            if (analysisType) {
                query.analysisType = analysisType;
            }

            // Fetch history with pagination
            const history = await AnalysisHistory.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean();

            // Add full image URLs to the history items
            const historyWithUrls = history.map(item => ({
                ...item,
                imageUrl: item.imagePath ? `/uploads/${item.imagePath}` : null
            }));

            // Get total count
            const total = await AnalysisHistory.countDocuments(query);

            res.json({
                success: true,
                data: {
                    history: historyWithUrls,
                    pagination: {
                        page,
                        limit,
                        total,
                        totalPages: Math.ceil(total / limit),
                        hasNextPage: page < Math.ceil(total / limit),
                        hasPrevPage: page > 1
                    }
                }
            });

        } catch (error) {
            console.error('Error fetching analysis history:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch analysis history'
            });
        }
    }

    // Get recent analyses
    static async getRecentAnalyses(req: Request, res: Response) {
        try {
            const userId = (req as any).user.id;
            const limit = parseInt((req.query as any).limit as string) || 5;

            const recentAnalyses = await (AnalysisHistory as any).findRecentByUser(userId, limit);

            res.json({
                success: true,
                data: recentAnalyses
            });

        } catch (error) {
            console.error('Error fetching recent analyses:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch recent analyses'
            });
        }
    }

    // Get analysis by ID
    static async getAnalysisById(req: Request, res: Response) {
        try {
            const userId = (req as any).user.id;
            const analysisId = (req.params as any).id;

            const analysis = await AnalysisHistory.findOne({
                _id: analysisId,
                userId
            });

            if (!analysis) {
                return res.status(404).json({
                    success: false,
                    message: 'Analysis not found'
                });
            }

            // Add image URL if imagePath exists
            const analysisWithUrl = {
                ...analysis.toObject(),
                imageUrl: analysis.imagePath ? `/uploads/${analysis.imagePath}` : null
            };

            res.json({
                success: true,
                data: analysisWithUrl
            });

        } catch (error) {
            console.error('Error fetching analysis:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch analysis'
            });
        }
    }

    // Get progress summary
    static async getProgressSummary(req: Request, res: Response) {
        try {
            const userId = (req as any).user.id;

            const summary = await (AnalysisHistory as any).getProgressSummary(userId);

            // Calculate overall progress trends
            const totalAnalyses = await AnalysisHistory.countDocuments({ userId, success: true });
            const recentAnalyses = await AnalysisHistory.find({ userId, success: true })
                .sort({ createdAt: -1 })
                .limit(5)
                .lean();

            res.json({
                success: true,
                data: {
                    conditionSummary: summary,
                    totalAnalyses,
                    recentAnalyses: recentAnalyses.map(analysis => ({
                        _id: analysis._id,
                        condition: analysis.topPrediction.condition,
                        confidence: analysis.topPrediction.confidence,
                        createdAt: analysis.createdAt,
                        analysisType: analysis.analysisType
                    })),
                    dateRange: {
                        firstAnalysis: recentAnalyses[recentAnalyses.length - 1]?.createdAt || null,
                        lastAnalysis: recentAnalyses[0]?.createdAt || null
                    }
                }
            });

        } catch (error) {
            console.error('Error fetching progress summary:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch progress summary'
            });
        }
    }

    // Get condition trend analysis
    static async getConditionTrend(req: Request, res: Response) {
        try {
            const userId = (req as any).user.id;
            const condition = (req.params as any).condition;
            const days = parseInt((req.query as any).days as string) || 30;

            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);

            const trendData = await AnalysisHistory.find({
                userId,
                'topPrediction.condition': condition,
                success: true,
                createdAt: { $gte: startDate }
            })
            .sort({ createdAt: 1 })
            .select('topPrediction.confidence createdAt')
            .lean();

            // Calculate trend direction
            let trend = 'stable';
            if (trendData.length >= 2) {
                const firstConfidence = trendData[0]?.topPrediction?.confidence;
                const lastConfidence = trendData[trendData.length - 1]?.topPrediction?.confidence;
                if (firstConfidence && lastConfidence) {
                    const diff = lastConfidence - firstConfidence;
                    
                    if (diff > 0.1) trend = 'worsening';
                    else if (diff < -0.1) trend = 'improving';
                }
            }

            res.json({
                success: true,
                data: {
                    condition,
                    trend,
                    dataPoints: trendData,
                    period: `${days} days`,
                    summary: {
                        totalAnalyses: trendData.length,
                        avgConfidence: trendData.reduce((sum, item) => sum + item.topPrediction.confidence, 0) / trendData.length || 0,
                        minConfidence: Math.min(...trendData.map(item => item.topPrediction.confidence)),
                        maxConfidence: Math.max(...trendData.map(item => item.topPrediction.confidence))
                    }
                }
            });

        } catch (error) {
            console.error('Error fetching condition trend:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch condition trend'
            });
        }
    }

    // Add notes to analysis
    static async addNotes(req: Request, res: Response) {
        try {
            const userId = (req as any).user.id;
            const analysisId = (req.params as any).id;
            const { notes, tags } = req.body;

            const analysis = await AnalysisHistory.findOneAndUpdate(
                { _id: analysisId, userId },
                { 
                    $set: { 
                        notes,
                        ...(tags && { tags })
                    }
                },
                { new: true }
            );

            if (!analysis) {
                return res.status(404).json({
                    success: false,
                    message: 'Analysis not found'
                });
            }

            res.json({
                success: true,
                message: 'Notes updated successfully',
                data: analysis
            });

        } catch (error) {
            console.error('Error updating notes:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update notes'
            });
        }
    }

    // Delete analysis
    static async deleteAnalysis(req: Request, res: Response) {
        try {
            const userId = (req as any).user.id;
            const analysisId = (req.params as any).id;

            const analysis = await AnalysisHistory.findOneAndDelete({
                _id: analysisId,
                userId
            });

            if (!analysis) {
                return res.status(404).json({
                    success: false,
                    message: 'Analysis not found'
                });
            }

            res.json({
                success: true,
                message: 'Analysis deleted successfully'
            });

        } catch (error) {
            console.error('Error deleting analysis:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete analysis'
            });
        }
    }

    // Get analytics dashboard data
    static async getDashboardAnalytics(req: Request, res: Response) {
        try {
            const userId = (req as any).user.id;

            // Get current date ranges
            const now = new Date();
            const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
            const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

            // Get various analytics in parallel
            const [
                totalAnalyses,
                thisMonthAnalyses,
                lastMonthAnalyses,
                allAnalyses,
                weeklyData
            ] = await Promise.all([
                AnalysisHistory.countDocuments({ userId, success: true }),
                AnalysisHistory.countDocuments({ 
                    userId, 
                    success: true, 
                    createdAt: { $gte: currentMonthStart } 
                }),
                AnalysisHistory.countDocuments({ 
                    userId, 
                    success: true, 
                    createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd } 
                }),
                AnalysisHistory.find({ userId, success: true })
                    .sort({ createdAt: -1 })
                    .lean(),
                AnalysisHistory.aggregate([
                    { $match: { userId: userId, success: true } },
                    {
                        $group: {
                            _id: {
                                year: { $year: '$createdAt' },
                                week: { $week: '$createdAt' }
                            },
                            count: { $sum: 1 }
                        }
                    },
                    { $sort: { '_id.year': -1, '_id.week': -1 } },
                    { $limit: 8 }
                ])
            ]);

            // Calculate average confidence
            const averageConfidence = allAnalyses.length > 0 
                ? allAnalyses.reduce((sum, analysis) => sum + (analysis.topPrediction?.confidence || 0), 0) / allAnalyses.length * 100
                : 0;

            // Find most common condition
            const conditionCounts = allAnalyses.reduce((acc, analysis) => {
                const condition = analysis.topPrediction?.condition;
                if (condition) {
                    acc[condition] = (acc[condition] || 0) + 1;
                }
                return acc;
            }, {} as Record<string, number>);

            const mostCommonCondition = Object.keys(conditionCounts).length > 0 
                ? (Object.entries(conditionCounts).sort(([,a], [,b]) => b - a)[0]?.[0] || 'None')
                : 'None';

            // Calculate improvement rate (based on recent confidence trends)
            const recentAnalyses = allAnalyses.slice(0, 10);
            let improvementRate = 0;
            if (recentAnalyses.length >= 2) {
                const oldAvg = recentAnalyses.slice(-5).reduce((sum, a) => sum + (a.topPrediction?.confidence || 0), 0) / Math.min(5, recentAnalyses.length);
                const newAvg = recentAnalyses.slice(0, 5).reduce((sum, a) => sum + (a.topPrediction?.confidence || 0), 0) / Math.min(5, recentAnalyses.length);
                
                // Higher confidence means worse condition, so improvement is when confidence decreases
                if (oldAvg > 0) {
                    improvementRate = Math.max(0, Math.min(100, ((oldAvg - newAvg) / oldAvg) * 100));
                }
            }

            // Format weekly data
            const weeklyAnalyses = weeklyData.reverse().map((week, index) => ({
                week: `Week ${week._id.week}`,
                count: week.count
            }));

            res.json({
                success: true,
                data: {
                    totalAnalyses,
                    thisMonth: thisMonthAnalyses,
                    lastMonth: lastMonthAnalyses,
                    averageConfidence,
                    mostCommonCondition: mostCommonCondition.replace('_', ' '),
                    improvementRate,
                    weeklyAnalyses
                }
            });

        } catch (error) {
            console.error('Error fetching dashboard analytics:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch dashboard analytics'
            });
        }
    }
} 