import mongoose, { Schema, Document } from 'mongoose';

// Base document interface extending mongoose Document
interface BaseDocument extends Document {
    _id: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

// Face condition predictions interface
interface IFaceConditionPredictions {
    hormonal_acne?: number;
    forehead_wrinkles?: number;
    oily_skin?: number;
    dry_skin?: number;
    normal_skin?: number;
    dark_spots?: number;
    under_eye_bags?: number;
    rosacea?: number;
}

// Treatment step interface
interface ITreatmentStep {
    step: number;
    title: string;
    description: string;
    products: string[];
    frequency: string;
    duration: string;
    tips: string[];
}

// Timeline phase interface
interface ITimelinePhase {
    phase: number;
    title: string;
    timeframe: string;
    description: string;
    expectedChanges: string[];
    skinCareAdjustments: string[];
    milestones: string[];
}

// Maintenance phase interface
interface IMaintenancePhase {
    title: string;
    description: string;
    ongoingCare: string[];
}

// Treatment recommendation interface
interface ITreatmentRecommendation {
    condition: string;
    severity: 'mild' | 'moderate' | 'severe';
    overview: string;
    steps: ITreatmentStep[];
    expectedResults: string;
    warnings: string[];
    professionalAdvice: string;
}

// Treatment timeline interface
interface ITreatmentTimeline {
    condition: string;
    totalDuration: string;
    phases: ITimelinePhase[];
    maintenancePhase: IMaintenancePhase;
    checkupSchedule: string[];
}

// Main analysis history interface
export interface IAnalysisHistory extends BaseDocument {
    userId: mongoose.Types.ObjectId;
    
    // Image metadata
    originalImageName?: string;
    imageSize?: number;
    imageType?: string;
    imagePath?: string; // Relative path to saved image file
    
    // Analysis results
    predictions: IFaceConditionPredictions;
    topPrediction: {
        condition: string;
        confidence: number;
    };
    
    // Treatment data
    treatmentRecommendation?: ITreatmentRecommendation;
    treatmentTimeline?: ITreatmentTimeline;
    personalizedNotes?: string[];
    
    // User context at time of analysis
    userAge?: number;
    skinType?: string;
    currentProducts?: string[];
    
    // Analysis metadata
    analysisType: 'face_analysis' | 'comprehensive_analysis';
    aiModel: string; // e.g., 'gpt-4o'
    success: boolean;
    errorMessage?: string;
    
    // Progress tracking
    tags?: string[]; // e.g., ['improvement', 'new_condition', 'follow_up']
    notes?: string; // User's personal notes
}

// Mongoose schema definition
const AnalysisHistorySchema: Schema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    
    // Image metadata
    originalImageName: {
        type: String,
        required: false
    },
    imageSize: {
        type: Number,
        required: false
    },
    imageType: {
        type: String,
        required: false
    },
    imagePath: {
        type: String,
        required: false
    },
    
    // Analysis results
    predictions: {
        hormonal_acne: { type: Number, min: 0, max: 1 },
        forehead_wrinkles: { type: Number, min: 0, max: 1 },
        oily_skin: { type: Number, min: 0, max: 1 },
        dry_skin: { type: Number, min: 0, max: 1 },
        normal_skin: { type: Number, min: 0, max: 1 },
        dark_spots: { type: Number, min: 0, max: 1 },
        under_eye_bags: { type: Number, min: 0, max: 1 },
        rosacea: { type: Number, min: 0, max: 1 }
    },
    
    topPrediction: {
        condition: {
            type: String,
            required: true
        },
        confidence: {
            type: Number,
            required: true,
            min: 0,
            max: 1
        }
    },
    
    // Treatment recommendation
    treatmentRecommendation: {
        condition: String,
        severity: {
            type: String,
            enum: ['mild', 'moderate', 'severe']
        },
        overview: String,
        steps: [{
            step: Number,
            title: String,
            description: String,
            products: [String],
            frequency: String,
            duration: String,
            tips: [String]
        }],
        expectedResults: String,
        warnings: [String],
        professionalAdvice: String
    },
    
    // Treatment timeline
    treatmentTimeline: {
        condition: String,
        totalDuration: String,
        phases: [{
            phase: Number,
            title: String,
            timeframe: String,
            description: String,
            expectedChanges: [String],
            skinCareAdjustments: [String],
            milestones: [String]
        }],
        maintenancePhase: {
            title: String,
            description: String,
            ongoingCare: [String]
        },
        checkupSchedule: [String]
    },
    
