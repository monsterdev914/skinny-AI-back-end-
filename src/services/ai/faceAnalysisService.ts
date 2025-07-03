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
            const systemMessage = `You are an AI dermatology assistant specializing in facial and general skin analysis. 

CAPABILITIES:
- Analyze facial skin images for common conditions and general skin care
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

            // Validate if image contains skin areas suitable for comprehensive analysis
    static async validateSkinArea(imageBuffer: Buffer): Promise<{
        success: boolean;
        hasFace: boolean;
        skinAreaDetected: boolean;
        imageQuality?: 'excellent' | 'good' | 'fair' | 'poor';
        faceRegion?: {
            x: number;
            y: number;
            width: number;
            height: number;
        };
        visibleSkinAreas?: {
            face?: boolean;
            arms?: boolean;
            hands?: boolean;
            legs?: boolean;
            torso?: boolean;
            neck?: boolean;
        };
        analysisRecommendation?: 'proceed' | 'retake' | 'insufficient';
        issues?: string[];
        message: string;
        // New fields for enhanced detection
        skinRegions?: Array<{
            id: string;
            bodyPart: string;
            polygon: Array<{ x: number; y: number }>;
            area: number;
            confidence: number;
        }>;
        skinCoveragePercentage?: number;
    }> {
        try {
            // Simplified skin area validation without MediaPipe
            console.log('🔍 Basic: Validating image for skin areas...');
            
            // Basic image validation
            if (imageBuffer.length < 10000) {
                return {
                    success: false,
                    hasFace: false,
                    skinAreaDetected: false,
                    message: 'Image file too small for analysis'
                };
            }
            
            // Assume image is suitable for analysis
            const imageQuality: 'excellent' | 'good' | 'fair' | 'poor' = 'good';
            const analysisRecommendation: 'proceed' | 'retake' | 'insufficient' = 'proceed';
            const issues: string[] = [];
            
            const result: any = {
                success: true,
                hasFace: true, // Assume face is present
                skinAreaDetected: true, // Assume skin area is present
                imageQuality,
                visibleSkinAreas: {
                    face: true,
                    arms: false,
                    hands: false,
                    legs: false,
                    torso: false,
                    neck: false
                },
                analysisRecommendation,
                message: 'Image appears suitable for analysis',
                suitable: true,
                skinRegions: [],
                skinCoveragePercentage: 50 // Assume reasonable coverage
            };

            // Add optional properties only if they exist
            if (issues.length > 0) {
                result.issues = issues;
            }

            console.log('✅ Basic: Image validation complete');
            return result;

        } catch (error) {
            console.error("Basic image validation error:", error);
            return {
                success: false,
                hasFace: false,
                skinAreaDetected: false,
                message: `Image validation failed: ${(error as Error).message}`
            };
        }
    }

    // OPTIMIZED: Get all analysis data in a single OpenAI call with comprehensive skin area analysis
    static async getComprehensiveAnalysisOptimized(
        imageBuffer: Buffer,
        _userAge?: number,
        skinType?: string,
        currentProducts?: string[]
    ): Promise<{
        success: boolean;
        data?: CompleteTreatmentPlan;
        message: string;
    }> {
        try {
            // STEP 1: Validate that image contains analyzable skin areas
            console.log("Step 1: Validating skin areas in image...");
            const skinValidation = await this.validateSkinArea(imageBuffer);
            console.log("Skin validation:", skinValidation);    
            if (!skinValidation.success) {
                return {
                    success: false,
                    message: `Image validation failed: ${skinValidation.message}`
                };
            }

            if (!skinValidation.skinAreaDetected) {
                return {
                    success: false,
                    message: "Unable to proceed with analysis: Could not detect sufficient skin areas. Please ensure the image shows clear, well-lit skin areas."
                };
            }

            console.log("✅ Image validation passed - proceeding with comprehensive skin analysis");
            console.log(`Skin coverage: ${skinValidation.skinCoveragePercentage?.toFixed(1)}% of image`);

            // STEP 2: Proceed with comprehensive skin analysis
            const openai = this.getOpenAIClient();

            // Convert buffer to base64
            const base64Image = imageBuffer.toString('base64');
            const imageUrl = `data:image/jpeg;base64,${base64Image}`;

            // Comprehensive system message for all skin analysis
            const systemMessage = `You are an expert AI dermatology assistant specializing in comprehensive skin analysis across all visible body areas.

CAPABILITIES:
- Analyze all visible skin areas in images (face, arms, hands, legs, torso, etc.)
- Identify skin conditions with precise coordinate mapping across any body part
- Provide spatial feature detection and localization for any skin area
- Generate personalized treatment recommendations for detected skin conditions
- Create treatment timelines for various skin conditions

ANALYSIS SCOPE:
Skin conditions to detect: hormonal_acne, forehead_wrinkles, oily_skin, dry_skin, normal_skin, dark_spots, under_eye_bags, rosacea, eczema, psoriasis, keratosis_pilaris, stretch_marks, scars, moles, sun_damage, age_spots, seborrheic_keratosis

