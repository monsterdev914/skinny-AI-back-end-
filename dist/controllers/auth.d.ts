import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../types';
export declare class AuthController {
    static register(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static login(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static verifyEmail(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static forgotPassword(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static resetPassword(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static getMe(req: AuthenticatedRequest, res: Response): Promise<Response<any, Record<string, any>>>;
}
//# sourceMappingURL=auth.d.ts.map