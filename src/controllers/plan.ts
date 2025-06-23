import { Request, Response } from 'express';
import { Plan } from '../models/Plan';

export class PlanController {
    static async getAllPlans(_req: Request, res: Response) {
        const plans = await Plan.findActive();
        return res.json({
            success: true,
            message: 'Plans retrieved successfully',
            data: { plans }
        });
    }

    static async getPlanById(req: Request, res: Response) {
        const plan = await Plan.findById((req.params as any).id);
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