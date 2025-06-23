"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlanController = void 0;
const Plan_1 = require("../models/Plan");
class PlanController {
    static async getAllPlans(_req, res) {
        const plans = await Plan_1.Plan.findActive();
        return res.json({
            success: true,
            message: 'Plans retrieved successfully',
            data: { plans }
        });
    }
    static async getPlanById(req, res) {
        const plan = await Plan_1.Plan.findById(req.params.id);
        if (!plan) {
            return res.status(404).json({
                success: false,
                message: 'Plan not found'
            });
        }
        return res.json({
            success: true,
            message: 'Plan retrieved successfully',
            data: { plan }
        });
    }
}
exports.PlanController = PlanController;
//# sourceMappingURL=plan.js.map