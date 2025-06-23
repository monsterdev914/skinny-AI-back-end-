# Treatment Recommendation API

This document describes the treatment recommendation and timeline endpoints for the Skinny AI backend.

## Endpoints

### 1. Face Analysis
```
POST /api/ai/analyze-face
```
Analyzes an uploaded face image to detect skin conditions.

**Headers:**
- `Authorization: Bearer <token>`
- `Content-Type: multipart/form-data`

**Body:**
- `image`: Image file (JPG, PNG, etc.)

**Response:**
```json
{
  "success": true,
  "message": "Face analysis completed successfully",
  "data": {
    "topPrediction": {
      "condition": "oily_skin",
      "confidence": 0.75
    },
    "allPredictions": [
      {
        "condition": "oily_skin",
        "confidence": 0.75,
        "percentage": "75.0%"
      }
    ],
    "rawPredictions": {
      "oily_skin": 0.75,
      "hormonal_acne": 0.15,
      "normal_skin": 0.10
    }
  }
}
```

### 2. Treatment Recommendation
```
POST /api/ai/treatment/recommendation
```
Generates personalized treatment recommendations based on detected condition.

**Headers:**
- `Authorization: Bearer <token>`
- `Content-Type: application/json`

**Body:**
```json
{
  "condition": "oily_skin",
  "confidence": 0.75,
  "userAge": 25,
  "skinType": "oily",
  "currentProducts": ["cleanser", "moisturizer"]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Treatment recommendation generated successfully",
  "data": {
    "condition": "oily_skin",
    "confidence": 0.75,
    "recommendation": {
      "condition": "oily_skin",
      "severity": "moderate",
      "overview": "Treatment approach overview...",
      "steps": [
        {
          "step": 1,
          "title": "Gentle Cleansing",
          "description": "Use a gentle, oil-free cleanser twice daily...",
          "products": ["Salicylic acid cleanser", "Gentle foam cleanser"],
          "frequency": "twice daily",
          "duration": "ongoing",
          "tips": ["Use lukewarm water", "Pat dry gently"]
        }
      ],
      "expectedResults": "Improvement expected in 4-6 weeks...",
      "warnings": ["Avoid over-cleansing", "Use sunscreen daily"],
      "professionalAdvice": "Consult dermatologist if no improvement in 8 weeks"
    },
    "timeline": {
      "condition": "oily_skin",
      "totalDuration": "3-4 months",
      "phases": [
        {
          "phase": 1,
          "title": "Initial Treatment",
          "timeframe": "Weeks 1-4",
          "description": "Focus on establishing routine...",
          "expectedChanges": ["Reduced oil production", "Clearer pores"],
          "skinCareAdjustments": ["Introduce BHA slowly"],
          "milestones": ["Skin feels less greasy"]
        }
      ],
      "maintenancePhase": {
        "title": "Maintenance Phase",
        "description": "Continue proven routine...",
        "ongoingCare": ["Daily gentle cleansing", "Regular exfoliation"]
      },
      "checkupSchedule": ["2 weeks", "6 weeks", "3 months"]
    },
    "personalizedNotes": ["Consider your age and current routine"]
  }
}
```

### 3. Treatment Timeline
```
GET /api/ai/treatment/timeline?condition=oily_skin&severity=moderate
```
Gets detailed treatment timeline for a specific condition.

**Headers:**
- `Authorization: Bearer <token>`

**Query Parameters:**
- `condition` (required): Skin condition name
- `severity` (optional): mild | moderate | severe (default: moderate)

**Response:**
```json
{
  "success": true,
  "message": "Treatment timeline generated successfully",
  "data": {
    "condition": "oily_skin",
    "totalDuration": "3-4 months",
    "phases": [
      {
        "phase": 1,
        "title": "Initial Treatment",
        "timeframe": "Weeks 1-4",
        "description": "Focus on establishing a consistent routine...",
        "expectedChanges": ["Reduced oil production", "Fewer breakouts"],
        "skinCareAdjustments": ["Introduce BHA 2-3 times per week"],
        "milestones": ["Skin feels less greasy by week 2"]
      }
    ],
    "maintenancePhase": {
      "title": "Long-term Maintenance",
      "description": "Continue proven routine with adjustments...",
      "ongoingCare": ["Daily gentle cleansing", "Regular BHA use"]
    },
    "checkupSchedule": ["Initial assessment: 2 weeks", "Progress check: 6 weeks"]
  }
}
```

### 4. Comprehensive Analysis
```
POST /api/ai/comprehensive-analysis
```
Performs face analysis and generates treatment recommendations in one call.

**Headers:**
- `Authorization: Bearer <token>`
- `Content-Type: multipart/form-data`

**Body:**
- `image`: Image file (JPG, PNG, etc.)
- `userAge`: (optional) User's age
- `skinType`: (optional) User's skin type
- `currentProducts`: (optional) Array of current products

**Response:**
```json
{
  "success": true,
  "message": "Comprehensive analysis completed successfully",
  "data": {
    "analysis": {
      "topPrediction": {
        "condition": "oily_skin",
        "confidence": 0.75
      },
      "allPredictions": [...],
      "rawPredictions": {...}
    },
    "treatment": {
      "condition": "oily_skin",
      "confidence": 0.75,
      "recommendation": {...},
      "timeline": {...},
      "personalizedNotes": [...]
    }
  }
}
```

### 5. Health Check
```
GET /api/ai/health
```
Checks AI service status (public endpoint).

**Response:**
```json
{
  "success": true,
  "data": {
    "service": "Face Analysis AI",
    "status": "healthy",
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

### 6. Available Conditions
```
GET /api/ai/conditions
```
Lists all detectable skin conditions (public endpoint).

**Response:**
```json
{
  "success": true,
  "data": {
    "conditions": [
      "hormonal_acne",
      "forehead_wrinkles",
      "oily_skin",
      "dry_skin",
      "normal_skin",
      "dark_spots",
      "under_eye_bags",
      "rosacea"
    ],
    "total": 8
  }
}
```

## Usage Examples

### JavaScript/Fetch Example

```javascript
// Comprehensive Analysis
const formData = new FormData();
formData.append('image', imageFile);
formData.append('userAge', '25');
formData.append('skinType', 'oily');

const response = await fetch('/api/ai/comprehensive-analysis', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});

const result = await response.json();
console.log(result.data.treatment.recommendation);
```

### cURL Examples

```bash
# Face Analysis
curl -X POST http://localhost:3000/api/ai/analyze-face \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "image=@face.jpg"

# Treatment Recommendation
curl -X POST http://localhost:3000/api/ai/treatment/recommendation \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "condition": "oily_skin",
    "confidence": 0.75,
    "userAge": 25,
    "skinType": "oily"
  }'

# Treatment Timeline
curl -X GET "http://localhost:3000/api/ai/treatment/timeline?condition=oily_skin&severity=moderate" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Error Responses

All endpoints return errors in this format:
```json
{
  "success": false,
  "message": "Error description"
}
```

Common HTTP status codes:
- `400`: Bad Request (invalid input)
- `401`: Unauthorized (missing/invalid token)
- `413`: Payload Too Large (image file too big)
- `500`: Internal Server Error (AI service issues)

## Environment Variables Required

```
OPENAI_API_KEY=your_openai_api_key_here
```

## Notes

- Maximum image file size: 10MB
- Supported image formats: JPG, PNG, WebP, etc.
- All treatment endpoints require authentication
- Treatment recommendations are AI-generated and should not replace professional medical advice
- Users should be advised to consult dermatologists for serious skin conditions 