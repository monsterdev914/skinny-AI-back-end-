import { Request, Response, NextFunction } from 'express';
import { AppError } from '../types';
export declare const errorHandler: (error: Error | AppError, _req: Request, res: Response, _next: NextFunction) => void;
export declare const notFound: (req: Request, _res: Response, next: NextFunction) => void;
export declare const asyncHandler: (fn: Function) => (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=errorHandler.d.ts.map