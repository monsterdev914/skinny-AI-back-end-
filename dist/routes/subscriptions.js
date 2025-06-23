"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const subscription_1 = require("../controllers/subscription");
const router = (0, express_1.Router)();
router.get('/', auth_1.authenticateToken, (0, errorHandler_1.asyncHandler)(subscription_1.SubscriptionController.getUserSubscriptions));
exports.default = router;
//# sourceMappingURL=subscriptions.js.map