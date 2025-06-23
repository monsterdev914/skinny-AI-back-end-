import { Request, Response } from 'express';
export declare class AIController {
    static analyzeFaceCondition(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static getTreatmentRecommendation(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static getTreatmentTimeline(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static getComprehensiveAnalysis(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static getServiceHealth(_req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static getAvailableConditions(_req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
//# sourceMappingURL=aiController.d.ts.map