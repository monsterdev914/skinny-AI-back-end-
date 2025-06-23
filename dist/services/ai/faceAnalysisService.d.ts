import { FaceConditionPrediction, FaceAnalysisResult, FormattedPrediction, TreatmentTimeline, TreatmentRecommendationResponse } from "../../types/ai";
export declare class FaceAnalysisService {
    private static openai;
    private static getOpenAIClient;
    static analyzeFaceCondition(imageBuffer: Buffer): Promise<FaceAnalysisResult>;
    static generateTreatmentRecommendation(condition: string, confidence: number, userAge?: number, skinType?: string, currentProducts?: string[]): Promise<TreatmentRecommendationResponse>;
    static getTreatmentTimeline(condition: string, severity?: 'mild' | 'moderate' | 'severe'): Promise<{
        success: boolean;
        timeline?: TreatmentTimeline;
        message: string;
    }>;
    private static getTopPrediction;
    static formatResults(predictions: FaceConditionPrediction, topN?: number): FormattedPrediction[];
    static healthCheck(): Promise<boolean>;
    static switchToGradio(): Promise<void>;
}
//# sourceMappingURL=faceAnalysisService.d.ts.map