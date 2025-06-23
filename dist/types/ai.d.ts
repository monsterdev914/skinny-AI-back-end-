export interface FaceConditionPrediction {
    [condition: string]: number;
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
export interface CompleteTreatmentPlan {
    condition: string;
    confidence: number;
    recommendation: TreatmentRecommendation;
    timeline: TreatmentTimeline;
    personalizedNotes: string[];
}
export interface TreatmentRecommendationResponse {
    success: boolean;
    data?: CompleteTreatmentPlan;
    message: string;
}
//# sourceMappingURL=ai.d.ts.map