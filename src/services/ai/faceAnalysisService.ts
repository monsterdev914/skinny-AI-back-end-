import OpenAI from 'openai';
import { 
    FaceConditionPrediction, 
    FaceAnalysisResult, 
    FormattedPrediction,
    TreatmentTimeline,
    CompleteTreatmentPlan,
    TreatmentRecommendationResponse
} from "../../types/ai";

export class FaceAnalysisService {
    private static openai: OpenAI | null = null;

    // Initialize OpenAI client
    private static getOpenAIClient(): OpenAI {
        if (!this.openai) {
            this.openai = new OpenAI({
                apiKey: (process.env as any).OPENAI_API_KEY,
            });
        }
        return this.openai;
    }

    // Analyze face condition using OpenAI Vision
    static async analyzeFaceCondition(imageBuffer: Buffer): Promise<FaceAnalysisResult> {
        try {
            const openai = this.getOpenAIClient();

            // Convert buffer to base64
            const base64Image = imageBuffer.toString('base64');
            const imageUrl = `data:image/jpeg;base64,${base64Image}`;

            // Enhanced system message for face analysis
            const systemMessage = `You are an AI dermatology assistant specializing in facial skin analysis. 

CAPABILITIES:
- Analyze facial skin images for common conditions
- Provide confidence scores based on visual evidence
- Focus on observable surface-level skin characteristics

ANALYSIS SCOPE:
You can identify these conditions: hormonal_acne, forehead_wrinkles, oily_skin, dry_skin, normal_skin, dark_spots, under_eye_bags, rosacea

IMPORTANT LIMITATIONS:
- This is for informational purposes only
- Cannot diagnose medical conditions
- Cannot replace professional dermatological evaluation
- Focus only on clearly visible surface characteristics

OUTPUT FORMAT:
Return ONLY a valid JSON object with confidence scores (0-1) for each condition based on visual evidence.
Example: {"oily_skin": 0.8, "hormonal_acne": 0.2, "normal_skin": 0.1}`;

            // User prompt for analysis
            const userPrompt = `Analyze this facial skin image and identify visible skin characteristics.

Look for evidence of these specific conditions:
- hormonal_acne: Inflammatory bumps, comedones, typically on jawline/chin
- forehead_wrinkles: Horizontal lines or creases on forehead
- oily_skin: Shiny appearance, enlarged pores, greasy texture
- dry_skin: Flaky, rough, or tight-looking skin texture
- normal_skin: Even tone, balanced moisture, minimal imperfections
- dark_spots: Hyperpigmentation, age spots, melasma
- under_eye_bags: Puffiness, swelling beneath the eyes
- rosacea: Facial redness, visible blood vessels, inflammatory papules

Provide confidence scores (0-1) based on visible evidence in the image.
Return ONLY the JSON object with no additional text.`;

            const response = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "system",
                        content: systemMessage
                    },
                    {
                        role: "user",
                        content: [
                            { type: "text", text: userPrompt },
                            { type: "image_url", image_url: { url: imageUrl } }
                        ]
                    }
                ],
                max_tokens: 300,
                temperature: 0.1, // Low temperature for consistent results
            });

            const content = response.choices[0]?.message?.content;
            if (!content) {
                throw new Error("No response from OpenAI");
            }

            // Parse the JSON response
            let predictions: FaceConditionPrediction;
            try {
                // Clean the response (remove any non-JSON text)
                const jsonMatch = content.match(/\{[\s\S]*\}/);
                if (!jsonMatch) {
                    throw new Error("No valid JSON found in response");
                }
                predictions = JSON.parse(jsonMatch[0]);
            } catch (parseError) {
                console.error("Failed to parse OpenAI response:", content);
                throw new Error("Invalid response format from AI");
            }

            // Normalize predictions to ensure they sum to 1 (optional)
            const total = Object.values(predictions).reduce((sum, val) => sum + val, 0);
            if (total > 0) {
                Object.keys(predictions).forEach(key => {
                    (predictions as any)[key] = (predictions as any)[key] / total;
                });
            }

            // Find the top prediction
            const topPrediction = this.getTopPrediction(predictions);

            return {
                success: true,
                predictions,
                topPrediction,
                message: "Face analysis completed successfully using OpenAI"
            };

        } catch (error) {
            console.error("OpenAI face analysis error:", error);
            return {
                success: false,
                predictions: {},
                topPrediction: { condition: "unknown", confidence: 0 },
                message: `Analysis failed: ${(error as Error).message}`
            };
        }
    }

    // Generate treatment recommendations based on condition
    static async generateTreatmentRecommendation(
        condition: string, 
        confidence: number,
        userAge?: number,
        skinType?: string,
        currentProducts?: string[]
    ): Promise<TreatmentRecommendationResponse> {
        try {
            const openai = this.getOpenAIClient();

            // Determine severity based on confidence level
            let severity: 'mild' | 'moderate' | 'severe' = 'mild';
            if (confidence > 0.7) severity = 'severe';
            else if (confidence > 0.4) severity = 'moderate';

            // Enhanced system message for treatment recommendations
            const systemMessage = `You are an expert skincare consultant with extensive knowledge in dermatology and cosmetic science.

EXPERTISE:
- Evidence-based skincare recommendations
- Product formulation and ingredient science
- Skin physiology and condition management
- Safety protocols and contraindications

APPROACH:
- Prioritize gentle, proven treatments
- Consider user's age, skin type, and current routine
- Provide gradual progression plans
- Emphasize safety and professional consultation when needed

SAFETY GUIDELINES:
- Always recommend patch testing new products
- Include warnings for sensitive ingredients
- Advise dermatologist consultation for severe conditions
- Stress importance of SPF and sun protection

OUTPUT REQUIREMENTS:
- Comprehensive but practical treatment plans
- Specific product categories and ingredients
- Realistic timelines and expectations
- Clear safety warnings and professional advice
- Valid JSON format only`;

            // Create personalized prompt
            const userPrompt = `Create a comprehensive treatment plan for ${condition} with ${severity} severity (confidence: ${confidence}).

USER PROFILE:
- Age: ${userAge || 'Not specified'}
- Skin type: ${skinType || 'Not specified'}
- Current products: ${currentProducts?.join(', ') || 'None specified'}

REQUIRED JSON STRUCTURE:
{
    "recommendation": {
        "condition": "${condition}",
        "severity": "${severity}",
        "overview": "Professional overview of condition and treatment approach",
        "steps": [
            {
                "step": 1,
                "title": "Treatment step name",
                "description": "Detailed explanation and rationale",
                "products": ["Specific product type/ingredient", "Alternative option"],
                "frequency": "Application frequency (morning/evening/daily)",
                "duration": "Expected duration of this step",
                "tips": ["Professional application tip", "Additional guidance"]
            }
        ],
        "expectedResults": "Realistic timeline and expected improvements",
        "warnings": ["Safety warnings", "When to discontinue", "Contraindications"],
        "professionalAdvice": "When to seek dermatologist consultation"
    },
    "timeline": {
        "condition": "${condition}",
        "totalDuration": "Complete treatment duration",
        "phases": [
            {
                "phase": 1,
                "title": "Phase name",
                "timeframe": "Duration (e.g., Weeks 1-4)",
                "description": "What happens in this phase",
                "expectedChanges": ["Observable change 1", "Observable change 2"],
                "skinCareAdjustments": ["Routine modifications"],
                "milestones": ["Progress indicators to watch for"]
            }
        ],
        "maintenancePhase": {
            "title": "Long-term Maintenance",
            "description": "Ongoing care strategy",
            "ongoingCare": ["Maintenance step 1", "Maintenance step 2"]
        },
        "checkupSchedule": ["Progress check timeline"]
    },
    "personalizedNotes": ["Personalized advice based on user profile"]
}

Make recommendations evidence-based, safe, and tailored to the user's profile.`;

            const response = await openai.chat.completions.create({
                model: "gpt-4o",
                messages: [
                    {
                        role: "system",
                        content: systemMessage
                    },
                    {
                        role: "user",
                        content: userPrompt
                    }
                ],
                max_tokens: 2500,
                temperature: 0.2,
            });

            const content = response.choices[0]?.message?.content;
            if (!content) {
                throw new Error("No response from OpenAI");
            }

            // Parse the JSON response
            let treatmentPlan: any;
            try {
                const jsonMatch = content.match(/\{[\s\S]*\}/);
                if (!jsonMatch) {
                    throw new Error("No valid JSON found in response");
                }
                treatmentPlan = JSON.parse(jsonMatch[0]);
            } catch (parseError) {
                console.error("Failed to parse treatment recommendation:", content);
                throw new Error("Invalid treatment plan format");
            }

            // Structure the complete treatment plan
            const completePlan: CompleteTreatmentPlan = {
                condition,
                confidence,
                recommendation: treatmentPlan.recommendation,
                timeline: treatmentPlan.timeline,
                personalizedNotes: treatmentPlan.personalizedNotes || []
            };

            return {
                success: true,
                data: completePlan,
                message: "Treatment recommendation generated successfully"
            };

        } catch (error) {
            console.error("Treatment recommendation error:", error);
            return {
                success: false,
                message: `Failed to generate treatment plan: ${(error as Error).message}`
            };
        }
    }

    // Get treatment timeline for a specific condition
    static async getTreatmentTimeline(
        condition: string,
        severity: 'mild' | 'moderate' | 'severe' = 'moderate'
    ): Promise<{ success: boolean; timeline?: TreatmentTimeline; message: string }> {
        try {
            const openai = this.getOpenAIClient();

            // Enhanced system message for timelines
            const systemMessage = `You are a dermatology treatment specialist creating evidence-based treatment timelines.

EXPERTISE:
- Clinical experience in skin condition management
- Understanding of treatment progression and healing processes
- Knowledge of realistic improvement timelines
- Awareness of individual variation in treatment response

PRINCIPLES:
- Base timelines on clinical evidence and research
- Account for individual variation in response
- Include realistic expectations and milestones
- Emphasize patience and consistency
- Highlight when to seek professional help

TIMELINE ACCURACY:
- Use established dermatological treatment protocols
- Consider severity levels and typical response patterns
- Include both optimistic and conservative estimates
- Factor in maintenance requirements`;

            const userPrompt = `Create a detailed, evidence-based treatment timeline for ${condition} with ${severity} severity.

REQUIREMENTS:
- Realistic phase-based progression
- Clear milestones and expectations
- Professional maintenance guidelines
- Appropriate check-in schedules

JSON STRUCTURE:
{
    "condition": "${condition}",
    "totalDuration": "Complete treatment duration with range",
    "phases": [
        {
            "phase": 1,
            "title": "Descriptive phase name",
            "timeframe": "Specific time period (e.g., Weeks 1-4)",
            "description": "What happens during this phase",
            "expectedChanges": ["Realistic observable change", "Secondary improvement"],
            "skinCareAdjustments": ["Routine modifications for this phase"],
            "milestones": ["Key progress indicators", "Success markers"]
        }
    ],
    "maintenancePhase": {
        "title": "Long-term Maintenance Strategy",
        "description": "Ongoing care requirements and expectations",
        "ongoingCare": ["Maintenance routine element", "Prevention strategy"]
    },
    "checkupSchedule": ["Professional consultation timeline", "Progress evaluation points"]
}

Ensure timelines are realistic, evidence-based, and include appropriate professional consultation recommendations.`;

            const response = await openai.chat.completions.create({
                model: "gpt-4o",
                messages: [
                    {
                        role: "system",
                        content: systemMessage
                    },
                    {
                        role: "user",
                        content: userPrompt
                    }
                ],
                max_tokens: 1200,
                temperature: 0.2,
            });

            const content = response.choices[0]?.message?.content;
            if (!content) {
                throw new Error("No response from OpenAI");
            }

            let timeline: TreatmentTimeline;
            try {
                const jsonMatch = content.match(/\{[\s\S]*\}/);
                if (!jsonMatch) {
                    throw new Error("No valid JSON found in response");
                }
                timeline = JSON.parse(jsonMatch[0]);
            } catch (parseError) {
                console.error("Failed to parse timeline:", content);
                throw new Error("Invalid timeline format");
            }

            return {
                success: true,
                timeline,
                message: "Treatment timeline generated successfully"
            };

        } catch (error) {
            console.error("Timeline generation error:", error);
            return {
                success: false,
                message: `Failed to generate timeline: ${(error as Error).message}`
            };
        }
    }

    // Get the highest confidence prediction
    private static getTopPrediction(predictions: FaceConditionPrediction): { condition: string; confidence: number } {
        const entries = Object.entries(predictions);
        if (entries.length === 0) {
            return { condition: "unknown", confidence: 0 };
        }

        const [condition, confidence] = entries.reduce((max, current) => 
            current[1] > max[1] ? current : max
        );

        return { condition, confidence };
    }

    // Get formatted results for display
    static formatResults(predictions: FaceConditionPrediction, topN: number = 3): FormattedPrediction[] {
        return Object.entries(predictions)
            .sort(([,a], [,b]) => b - a)
            .slice(0, topN)
            .map(([condition, confidence]) => ({
                condition,
                confidence,
                percentage: `${(confidence * 100).toFixed(1)}%`
            }));
    }

    // Health check for OpenAI service
    static async healthCheck(): Promise<boolean> {
        try {
            const openai = this.getOpenAIClient();
            
            // Test with a simple request
            await openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [{ role: "user", content: "Hello" }],
                max_tokens: 5
            });
            
            return true;
        } catch (error) {
            console.error("OpenAI health check failed:", error);
            return false;
        }
    }

    // Method to switch to Gradio later (placeholder)
    static async switchToGradio(): Promise<void> {
        // TODO: Implement Gradio connection logic
        console.log("Switching to Gradio implementation...");
        // This is where you'll add the Gradio client code later
    }
} 