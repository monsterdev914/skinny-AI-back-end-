"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FaceAnalysisService = void 0;
const openai_1 = __importDefault(require("openai"));
class FaceAnalysisService {
    static getOpenAIClient() {
        if (!this.openai) {
            this.openai = new openai_1.default({
                apiKey: process.env.OPENAI_API_KEY,
            });
        }
        return this.openai;
    }
    static async analyzeFaceCondition(imageBuffer) {
        try {
            const openai = this.getOpenAIClient();
            const base64Image = imageBuffer.toString('base64');
            const imageUrl = `data:image/jpeg;base64,${base64Image}`;
            const prompt = `Analyze this face image and identify skin conditions. 
            Look for these specific conditions:
            - hormonal_acne
            - forehead_wrinkles
            - oily_skin
            - dry_skin
            - normal_skin
            - dark_spots
            - under_eye_bags
            - rosacea

            Respond with a JSON object containing confidence scores (0-1) for each condition.
            Example format: {"oily_skin": 0.8, "hormonal_acne": 0.2, "normal_skin": 0.1}
            
            Only return the JSON object, no other text.`;
            const response = await openai.chat.completions.create({
                model: "gpt-4-vision-preview",
                messages: [
                    {
                        role: "user",
                        content: [
                            { type: "text", text: prompt },
                            { type: "image_url", image_url: { url: imageUrl } }
                        ]
                    }
                ],
                max_tokens: 300,
                temperature: 0.1,
            });
            const content = response.choices[0]?.message?.content;
            if (!content) {
                throw new Error("No response from OpenAI");
            }
            let predictions;
            try {
                const jsonMatch = content.match(/\{[\s\S]*\}/);
                if (!jsonMatch) {
                    throw new Error("No valid JSON found in response");
                }
                predictions = JSON.parse(jsonMatch[0]);
            }
            catch (parseError) {
                console.error("Failed to parse OpenAI response:", content);
                throw new Error("Invalid response format from AI");
            }
            const total = Object.values(predictions).reduce((sum, val) => sum + val, 0);
            if (total > 0) {
                Object.keys(predictions).forEach(key => {
                    predictions[key] = predictions[key] / total;
                });
            }
            const topPrediction = this.getTopPrediction(predictions);
            return {
                success: true,
                predictions,
                topPrediction,
                message: "Face analysis completed successfully using OpenAI"
            };
        }
        catch (error) {
            console.error("OpenAI face analysis error:", error);
            return {
                success: false,
                predictions: {},
                topPrediction: { condition: "unknown", confidence: 0 },
                message: `Analysis failed: ${error.message}`
            };
        }
    }
    static async generateTreatmentRecommendation(condition, confidence, userAge, skinType, currentProducts) {
        try {
            const openai = this.getOpenAIClient();
            let severity = 'mild';
            if (confidence > 0.7)
                severity = 'severe';
            else if (confidence > 0.4)
                severity = 'moderate';
            const prompt = `Create a comprehensive treatment plan for ${condition} with ${severity} severity (confidence: ${confidence}).

            User details:
            - Age: ${userAge || 'Not specified'}
            - Skin type: ${skinType || 'Not specified'}
            - Current products: ${currentProducts?.join(', ') || 'None specified'}

            Provide a JSON response with the following structure:
            {
                "recommendation": {
                    "condition": "${condition}",
                    "severity": "${severity}",
                    "overview": "Brief overview of the condition and treatment approach",
                    "steps": [
                        {
                            "step": 1,
                            "title": "Step title",
                            "description": "Detailed description",
                            "products": ["product1", "product2"],
                            "frequency": "twice daily / morning / evening",
                            "duration": "2-4 weeks",
                            "tips": ["tip1", "tip2"]
                        }
                    ],
                    "expectedResults": "What to expect and when",
                    "warnings": ["Important warnings or contraindications"],
                    "professionalAdvice": "When to see a dermatologist"
                },
                "timeline": {
                    "condition": "${condition}",
                    "totalDuration": "3-6 months",
                    "phases": [
                        {
                            "phase": 1,
                            "title": "Initial Treatment",
                            "timeframe": "Weeks 1-4",
                            "description": "Phase description",
                            "expectedChanges": ["change1", "change2"],
                            "skinCareAdjustments": ["adjustment1"],
                            "milestones": ["milestone1"]
                        }
                    ],
                    "maintenancePhase": {
                        "title": "Maintenance Phase",
                        "description": "Long-term care description",
                        "ongoingCare": ["care1", "care2"]
                    },
                    "checkupSchedule": ["Initial: 2 weeks", "Follow-up: 6 weeks"]
                },
                "personalizedNotes": ["Note based on user profile"]
            }

            Make it comprehensive, safe, and evidence-based. Include specific product recommendations when appropriate.`;
            const response = await openai.chat.completions.create({
                model: "gpt-4-turbo-preview",
                messages: [
                    {
                        role: "system",
                        content: "You are a knowledgeable skincare specialist providing evidence-based treatment recommendations. Always emphasize safety and when to seek professional help."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                max_tokens: 2000,
                temperature: 0.2,
            });
            const content = response.choices[0]?.message?.content;
            if (!content) {
                throw new Error("No response from OpenAI");
            }
            let treatmentPlan;
            try {
                const jsonMatch = content.match(/\{[\s\S]*\}/);
                if (!jsonMatch) {
                    throw new Error("No valid JSON found in response");
                }
                treatmentPlan = JSON.parse(jsonMatch[0]);
            }
            catch (parseError) {
                console.error("Failed to parse treatment recommendation:", content);
                throw new Error("Invalid treatment plan format");
            }
            const completePlan = {
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
        }
        catch (error) {
            console.error("Treatment recommendation error:", error);
            return {
                success: false,
                message: `Failed to generate treatment plan: ${error.message}`
            };
        }
    }
    static async getTreatmentTimeline(condition, severity = 'moderate') {
        try {
            const openai = this.getOpenAIClient();
            const prompt = `Create a detailed treatment timeline for ${condition} with ${severity} severity.

            Provide a JSON response with the following structure:
            {
                "condition": "${condition}",
                "totalDuration": "Expected total treatment duration",
                "phases": [
                    {
                        "phase": 1,
                        "title": "Phase name",
                        "timeframe": "Weeks 1-4",
                        "description": "What happens in this phase",
                        "expectedChanges": ["visible change1", "change2"],
                        "skinCareAdjustments": ["adjustment if needed"],
                        "milestones": ["milestone to watch for"]
                    }
                ],
                "maintenancePhase": {
                    "title": "Long-term Maintenance",
                    "description": "Ongoing care description",
                    "ongoingCare": ["maintenance step1", "step2"]
                },
                "checkupSchedule": ["When to check progress"]
            }

            Make it realistic and evidence-based.`;
            const response = await openai.chat.completions.create({
                model: "gpt-4-turbo-preview",
                messages: [
                    {
                        role: "system",
                        content: "You are creating realistic treatment timelines based on dermatological evidence."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                max_tokens: 1000,
                temperature: 0.2,
            });
            const content = response.choices[0]?.message?.content;
            if (!content) {
                throw new Error("No response from OpenAI");
            }
            let timeline;
            try {
                const jsonMatch = content.match(/\{[\s\S]*\}/);
                if (!jsonMatch) {
                    throw new Error("No valid JSON found in response");
                }
                timeline = JSON.parse(jsonMatch[0]);
            }
            catch (parseError) {
                console.error("Failed to parse timeline:", content);
                throw new Error("Invalid timeline format");
            }
            return {
                success: true,
                timeline,
                message: "Treatment timeline generated successfully"
            };
        }
        catch (error) {
            console.error("Timeline generation error:", error);
            return {
                success: false,
                message: `Failed to generate timeline: ${error.message}`
            };
        }
    }
    static getTopPrediction(predictions) {
        const entries = Object.entries(predictions);
        if (entries.length === 0) {
            return { condition: "unknown", confidence: 0 };
        }
        const [condition, confidence] = entries.reduce((max, current) => current[1] > max[1] ? current : max);
        return { condition, confidence };
    }
    static formatResults(predictions, topN = 3) {
        return Object.entries(predictions)
            .sort(([, a], [, b]) => b - a)
            .slice(0, topN)
            .map(([condition, confidence]) => ({
            condition,
            confidence,
            percentage: `${(confidence * 100).toFixed(1)}%`
        }));
    }
    static async healthCheck() {
        try {
            const openai = this.getOpenAIClient();
            await openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [{ role: "user", content: "Hello" }],
                max_tokens: 5
            });
            return true;
        }
        catch (error) {
            console.error("OpenAI health check failed:", error);
            return false;
        }
    }
    static async switchToGradio() {
        console.log("Switching to Gradio implementation...");
    }
}
exports.FaceAnalysisService = FaceAnalysisService;
FaceAnalysisService.openai = null;
//# sourceMappingURL=faceAnalysisService.js.map