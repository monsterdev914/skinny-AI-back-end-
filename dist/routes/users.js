"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const user_1 = require("../controllers/user");
const router = (0, express_1.Router)();
router.get('/profile', auth_1.authenticateToken, auth_1.requireUser, (0, errorHandler_1.asyncHandler)(user_1.UserController.getProfile));
router.put('/profile', auth_1.authenticateToken, auth_1.requireUser, (0, errorHandler_1.asyncHandler)(user_1.UserController.updateProfile));
exports.default = router;
//# sourceMappingURL=users.js.map