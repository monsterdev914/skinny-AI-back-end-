"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const paymentMethod_1 = require("../controllers/paymentMethod");
const router = (0, express_1.Router)();
router.get('/', auth_1.authenticateToken, (0, errorHandler_1.asyncHandler)(paymentMethod_1.PaymentMethodController.getUserPaymentMethods));
exports.default = router;
//# sourceMappingURL=paymentMethods.js.map