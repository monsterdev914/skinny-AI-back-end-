"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const aiController_1 = require("../controllers/aiController");
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024,
    },
    fileFilter: (_req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        }
        else {
            cb(new Error('Only image files are allowed'), false);
        }
    }
});
router.post('/analyze-face', auth_1.authenticateToken, upload.single('image'), (0, errorHandler_1.asyncHandler)(aiController_1.AIController.analyzeFaceCondition));
router.post('/treatment/recommendation', auth_1.authenticateToken, (0, errorHandler_1.asyncHandler)(aiController_1.AIController.getTreatmentRecommendation));
router.get('/treatment/timeline', auth_1.authenticateToken, (0, errorHandler_1.asyncHandler)(aiController_1.AIController.getTreatmentTimeline));
router.post('/comprehensive-analysis', auth_1.authenticateToken, upload.single('image'), (0, errorHandler_1.asyncHandler)(aiController_1.AIController.getComprehensiveAnalysis));
router.get('/health', (0, errorHandler_1.asyncHandler)(aiController_1.AIController.getServiceHealth));
router.get('/conditions', (0, errorHandler_1.asyncHandler)(aiController_1.AIController.getAvailableConditions));
exports.default = router;
//# sourceMappingURL=ai.js.map