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

    // Validate if image contains face/skin area suitable for analysis
    static async validateSkinArea(imageBuffer: Buffer): Promise<{
        success: boolean;
        hasFace: boolean;
        skinAreaDetected: boolean;
        faceRegion?: {
            x: number;
            y: number;
            width: number;
            height: number;
        };
        message: string;
    }> {
        try {
            const openai = this.getOpenAIClient();

            // Convert buffer to base64
            const base64Image = imageBuffer.toString('base64');
            const imageUrl = `data:image/jpeg;base64,${base64Image}`;

            const systemMessage = `You are an expert image analysis AI specializing in facial and skin detection.

CAPABILITIES:
- Detect presence of human faces in images
- Identify skin areas suitable for dermatological analysis
- Determine image quality and suitability for skin analysis
- Provide face region coordinates when detected

ANALYSIS REQUIREMENTS:
- Face must be clearly visible and well-lit
- Skin areas must be in focus and not heavily obscured
- Image quality must be sufficient for detailed analysis
- Face should occupy reasonable portion of image

OUTPUT FORMAT:
Return ONLY a valid JSON object with:
{
    "hasFace": boolean,
    "skinAreaDetected": boolean,
    "imageQuality": "excellent|good|fair|poor",
    "faceRegion": {
        "x": normalized_x_0_to_1,
        "y": normalized_y_0_to_1,
        "width": normalized_width_0_to_1,
        "height": normalized_height_0_to_1
    },
    "skinVisibility": {
        "forehead": boolean,
        "cheeks": boolean,
        "chin": boolean,
        "eyeArea": boolean
    },
    "analysisRecommendation": "proceed|retake|insufficient",
    "issues": ["issue1", "issue2"] // if any problems detected
}`;

            const userPrompt = `Analyze this image to determine if it contains a suitable face/skin area for dermatological analysis.

Check for:
1. FACE DETECTION:
   - Is there a clear human face visible?
   - Is the face the main subject of the image?
   - Is the face orientation suitable (front-facing or slight angle)?

2. SKIN VISIBILITY:
   - Are key facial skin areas visible (forehead, cheeks, chin)?
   - Is the skin well-lit and in focus?
   - Are there any major obstructions (hands, hair, accessories)?

3. IMAGE QUALITY:
   - Is the image resolution adequate for analysis?
   - Is the lighting sufficient to see skin details?
   - Is the image clear (not blurry or pixelated)?

4. ANALYSIS SUITABILITY:
   - Would this image provide reliable results for skin condition analysis?
   - Are there any factors that would interfere with accurate analysis?

If a face is detected, provide the normalized coordinates (0-1 scale) of the face region.

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
                max_tokens: 400,
                temperature: 0.1,
            });

            const content = response.choices[0]?.message?.content;
            if (!content) {
                throw new Error("No response from OpenAI for skin area validation");
            }

            // Parse the JSON response
            let validationResult: any;
            try {
                const jsonMatch = content.match(/\{[\s\S]*\}/);
                if (!jsonMatch) {
                    throw new Error("No valid JSON found in skin validation response");
                }
                validationResult = JSON.parse(jsonMatch[0]);
            } catch (parseError) {
                console.error("Failed to parse skin validation response:", content);
                throw new Error("Invalid response format from skin validation AI");
            }

            // Validate the response structure
            if (typeof validationResult.hasFace !== 'boolean' || typeof validationResult.skinAreaDetected !== 'boolean') {
                throw new Error("Invalid validation response structure");
            }

            return {
                success: true,
                hasFace: validationResult.hasFace,
                skinAreaDetected: validationResult.skinAreaDetected,
                faceRegion: validationResult.faceRegion,
                message: validationResult.analysisRecommendation === 'proceed' 
                    ? "Image is suitable for skin analysis"
                    : `Image validation issues: ${validationResult.issues?.join(', ') || 'Unknown issues'}`
            };

        } catch (error) {
            console.error("Skin area validation error:", error);
            return {
                success: false,
                hasFace: false,
                skinAreaDetected: false,
                message: `Skin area validation failed: ${(error as Error).message}`
            };
        }
    }

    // OPTIMIZED: Get all analysis data in a single OpenAI call with skin area validation
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
            // STEP 1: Validate skin area first
            console.log("Step 1: Validating skin area in image...");
            const skinValidation = await this.validateSkinArea(imageBuffer);
            
            if (!skinValidation.success) {
                return {
                    success: false,
                    message: `Image validation failed: ${skinValidation.message}`
                };
            }

            if (!skinValidation.hasFace || !skinValidation.skinAreaDetected) {
                return {
                    success: false,
                    message: `Unable to proceed with analysis: ${
                        !skinValidation.hasFace 
                            ? "No clear face detected in the image" 
                            : "Insufficient skin area visible for analysis"
                    }. Please ensure the image shows a clear, well-lit face with visible skin areas.`
                };
            }

            console.log("✅ Skin area validation passed - proceeding with detailed analysis");

            // STEP 2: Proceed with comprehensive analysis
            const openai = this.getOpenAIClient();

            // Convert buffer to base64
            const base64Image = imageBuffer.toString('base64');
            const imageUrl = `data:image/jpeg;base64,${base64Image}`;

            // Comprehensive system message with coordinate detection
            const systemMessage = `You are an expert AI dermatology assistant that provides comprehensive facial skin analysis with spatial feature detection.

CAPABILITIES:
- Skin condition analysis and identification with precise coordinate mapping
- Spatial feature detection and localization within the validated face region
- Personalized treatment recommendations
- Treatment timeline planning

ANALYSIS SCOPE:
Skin conditions: hormonal_acne, forehead_wrinkles, oily_skin, dry_skin, normal_skin, dark_spots, under_eye_bags, rosacea

IMPORTANT - ANALYSIS FOCUS AREA:
${skinValidation.faceRegion ? 
`VALIDATED FACE REGION DETECTED:
- Face region coordinates: x=${skinValidation.faceRegion.x.toFixed(3)}, y=${skinValidation.faceRegion.y.toFixed(3)}, width=${skinValidation.faceRegion.width.toFixed(3)}, height=${skinValidation.faceRegion.height.toFixed(3)}
- FOCUS YOUR ANALYSIS ONLY ON THIS VALIDATED FACE AREA
- All coordinate detection should be relative to the FULL IMAGE dimensions but concentrate on features within this face region
- Ignore areas outside the validated face region for skin condition analysis` 
: 'FOCUS ON THE MAIN FACIAL AREA - analyze only the clear face region visible in the image'}

COORDINATE DETECTION:
- Analyze the image dimensions and provide relative coordinates (0-1 scale) for the FULL IMAGE
- Identify specific locations of skin conditions WITHIN THE VALIDATED FACE REGION
- All coordinates should be normalized to the full image (0-1 scale) but features should be from the face area only
- Calculate affected area percentages relative to the face region
- CRITICAL FOR FOREHEAD WRINKLES: Place coordinates on the exposed skin between eyebrows and hairline, NEVER on hair areas
- Ensure all coordinates are on visible skin surface, not on hair, scalp, or hairline areas

IMPORTANT LIMITATIONS:
- For informational purposes only
- Cannot diagnose medical conditions
- Cannot replace professional dermatological evaluation
- Focus on observable surface characteristics WITHIN THE VALIDATED FACE AREA

OUTPUT FORMAT:
Return ONLY a valid JSON object with this exact structure:
{
    "imageMetadata": {
        "width": estimated_width_pixels,
        "height": estimated_height_pixels,
        "aspectRatio": width/height,
        "analyzedRegion": {
            "x": face_region_x,
            "y": face_region_y,
            "width": face_region_width,
            "height": face_region_height,
            "description": "Face region that was analyzed"
        }
    },
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
        },
        "detectedFeatures": [
            {
                "condition": "condition_name",
                "confidence": number,
                "coordinates": [
                    {"x": normalized_x_within_face_region_0_to_1, "y": normalized_y_within_face_region_0_to_1}
                ],
                "area": percentage_of_affected_area_within_face,
                "severity": "mild|moderate|severe",
                "description": "detailed description of the detected feature within the face region",
                "coordinateVerification": {
                    "isOnSkin": true,
                    "isNotOnHair": true,
                    "isWithinFaceRegion": true,
                    "skinAreaDescription": "description of the exact skin area where coordinate is placed"
                }
            }
        ]
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

            const userPrompt = `FOLLOW THIS EXACT 3-STEP ANALYSIS PROCESS:

STEP 1: SKIN AREA VERIFICATION AND MAPPING
First, verify that this image contains suitable skin areas for analysis:

SKIN AREA IDENTIFICATION AND VALIDATION:
1. Examine the entire image to identify all exposed skin areas
2. Map the forehead skin area - the smooth surface between eyebrows and hairline
3. Identify cheek areas - smooth skin on the sides of the face
4. Map the nose area - the central facial skin area
5. Locate chin and jawline skin areas
6. Verify these areas are well-lit, in focus, and suitable for analysis

EXCLUSION MAPPING (CRITICAL):
1. Identify and exclude ALL hair areas (scalp, hairline, hair strands)
2. Exclude eyebrow areas from skin analysis
3. Exclude shadows, clothing, accessories, or obstructed areas
4. Create a precise map of ONLY the exposed, analyzable skin surfaces
5. Confirm skin areas are free from obstructions and clearly visible

STEP 2: COMPREHENSIVE SKIN FEATURE ANALYSIS
Analyze ONLY the verified skin areas from Step 1 for skin conditions:

${skinValidation.faceRegion ? 
   `VALIDATED FACE REGION BOUNDARIES:
   - X: ${skinValidation.faceRegion.x.toFixed(3)} (${Math.round(skinValidation.faceRegion.x * 100)}% from left)
   - Y: ${skinValidation.faceRegion.y.toFixed(3)} (${Math.round(skinValidation.faceRegion.y * 100)}% from top)  
   - Width: ${skinValidation.faceRegion.width.toFixed(3)} (${Math.round(skinValidation.faceRegion.width * 100)}% of image width)
   - Height: ${skinValidation.faceRegion.height.toFixed(3)} (${Math.round(skinValidation.faceRegion.height * 100)}% of image height)
   
   ANALYZE ONLY SKIN AREAS WITHIN THESE BOUNDARIES. Completely exclude hair, eyebrows, and non-skin areas.` 
   : 'Focus your analysis on exposed skin areas within the main facial region visible in the image.'}

SKIN FEATURE DETECTION AND ANALYSIS:
Within the verified skin areas from Step 1, systematically analyze for these conditions:

FOR EACH SKIN AREA, EXAMINE:
- Forehead skin: Look for wrinkles, lines, texture changes, oiliness, dryness
- Cheek areas: Look for acne, rosacea, dark spots, texture, oiliness
- Nose area: Look for blackheads, oiliness, redness, texture
- Chin/jawline: Look for acne, texture changes, oiliness
- Under-eye area: Look for bags, puffiness, dark circles

FEATURE ANALYSIS PROTOCOL:
1. Scan each verified skin area systematically
2. Identify ALL instances of each skin condition within skin boundaries
3. Assess the severity and distribution pattern of each condition
4. Note areas where conditions are most concentrated or severe
5. Prepare for Step 3 coordinate placement based on density analysis

STEP 3: CHARACTERISTIC POINT IDENTIFICATION
For each detected feature, find the single most characteristic point with highest density:

CRITICAL COORDINATE SYSTEM:
- All coordinates must be normalized (0.0 to 1.0) relative to the ANALYZED FACE REGION, NOT the full image
- Think of the face region as a separate coordinate system where:
  - (0.0, 0.0) = top-left corner of the face region
  - (1.0, 1.0) = bottom-right corner of the face region
  - (0.5, 0.5) = center of the face region
- Example: If you detect a forehead wrinkle in the upper-center of the face region, use coordinates like (0.5, 0.2)
- All coordinates should describe positions WITHIN the face boundaries using this 0-1 face-relative system
   
CHARACTERISTIC POINT IDENTIFICATION PROTOCOL:
For each condition detected in Step 2, apply this density-based coordinate selection:

FOREHEAD_WRINKLES:
1. Review the mapped forehead skin area from Step 1
2. Analyze ALL wrinkle patterns within this skin area only
3. Identify zones where wrinkle density is highest
4. Find the EPICENTER where multiple wrinkles converge or are most pronounced
5. Mark the CENTER POINT of the highest density wrinkle zone on exposed skin
6. Ensure coordinate is well within skin boundaries, away from hair/hairline

HORMONAL_ACNE:
1. Review all mapped skin areas from Step 1 for acne presence
2. Identify ALL acne lesions (bumps, cysts, comedones) within skin boundaries
3. Find areas where acne lesions are most concentrated/clustered
4. Mark the CENTER POINT of the highest density acne cluster
5. Ensure coordinate represents the most characteristic acne concentration
   
OILY_SKIN:
1. Review all mapped skin areas from Step 1 for oiliness indicators
2. Look for shine, enlarged pores, greasy texture within skin boundaries
3. Identify zones with highest concentration of oil/shine
4. Mark the CENTER POINT of the most oily/shiny skin zone
5. Focus on areas like T-zone (forehead, nose) or cheeks where oil is most concentrated

DRY_SKIN:
1. Review all mapped skin areas from Step 1 for dryness indicators
2. Look for flaky patches, rough texture, tight appearance within skin boundaries
3. Identify zones with highest concentration of dryness/flakiness
4. Mark the CENTER POINT of the most severely dry skin zone
5. Ensure coordinate represents the most characteristic dry skin area

DARK_SPOTS:
1. Review all mapped skin areas from Step 1 for pigmentation
2. Identify hyperpigmentation, age spots, melasma within skin boundaries
3. Find zones with highest concentration of dark spots/pigmentation
4. Mark the CENTER POINT of the most densely pigmented zone
5. Focus on areas where dark spots cluster or are most pronounced

UNDER_EYE_BAGS:
1. Review the under-eye skin area mapped in Step 1
2. Examine for puffiness, swelling, dark circles within this skin area
3. Identify the zone with most pronounced bag/puffiness concentration
4. Mark the CENTER POINT of the most severe under-eye bag area
5. Ensure coordinate represents the most characteristic point of the condition

ROSACEA:
1. Review all mapped facial skin areas from Step 1 for redness
2. Look for persistent redness, visible blood vessels within skin boundaries
3. Identify zones with highest concentration of redness/inflammation
4. Mark the CENTER POINT of the most intensely red/inflamed zone
5. Focus on typical rosacea areas (cheeks, nose, chin) where redness is most concentrated

   SKIN AREA BOUNDARIES TO FOCUS ON:
   - Forehead: ONLY the exposed skin area between eyebrows and hairline (exclude hair)
   - Cheeks: The clear skin area on both sides of the face
   - Nose: The entire nose area and surrounding skin
   - Chin and jawline: The exposed skin area

FINAL COORDINATE VERIFICATION:
Before outputting coordinates, verify for each point:
1. Is this coordinate within the analyzed face region boundaries?
2. Is this coordinate on actual skin (not hair, eyebrows, or background)?
3. Is this coordinate at the density epicenter of the detected condition?
4. Are the coordinates normalized relative to the FACE REGION (0.0-1.0 within face bounds)?
5. Do the coordinates represent the most characteristic point of the condition?

COORDINATE EXAMPLES:
- Forehead wrinkle in center-top of face: {"x": 0.5, "y": 0.2}
- Cheek acne on right side of face: {"x": 0.7, "y": 0.6}
- Under-eye bags in center: {"x": 0.5, "y": 0.7}
- All coordinates are relative to the face region (0.0-1.0 within face bounds)
   - Under-eye area: The skin directly under the eyes
   
   AREAS TO COMPLETELY AVOID:
   - Hair and hairline areas
   - Eyebrows and eyebrow hair
   - Any area covered by hair
   - Scalp areas
   - Non-skin surfaces

3. COORDINATE MAPPING REQUIREMENTS:
   - Use normalized coordinates (0.0 to 1.0) relative to the FULL IMAGE dimensions
   - For each detected condition, provide ONLY the MOST CONFIDENT single point WITHIN THE VALIDATED FACE REGION:
     * ONE coordinate point representing the most obvious/severe location of the condition
     * Coordinates must be within the validated face boundaries
     * Area percentage calculation based on condition presence within the face region
     * Severity assessment based on visibility within the validated area

4. CONFIDENCE SCORING GUIDELINES (for features within the validated face region):
   - 0.8-1.0: Very obvious, clearly visible condition within the face area
   - 0.6-0.79: Moderate evidence, likely present within the face area
   - 0.4-0.59: Some signs present within the face area, mild condition
   - 0.2-0.39: Minimal evidence within the face area, questionable
   - 0.0-0.19: No clear evidence of condition within the validated face region

5. TREATMENT RECOMMENDATIONS:
   Consider detected features and their locations within the validated face region when providing treatment advice.
   - Primary detected condition within the face area and its severity
   - Skin type: ${skinType || 'normal'} (consider this in product recommendations)
   - Current routine: ${currentProducts?.length ? currentProducts.join(', ') : 'none specified'} (avoid conflicts)
   - Location-specific treatment recommendations based on coordinate data within the face region

COORDINATE DETECTION INSTRUCTIONS:
- Carefully examine ONLY the validated face region of the image
- CRITICAL: Focus EXCLUSIVELY on EXPOSED SKIN areas - completely ignore hair, eyebrows, and hairline

HAIR EXCLUSION RULES (EXTREMELY IMPORTANT):
- NEVER place coordinates on hair strands, scalp, or hairline areas
- NEVER place coordinates where hair meets the forehead
- NEVER place coordinates on areas covered by hair
- ALWAYS ensure coordinates are on smooth, exposed skin surface
- For forehead analysis: Stay WELL BELOW the hairline on clear skin

DENSITY-BASED COORDINATE PLACEMENT:
- For each detected condition, find the AREA with the HIGHEST CONCENTRATION/DENSITY ON CLEAR SKIN ONLY
- Mark only ONE coordinate point per condition - the CENTER of the most concentrated area on exposed skin
- For forehead wrinkles: Mark coordinates at the EPICENTER of wrinkle concentration on EXPOSED FOREHEAD SKIN
  * Analyze the entire exposed forehead skin for wrinkle patterns
  * Identify where multiple wrinkles converge or are most pronounced
  * Mark the center point of the highest wrinkle density zone
  * Avoid any area where hair is visible - focus on skin surface only
- For acne: Mark coordinates at the CENTER of the most dense acne cluster on clear skin
- For oily/dry skin: Mark coordinates at the CENTER of the most affected skin zone
- For pigmentation: Mark coordinates at the CENTER of the most densely pigmented area
- Be conservative with coordinates - only mark clearly visible features on exposed skin
- Provide detailed descriptions of what you observe at the marked location on the skin surface
- Focus on quality over quantity - better to have fewer accurate skin-based points than many uncertain ones
- COMPLETELY AVOID marking coordinates in hair, eyebrows, or any non-skin areas
- IGNORE any potential skin conditions outside the validated face region or in hair areas

VERIFICATION CHECKLIST FOR EACH COORDINATE:
1. Is this coordinate on exposed skin? (NOT hair)
2. Is this coordinate well below the hairline?
3. Is this coordinate on a smooth skin surface?
4. Can I clearly see skin texture at this location?
5. Is there NO hair visible at this coordinate point?

FINAL 3-STEP VERIFICATION:
Before providing the final JSON response, verify each coordinate follows the 3-step process:

STEP 1 VERIFICATION - SKIN AREA INCLUSION:
✓ Confirm coordinate is within verified skin areas from Step 1
✓ Ensure coordinate is NOT on hair, eyebrows, or excluded areas
✓ Verify coordinate is on well-lit, clearly visible skin surface

STEP 2 VERIFICATION - FEATURE ANALYSIS:
✓ Confirm the skin condition was properly identified in the mapped skin areas
✓ Verify the condition analysis was thorough and systematic
✓ Ensure condition severity and distribution were properly assessed

STEP 3 VERIFICATION - CHARACTERISTIC POINT:
✓ Verify coordinate represents the CENTER of HIGHEST DENSITY/CONCENTRATION
✓ Confirm this is the most characteristic point for the detected feature
✓ Ensure coordinate represents the best density and highest feature concentration
✓ For forehead wrinkles: Confirm coordinate is at epicenter of wrinkle concentration on skin
✓ Provide clear description of why this location has the highest feature density

Return ONLY the JSON object with no additional text, following the exact structure specified with complete coordinate data focused on the validated face region and verified skin-only placement.`;

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
                temperature: 0.7,
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
                    allPredictions: this.formatConditionsToArray(analysisResult.skinAnalysis.allConditions),
                    detectedFeatures: analysisResult.skinAnalysis.detectedFeatures || [],
                    imageMetadata: analysisResult.imageMetadata || {
                        width: 512,
                        height: 512,
                        format: 'jpeg'
                    }
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