    personalizedNotes: [String],
    
    // User context
    userAge: {
        type: Number,
        min: 13,
        max: 120
    },
    skinType: {
        type: String,
        enum: ['oily', 'dry', 'combination', 'sensitive', 'normal']
    },
    currentProducts: [String],
    
    // Analysis metadata
    analysisType: {
        type: String,
        enum: ['face_analysis', 'comprehensive_analysis'],
        required: true
    },
    aiModel: {
        type: String,
        required: true,
        default: 'gpt-4o'
    },
    success: {
        type: Boolean,
        required: true,
        default: true
    },
    errorMessage: String,
    
    // Progress tracking
    tags: [{
        type: String,
        enum: ['improvement', 'new_condition', 'follow_up', 'baseline', 'deterioration', 'stable']
    }],
    notes: {
        type: String,
        maxlength: 1000
    }
}, {
    timestamps: true, // Automatically adds createdAt and updatedAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes for better query performance
AnalysisHistorySchema.index({ userId: 1, createdAt: -1 });
AnalysisHistorySchema.index({ 'topPrediction.condition': 1 });
AnalysisHistorySchema.index({ analysisType: 1 });
AnalysisHistorySchema.index({ success: 1 });

// Virtual for getting analysis age
AnalysisHistorySchema.virtual('analysisAge').get(function() {
    return Math.floor((Date.now() - (this as any).createdAt.getTime()) / (1000 * 60 * 60 * 24)); // Days ago
});

// Static methods
(AnalysisHistorySchema.statics as any).findByUserId = function(userId: string) {
    return this.find({ userId }).sort({ createdAt: -1 });
};

(AnalysisHistorySchema.statics as any).findRecentByUser = function(userId: string, limit: number = 10) {
    return this.find({ userId, success: true })
        .sort({ createdAt: -1 })
        .limit(limit);
};

(AnalysisHistorySchema.statics as any).findByCondition = function(userId: string, condition: string) {
    return this.find({ 
        userId, 
        'topPrediction.condition': condition,
        success: true 
    }).sort({ createdAt: -1 });
};

(AnalysisHistorySchema.statics as any).getProgressSummary = function(userId: string) {
    return this.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(userId), success: true } },
        {
            $group: {
                _id: '$topPrediction.condition',
                count: { $sum: 1 },
                averageConfidence: { 
                    $avg: { 
                        $multiply: ['$topPrediction.confidence', 100] // Convert to percentage
                    } 
                },
                lastAnalysis: { $max: '$createdAt' },
                firstAnalysis: { $min: '$createdAt' }
            }
        },
        {
            $addFields: {
                condition: '$_id',
                // Ensure averageConfidence is not NaN and is a valid number
                averageConfidence: { 
                    $cond: [
                        { $isNumber: '$averageConfidence' },
                        { $round: ['$averageConfidence', 0] },
                        0
                    ]
                },
                trend: 'stable' // Default trend
            }
        },
        { $sort: { count: -1 } }
    ]);
};

// Instance methods
(AnalysisHistorySchema.methods as any).compareWithPrevious = function() {
    return this.constructor.findOne({
        userId: this.userId,
        'topPrediction.condition': this.topPrediction.condition,
        createdAt: { $lt: this.createdAt },
        success: true
    }).sort({ createdAt: -1 });
};

(AnalysisHistorySchema.methods as any).getProgressTrend = function() {
    // Simple progress assessment based on confidence changes
    return this.compareWithPrevious().then((previous: any) => {
        if (!previous) return 'baseline';
        
        const confidenceDiff = this.topPrediction.confidence - previous.topPrediction.confidence;
        if (Math.abs(confidenceDiff) < 0.1) return 'stable';
        return confidenceDiff > 0 ? 'worsening' : 'improving';
    });
};

// Model interface for static methods
export interface AnalysisHistoryModel extends mongoose.Model<IAnalysisHistory> {
    findByUserId(userId: string): Promise<IAnalysisHistory[]>;
    findRecentByUser(userId: string, limit?: number): Promise<IAnalysisHistory[]>;
    findByCondition(userId: string, condition: string): Promise<IAnalysisHistory[]>;
    getProgressSummary(userId: string): Promise<any[]>;
}

// Export the model
export default mongoose.model<IAnalysisHistory, AnalysisHistoryModel>('AnalysisHistory', AnalysisHistorySchema); 