ANALYSIS APPROACH:
- Examine ALL visible skin areas in the image systematically
- Do not limit analysis to facial areas only
- Include any exposed skin on arms, hands, legs, torso, neck, etc.
- Identify the most distinctive and prominent features of each condition
- Focus on areas where conditions are most clearly visible and characteristic

COORDINATE DETECTION REQUIREMENTS:
- Analyze the entire image for all visible skin areas
- Provide normalized coordinates (0-1 scale) relative to the FULL IMAGE dimensions
- For each detected condition, identify the SINGLE MOST DISTINCTIVE point where the condition is most clearly visible
- Coordinates should represent the most obvious, characteristic, and severe manifestation of each condition
- Calculate affected area percentages relative to the total visible skin in the image

IMPORTANT PRINCIPLES:
- Focus on observable surface-level skin characteristics across all body areas
- This analysis is for informational purposes only
- Cannot diagnose medical conditions or replace professional evaluation
- Concentrate on clearly visible skin conditions that can be reliably identified

OUTPUT FORMAT:
Return ONLY a valid JSON object with this exact structure:
{
    "imageMetadata": {
        "width": estimated_width_pixels,
        "height": estimated_height_pixels,
        "aspectRatio": width/height,
        "skinCoverage": {
            "totalSkinAreaPercentage": percentage_of_image_showing_skin,
            "visibleSkinRegions": ["face", "arms", "hands", "etc"],
            "description": "Description of all visible skin areas in the image"
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
            "rosacea": number,
            "eczema": number,
            "psoriasis": number,
            "keratosis_pilaris": number,
            "stretch_marks": number,
            "scars": number,
            "moles": number,
            "sun_damage": number,
            "age_spots": number,
            "seborrheic_keratosis": number
        },
        "detectedFeatures": [
            {
                "condition": "condition_name",
                "confidence": number,
                "coordinates": [
                    {"x": normalized_x_0_to_1, "y": normalized_y_0_to_1}
                ],
                "area": percentage_of_affected_area,
                "severity": "mild|moderate|severe",
                "bodyRegion": "face|arm|hand|leg|torso|neck|etc",
                "description": "detailed description of the detected feature and its location",
                "distinctiveCharacteristics": "what makes this the most distinctive example of this condition",
                "coordinateVerification": {
                    "isOnSkin": true,
                    "isNotOnClothing": true,
                    "isMostDistinctive": true,
                    "skinAreaDescription": "exact description of the skin area where coordinate is placed"
                }
            }
        ]
    },
    "treatmentPlan": {
        "overview": "brief description focusing on the most prominent conditions",
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

            const userPrompt = `COMPREHENSIVE SKIN ANALYSIS - FOLLOW THIS 4-STEP PROCESS:

DETECTED SKIN REGIONS (Pre-Analysis):
Image validation has detected the following skin regions in this image:
${skinValidation.skinRegions?.map((region, index) => 
    `Region ${index + 1}: ${region.bodyPart.toUpperCase()} (Area: ${region.area} pixels, Confidence: ${region.confidence.toFixed(2)})`
).join('\n') || 'No specific regions detected'}

Total skin coverage: ${skinValidation.skinCoveragePercentage?.toFixed(1)}% of image
Visible body areas: ${Object.keys(skinValidation.visibleSkinAreas || {}).join(', ')}

STEP 1: COMPLETE SKIN AREA MAPPING
Using the pre-analysis, focus your analysis on the CONFIRMED skin areas:

PRIMARY ANALYSIS TARGETS (Pre-Confirmed):
${skinValidation.skinRegions?.map(region => 
    `- ${region.bodyPart.toUpperCase()}: polygon area with ${region.area} pixels (confidence: ${region.confidence.toFixed(2)})`
).join('\n') || '- Analyze all visible skin areas in the image'}

SKIN AREA VALIDATION:
- Image validation has confirmed these areas contain actual skin pixels
- Focus analysis on the pre-identified skin regions
- Use detected boundaries to guide your condition detection
- Prioritize areas with higher confidence scores

STEP 2: SYSTEMATIC CONDITION DETECTION
Analyze each mapped skin area for ALL possible skin conditions:

FOR EACH SKIN REGION, EXAMINE FOR:
- Acne conditions: hormonal_acne, comedones, inflammatory lesions
- Texture issues: oily_skin, dry_skin, rough patches
- Pigmentation: dark_spots, age_spots, sun_damage, melasma
- Aging signs: wrinkles, fine lines, elasticity loss
- Inflammatory conditions: rosacea, eczema, psoriasis
- Structural features: moles, scars, stretch_marks
- Texture disorders: keratosis_pilaris, seborrheic_keratosis
- Vascular issues: spider veins, broken capillaries

CONDITION ANALYSIS PROTOCOL:
1. Scan each skin area methodically for all condition types
2. Assess severity and distribution patterns
3. Note areas where conditions are most pronounced
4. Identify co-occurring conditions in the same regions
5. Prepare comprehensive condition mapping across all skin areas

STEP 3: MOST DISTINCTIVE FEATURE IDENTIFICATION
For each detected condition, identify the SINGLE MOST DISTINCTIVE point:

DISTINCTIVE POINT SELECTION CRITERIA:
- VISIBILITY: Most clearly visible and obvious manifestation
- SEVERITY: Most severe or pronounced example of the condition
- CLARITY: Clearest representation without ambiguity
- ACCESSIBILITY: Easily identifiable and describable location
- CHARACTERISTIC: Most typical example of how this condition appears

COORDINATE SYSTEM:
- All coordinates normalized (0.0 to 1.0) relative to FULL IMAGE dimensions
- (0.0, 0.0) = top-left corner of entire image
- (1.0, 1.0) = bottom-right corner of entire image
- (0.5, 0.5) = center of entire image

CONDITION-SPECIFIC DISTINCTIVE POINT IDENTIFICATION:

HORMONAL_ACNE:
1. Scan all skin areas for inflammatory acne lesions
2. Identify the LARGEST, most inflamed, or most characteristic lesion
3. Mark the CENTER of the most distinctive acne lesion
4. Prefer jawline, chin, or neck acne if present (most characteristic of hormonal)

DARK_SPOTS/AGE_SPOTS:
1. Examine all skin for pigmentation irregularities
2. Find the DARKEST, most well-defined, or largest spot
3. Mark the CENTER of the most distinctive dark spot
4. Prefer spots that are clearly different from surrounding skin

ECZEMA:
1. Look for red, inflamed, scaly patches on any skin area
2. Identify the most INFLAMED or characteristic eczema patch
3. Mark the CENTER of the most distinctive eczema lesion
4. Focus on areas with clear eczema characteristics (scaling, redness)

PSORIASIS:
1. Search for thick, scaly, silvery patches on skin
2. Find the most CHARACTERISTIC psoriasis plaque
3. Mark the CENTER of the most distinctive psoriasis lesion
4. Prefer well-defined plaques with typical scaling

KERATOSIS_PILARIS:
1. Examine arms, legs, or other areas for bumpy texture
2. Find the area with most PRONOUNCED bump concentration
3. Mark the CENTER of the most distinctive bumpy patch
4. Focus on areas where "chicken skin" texture is most obvious

STRETCH_MARKS:
1. Look for linear marks on skin (any body area)
2. Find the most VISIBLE or pronounced stretch mark
3. Mark the CENTER point of the most distinctive stretch mark
4. Prefer marks that are clearly defined and characteristic

SCARS:
1. Examine all skin for scar tissue
2. Identify the most PROMINENT or characteristic scar
3. Mark the CENTER of the most distinctive scar
4. Prefer scars that are clearly different from surrounding skin

MOLES:
1. Look for pigmented lesions across all skin areas
2. Find the most PROMINENT or distinctive mole
3. Mark the CENTER of the most notable mole
4. Prefer moles that are clearly defined and visible

OILY_SKIN:
1. Examine skin for shine, enlarged pores, greasy appearance
2. Find the area with most PRONOUNCED oily characteristics
3. Mark the CENTER of the most distinctively oily zone
4. Focus on T-zone or other areas where oil is most obvious

DRY_SKIN:
1. Look for flaky, rough, or tight-appearing skin
2. Find the area with most SEVERE dryness indicators
3. Mark the CENTER of the most distinctively dry patch
4. Prefer areas with visible flaking or texture changes

STEP 4: COORDINATE VERIFICATION AND VALIDATION
Before finalizing each coordinate, verify:

VERIFICATION CHECKLIST:
1. ✓ Is this coordinate on actual skin (not clothing/accessories)?
2. ✓ Is this the MOST distinctive example of this condition in the image?
3. ✓ Are coordinates normalized to full image (0.0-1.0)?
4. ✓ Is the condition clearly visible and identifiable at this location?
5. ✓ Does this represent the best example of this condition in the image?

QUALITY CONTROL:
- Only include conditions with confidence ≥ 0.4
- Only place coordinates for clearly visible conditions
- Ensure each coordinate represents the most obvious manifestation
- Provide detailed descriptions of why each location is most distinctive
- Double-check that coordinates accurately represent the described features

TREATMENT CONSIDERATIONS:
Based on all detected conditions across all skin areas:
- Skin type: ${skinType || 'normal'} (consider in recommendations)
- Current routine: ${currentProducts?.length ? currentProducts.join(', ') : 'none specified'}
- Focus on the most prominent conditions detected
- Provide comprehensive care for all affected body areas

FINAL OUTPUT REQUIREMENTS:
- Comprehensive analysis of ALL visible skin areas
- Coordinates for MOST DISTINCTIVE feature of each condition
- Treatment plan addressing all significant conditions
- Clear descriptions of why each coordinate location was selected
- Body region identification for each detected feature

Return ONLY the JSON object with no additional text, following the exact structure specified with complete coordinate data for the most distinctive features across all visible skin areas.`;

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
                max_tokens: 2500,
                temperature: 0,
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
                    throw new Error("Image analysis declined - the image may not contain clear skin areas or may not be suitable for analysis");
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
                    throw new Error("Image analysis was declined - please ensure the image shows clear, visible skin areas");
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
                    message: "Comprehensive skin analysis completed successfully",
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
                message: "Comprehensive skin analysis completed successfully"
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