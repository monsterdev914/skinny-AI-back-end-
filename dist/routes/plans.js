"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const errorHandler_1 = require("../middleware/errorHandler");
const plan_1 = require("../controllers/plan");
const router = (0, express_1.Router)();
router.get('/', (0, errorHandler_1.asyncHandler)(plan_1.PlanController.getAllPlans));
router.get('/:id', (0, errorHandler_1.asyncHandler)(plan_1.PlanController.getPlanById));
exports.default = router;
//# sourceMappingURL=plans.js.map