import mongoose from 'mongoose';
import { IPlan } from '../types';
export interface PlanDocument extends IPlan {
}
interface PlanModel extends mongoose.Model<PlanDocument> {
    findActive(): Promise<PlanDocument[]>;
    findByStripeProductId(stripeProductId: string): Promise<PlanDocument | null>;
}
export declare const Plan: PlanModel;
export {};
//# sourceMappingURL=Plan.d.ts.map