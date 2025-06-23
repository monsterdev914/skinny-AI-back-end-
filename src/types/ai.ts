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
    severity: 'mild' | 'moderate' | 'severe';
    overview: string;
    steps: TreatmentStep[];
    expectedResults: string;
    warnings: string[];
    professionalAdvice: string;
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

// Combined treatment response
export interface CompleteTreatmentPlan {
    condition: string;
    confidence: number;
    recommendation: TreatmentRecommendation;
    timeline: TreatmentTimeline;
    personalizedNotes: string[];
}

// API Response types
export interface TreatmentRecommendationResponse {
    success: boolean;
    data?: CompleteTreatmentPlan;
    message: string;
} 