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

    // Detect age from facial image using OpenAI Vision
    static async detectAgeFromImage(imageBuffer: Buffer): Promise<{ success: boolean; estimatedAge?: number; confidence?: number; message: string }> {
        try {
            const openai = this.getOpenAIClient();

            // Convert buffer to base64
            const base64Image = imageBuffer.toString('base64');
            const imageUrl = `data:image/jpeg;base64,${base64Image}`;

            // System message for age detection
            const systemMessage = `You are an expert age estimation AI specializing in facial analysis.

CAPABILITIES:
- Analyze facial features to estimate chronological age
- Consider skin texture, wrinkles, facial structure, and other age indicators
- Provide confidence scores based on visual clarity and feature visibility

IMPORTANT LIMITATIONS:
- This is an estimate for informational purposes only
- Age can vary significantly based on genetics, lifestyle, and skincare
- Cannot be 100% accurate and should not be used for official purposes
- Focus on apparent age rather than exact chronological age

OUTPUT FORMAT:
Return ONLY a valid JSON object with:
{
    "estimatedAge": number (between 18-80),
    "confidence": number (0-1, where 1 is most confident),
    "ageRange": "range like '25-30'"}`;

            const userPrompt = `Analyze this facial image and estimate the person's age.

Consider these facial indicators:
- Skin texture and elasticity
- Presence and depth of wrinkles (forehead, around eyes, mouth)
- Facial structure and bone definition  
- Eye area characteristics (bags, crow's feet, lid elasticity)
- Skin tone evenness and firmness
- Overall facial maturity

Provide your best age estimate with a confidence score.
Return ONLY the JSON object with no additional text.`;

            const response = await openai.chat.completions.create({
                model: "gpt-4o",
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
                max_tokens: 200,
                temperature: 0.1, // Low temperature for consistent results
            });

            const content = response.choices[0]?.message?.content;
            if (!content) {
                throw new Error("No response from OpenAI for age detection");
            }

            // Parse the JSON response
            let ageResult: { estimatedAge: number; confidence: number; ageRange?: string };
            try {
                // Clean the response (remove any non-JSON text)
                const jsonMatch = content.match(/\{[\s\S]*\}/);
                if (!jsonMatch) {
                    throw new Error("No valid JSON found in age detection response");
                }
                ageResult = JSON.parse(jsonMatch[0]);
            } catch (parseError) {
                console.error("Failed to parse age detection response:", content);
                throw new Error("Invalid response format from age detection AI");
            }

            // Validate the response
            if (!ageResult.estimatedAge || !ageResult.confidence) {
                throw new Error("Missing required fields in age detection response");
            }

            // Clamp age to reasonable bounds
            const clampedAge = Math.max(18, Math.min(80, Math.round(ageResult.estimatedAge)));
            const clampedConfidence = Math.max(0, Math.min(1, ageResult.confidence));

            return {
                success: true,
                estimatedAge: clampedAge,
                confidence: clampedConfidence,
                message: `Age estimated successfully: ${clampedAge} years (confidence: ${Math.round(clampedConfidence * 100)}%)`
            };

        } catch (error) {
            console.error("Age detection error:", error);
            return {
                success: false,
                message: `Age detection failed: ${(error as Error).message}`
            };
        }
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
                model: "gpt-4o",
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
                "products": ["product1", "product2"],
                "frequency": "Application frequency (morning/evening/daily)",
                "duration": "Expected duration of this step",
                "tips": ["Professional tip 1", "Professional tip 2"]
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
            const completePlan = {
                condition,
                confidence,
                recommendation: treatmentPlan.recommendation,
                timeline: treatmentPlan.timeline,
                personalizedNotes: treatmentPlan.personalizedNotes || []
            };

            return {
                success: true,
                data: completePlan as any,
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
            "title": "Phase descriptive name",
            "timeframe": "Duration (e.g., Weeks 1-4)",
            "description": "What happens in this phase",
            "expectedChanges": ["Observable change 1", "Observable change 2"],
            "skinCareAdjustments": ["Routine modification 1"],
            "milestones": ["Progress indicator 1"]
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

    // OPTIMIZED: Get all analysis data in a single OpenAI call
    static async getComprehensiveAnalysisOptimized(
        imageBuffer: Buffer,
        userAge?: number,
        skinType?: string,
        currentProducts?: string[]
    ): Promise<{
        success: boolean;
        data?: CompleteTreatmentPlan;
        message: string;
    }> {
        try {
            const openai = this.getOpenAIClient();

            // Convert buffer to base64
            const base64Image = imageBuffer.toString('base64');
            const imageUrl = `data:image/jpeg;base64,${base64Image}`;

            // Comprehensive system message
            const systemMessage = `You are an expert AI dermatology assistant that provides comprehensive facial skin analysis.

CAPABILITIES:
- Skin condition analysis and identification
- Personalized treatment recommendations
- Treatment timeline planning

ANALYSIS SCOPE:
Skin conditions: hormonal_acne, forehead_wrinkles, oily_skin, dry_skin, normal_skin, dark_spots, under_eye_bags, rosacea

IMPORTANT LIMITATIONS:
- For informational purposes only
- Cannot diagnose medical conditions
- Cannot replace professional dermatological evaluation
- Focus on observable surface characteristics

OUTPUT FORMAT:
Return ONLY a valid JSON object with this exact structure:
{
    "skinAnalysis": {
        "topCondition": {
            "condition": "condition_name",
            "confidence": number
        },
        "allConditions": {
            "hormonal_acne": number,
            "forehead_wrinkles": number,
            "oily_skin": number,
            "dry_skin": number,
            "normal_skin": number,
            "dark_spots": number,
            "under_eye_bags": number,
            "rosacea": number
        }
    },
    "treatmentPlan": {
        "overview": "brief description",
        "severity": "mild|moderate|severe",
        "steps": [
            {
                "step": 1,
                "title": "Treatment step name",
                "description": "Detailed explanation and rationale",
                "products": ["product1", "product2"],
                "frequency": "Application frequency (morning/evening/daily)",
                "duration": "Expected duration of this step",
                "tips": ["Professional tip 1", "Professional tip 2"]
            }
        ],
        "timeline": {
            "phases": [
                {
                    "phase": 1,
                    "title": "Phase descriptive name",
                    "timeframe": "Duration (e.g., Weeks 1-4)",
                    "description": "What happens in this phase",
                    "expectedChanges": ["Observable change 1", "Observable change 2"],
                    "skinCareAdjustments": ["Routine modification 1"],
                    "milestones": ["Progress indicator 1"]
                }
            ],
            "totalDuration": "string",
            "keyMilestones": ["milestone1", "milestone2"]
        },
        "warnings": ["warning1", "warning2"],
        "personalizedNotes": "string"
    }
}`;

            const userPrompt = `Analyze this facial image and provide comprehensive skin analysis including:

1. SKIN CONDITION ANALYSIS:
   ANALYZE CAREFULLY FOR THESE CONDITIONS:
   - hormonal_acne: Look for inflammatory bumps, cysts, comedones (blackheads/whiteheads), typically concentrated on jawline, chin, and lower cheeks
   - forehead_wrinkles: Examine for horizontal lines, creases, or furrows across the forehead area
   - oily_skin: Check for shiny appearance, enlarged visible pores, greasy texture, especially in T-zone (forehead, nose, chin)
   - dry_skin: Look for flaky patches, rough texture, tight appearance, dull complexion, visible dry patches
   - normal_skin: Even skin tone, balanced moisture, minimal visible pores, smooth texture, healthy glow
   - dark_spots: Identify hyperpigmentation, age spots, melasma, post-acne marks, uneven pigmentation
   - under_eye_bags: Examine for puffiness, swelling, dark circles beneath the eyes
   - rosacea: Look for persistent facial redness, visible blood vessels, papules, flushing patterns

   CONFIDENCE SCORING GUIDELINES:
   - 0.8-1.0: Very obvious, clearly visible condition
   - 0.6-0.79: Moderate evidence, likely present
   - 0.4-0.59: Some signs present, mild condition
   - 0.2-0.39: Minimal evidence, questionable
   - 0.0-0.19: No clear evidence of condition

2. TREATMENT RECOMMENDATIONS:
   BASE RECOMMENDATIONS ON:
   - Primary detected condition and its severity
   - Skin type: ${skinType || 'normal'} (consider this in product recommendations)
   - Current routine: ${currentProducts?.length ? currentProducts.join(', ') : 'none specified'} (avoid conflicts)
   - Evidence-based dermatological approaches
   - Gentle, progressive treatment steps
   - Realistic timelines for improvement

   TREATMENT PLAN REQUIREMENTS:
   - Start with gentle approaches, escalate gradually
   - Include specific product types and active ingredients
   - Provide clear application instructions and frequency
   - Set realistic expectations for results timeline
   - Include important safety warnings
   - Recommend professional consultation when appropriate

ANALYSIS GUIDELINES:
- Base severity assessment on visual evidence in the image
- Be conservative with confidence scores unless condition is very obvious
- Consider lighting and image quality when making assessments
- Focus on clearly visible surface characteristics only
- Provide practical, actionable treatment recommendations
- Include both over-the-counter and professional treatment options
- Emphasize gentle approaches suitable for sensitive skin

Return ONLY the JSON object with no additional text, following the exact structure specified.`;

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
                max_tokens: 2000,
                temperature: 0.1,
            });

            const content = response.choices[0]?.message?.content;
            if (!content) {
                throw new Error("No response from OpenAI for comprehensive analysis");
            }
            console.log("content", content);
            // Parse the JSON response
            let analysisResult: any;
            try {
                // Check if OpenAI refused to analyze the image
                if (content.toLowerCase().includes("sorry") || content.toLowerCase().includes("can't analyze") || content.toLowerCase().includes("cannot analyze")) {
                    throw new Error("Image analysis declined - the image may not contain a clear face or may not be suitable for analysis");
                }

                const jsonMatch = content.match(/\{[\s\S]*\}/);
                if (!jsonMatch) {
                    console.error("OpenAI response (no JSON found):", content);
                    throw new Error("No valid JSON found in comprehensive analysis response - AI may have declined to analyze the image");
                }
                analysisResult = JSON.parse(jsonMatch[0]);
            } catch (parseError) {
                console.error("Failed to parse comprehensive analysis response:", content);
                
                // Provide more specific error messages
                if (content.toLowerCase().includes("sorry") || content.toLowerCase().includes("can't") || content.toLowerCase().includes("cannot")) {
                    throw new Error("Image analysis was declined - please ensure the image shows a clear, well-lit face");
                }
                
                throw new Error("Invalid response format from comprehensive analysis AI");
            }

            // Validate and format the response
            if (!analysisResult.skinAnalysis || !analysisResult.treatmentPlan) {
                throw new Error("Missing required sections in comprehensive analysis response");
            }

            // Format the response to match our expected structure
            const formattedResult: CompleteTreatmentPlan = {
                analysis: {
                    success: true,
                    message: "Face analysis completed successfully",
                    predictions: analysisResult.skinAnalysis.allConditions,
                    topPrediction: analysisResult.skinAnalysis.topCondition,
                    allPredictions: this.formatConditionsToArray(analysisResult.skinAnalysis.allConditions)
                },
                treatment: {
                    success: true,
                    message: "Treatment recommendation generated successfully",
                    recommendation: {
                        condition: analysisResult.skinAnalysis.topCondition.condition,
                        confidence: analysisResult.skinAnalysis.topCondition.confidence,
                        severity: analysisResult.treatmentPlan.severity,
                        overview: analysisResult.treatmentPlan.overview,
                        steps: analysisResult.treatmentPlan.steps,
                        expectedResults: analysisResult.treatmentPlan.expectedResults || "Results may vary based on individual skin response",
                        warnings: analysisResult.treatmentPlan.warnings,
                        professionalAdvice: analysisResult.treatmentPlan.professionalAdvice || "Consult a dermatologist for severe conditions",
                        personalizedNotes: analysisResult.treatmentPlan.personalizedNotes
                    },
                    timeline: {
                        success: true,
                        timeline: analysisResult.treatmentPlan.timeline
                    }
                },
                ageDetection: {
                    success: false,
                    message: "Age detection not available in optimized comprehensive analysis"
                }
            };

            return {
                success: true,
                data: formattedResult,
                message: "Comprehensive analysis completed successfully"
            };

        } catch (error) {
            console.error("Comprehensive analysis error:", error);
            return {
                success: false,
                message: `Comprehensive analysis failed: ${(error as Error).message}`
            };
        }
    }

    // Helper method to format conditions object to array
    private static formatConditionsToArray(conditions: Record<string, number>): FormattedPrediction[] {
        return Object.entries(conditions)
            .map(([condition, confidence]) => ({
                condition,
                confidence,
                percentage: `${Math.round(confidence * 100)}%`
            }))
            .sort((a, b) => b.confidence - a.confidence);
    }
} 