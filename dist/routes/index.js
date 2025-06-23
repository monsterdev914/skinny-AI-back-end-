"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = __importDefault(require("./auth"));
const users_1 = __importDefault(require("./users"));
const plans_1 = __importDefault(require("./plans"));
const subscriptions_1 = __importDefault(require("./subscriptions"));
const paymentMethods_1 = __importDefault(require("./paymentMethods"));
const ai_1 = __importDefault(require("./ai"));
const router = (0, express_1.Router)();
router.use('/auth', auth_1.default);
router.use('/users', users_1.default);
router.use('/plans', plans_1.default);
router.use('/subscriptions', subscriptions_1.default);
router.use('/payment-methods', paymentMethods_1.default);
router.use('/ai', ai_1.default);
exports.default = router;
//# sourceMappingURL=index.js.map