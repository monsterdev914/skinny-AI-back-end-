"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const errorHandler_1 = require("../middleware/errorHandler");
const auth_1 = require("../middleware/auth");
const auth_2 = require("../controllers/auth");
const router = (0, express_1.Router)();
router.post('/register', [
    (0, express_validator_1.body)('email').isEmail().normalizeEmail(),
    (0, express_validator_1.body)('password').isLength({ min: 6 }),
    (0, express_validator_1.body)('firstName').optional().trim().isLength({ max: 50 }),
    (0, express_validator_1.body)('lastName').optional().trim().isLength({ max: 50 }),
    (0, express_validator_1.body)('phoneNumber').optional().trim()
], (0, errorHandler_1.asyncHandler)(auth_2.AuthController.register));
router.post('/login', [
    (0, express_validator_1.body)('email').isEmail().normalizeEmail(),
    (0, express_validator_1.body)('password').notEmpty()
], (0, errorHandler_1.asyncHandler)(auth_2.AuthController.login));
router.get('/verify-email', (0, errorHandler_1.asyncHandler)(auth_2.AuthController.verifyEmail));
router.post('/forgot-password', [
    (0, express_validator_1.body)('email').isEmail().normalizeEmail()
], (0, errorHandler_1.asyncHandler)(auth_2.AuthController.forgotPassword));
router.post('/reset-password', [
    (0, express_validator_1.body)('token').notEmpty(),
    (0, express_validator_1.body)('password').isLength({ min: 6 })
], (0, errorHandler_1.asyncHandler)(auth_2.AuthController.resetPassword));
router.get('/me', auth_1.authenticateToken, (0, errorHandler_1.asyncHandler)(auth_2.AuthController.getMe));
exports.default = router;
//# sourceMappingURL=auth.js.map