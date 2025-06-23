import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
export declare class UserController {
    static getProfile(req: AuthenticatedRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    static updateProfile(_req: AuthenticatedRequest, res: Response): Promise<Response<any, Record<string, any>>>;
}
//# sourceMappingURL=user.d.ts.map