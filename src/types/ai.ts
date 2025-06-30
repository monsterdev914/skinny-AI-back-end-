// Coordinate types for feature detection
export interface Coordinate {
    x: number;
    y: number;
}

export interface BoundingBox {
    x: number;
    y: number;
    width: number;
    height: number;
}

// Enhanced detected feature interface for comprehensive skin analysis
export interface DetectedFeature {
    condition: string;
    confidence: number;
    coordinates?: Coordinate[];
    boundingBox?: BoundingBox;
    area?: number; // percentage of affected area
    severity?: 'mild' | 'moderate' | 'severe';
    bodyRegion?: 'face' | 'arm' | 'hand' | 'leg' | 'torso' | 'neck' | 'etc';
    description?: string;
    distinctiveCharacteristics?: string;
    coordinateVerification?: {
        isOnSkin: boolean;
        isNotOnClothing: boolean;
        isMostDistinctive: boolean;
        skinAreaDescription: string;
    };
}

// Comprehensive skin condition prediction interface (expanded from face-only)
export interface SkinConditionPrediction {
    [condition: string]: number; // condition name -> confidence score
}

// Keep legacy interface for backward compatibility
export interface FaceConditionPrediction extends SkinConditionPrediction {}

// Enhanced image metadata for comprehensive skin analysis
export interface ImageMetadata {
    width: number;
    height: number;
    format: string;
    aspectRatio?: number;
    skinCoverage?: {
        totalSkinAreaPercentage: number;
        visibleSkinRegions: string[];
        description: string;
    };
    analyzedRegion?: {
        x: number;
        y: number;
        width: number;
        height: number;
        description: string;
    };
}

// Enhanced analysis result interface for comprehensive skin analysis
export interface SkinAnalysisResult {
    success: boolean;
    predictions: SkinConditionPrediction;
    topPrediction: {
        condition: string;
        confidence: number;
    };
    allPredictions?: FormattedPrediction[];
    detectedFeatures?: DetectedFeature[]; // Enhanced spatial feature detection with body regions
    imageMetadata?: ImageMetadata; // Enhanced image metadata with skin coverage
    message: string;
}

// Legacy face analysis result interface (for backward compatibility)
export interface FaceAnalysisResult extends SkinAnalysisResult {
    predictions: FaceConditionPrediction;
}

export interface FaceAnalysisRequest {
    image: Buffer | File;
}

export interface FormattedPrediction {
    condition: string;
    confidence: number;
    percentage: string;
}

// Treatment recommendation types
export interface TreatmentStep {
    step: number;
    title: string;
    description: string;
    products?: string[];
    frequency: string;
    duration: string;
    tips: string[];
}

export interface TreatmentRecommendation {
    condition: string;
    confidence: number;
    severity: 'mild' | 'moderate' | 'severe';
    overview: string;
    steps: TreatmentStep[];
    expectedResults: string;
    warnings: string[];
    professionalAdvice: string;
    personalizedNotes?: string;
}

// Treatment timeline types
export interface TimelinePhase {
    phase: number;
    title: string;
    timeframe: string;
    description: string;
    expectedChanges: string[];
    skinCareAdjustments?: string[];
    milestones: string[];
}

export interface TreatmentTimeline {
    condition: string;
    totalDuration: string;
    phases: TimelinePhase[];
    maintenancePhase: {
        title: string;
        description: string;
        ongoingCare: string[];
    };
    checkupSchedule: string[];
}

// Age detection types
export interface AgeDetectionResult {
    success: boolean;
    estimatedAge?: number;
    confidence?: number;
    ageRange?: string;
    message: string;
}

// Enhanced complete treatment plan for comprehensive skin analysis
export interface CompleteTreatmentPlan {
    analysis: SkinAnalysisResult; // Updated to use comprehensive skin analysis
    treatment: {
        success: boolean;
        message: string;
        recommendation: TreatmentRecommendation;
        timeline: {
            success: boolean;
            timeline: TreatmentTimeline;
        };
    };
    ageDetection: AgeDetectionResult;
}

// API Response types
export interface TreatmentRecommendationResponse {
    success: boolean;
    data?: CompleteTreatmentPlan;
    message: string;
} 