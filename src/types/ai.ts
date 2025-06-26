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

export interface DetectedFeature {
    condition: string;
    confidence: number;
    coordinates?: Coordinate[];
    boundingBox?: BoundingBox;
    area?: number; // percentage of affected area
    severity?: 'mild' | 'moderate' | 'severe';
    description?: string;
}

export interface FaceConditionPrediction {
    [condition: string]: number; // condition name -> confidence score
}

export interface FaceAnalysisResult {
    success: boolean;
    predictions: FaceConditionPrediction;
    topPrediction: {
        condition: string;
        confidence: number;
    };
    allPredictions?: FormattedPrediction[];
    detectedFeatures?: DetectedFeature[]; // New: spatial feature detection
    imageMetadata?: {
        width: number;
        height: number;
        format: string;
    };
    message: string;
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

// Combined treatment response
export interface CompleteTreatmentPlan {
    analysis: FaceAnalysisResult;
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