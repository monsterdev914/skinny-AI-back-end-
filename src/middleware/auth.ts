import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { AuthenticatedRequest, JWTPayload, AppError } from '../types';

export const authenticateToken = async (
    req: AuthenticatedRequest,
    _res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            const error = new Error('Access token required') as AppError;
            error.statusCode = 401;
            error.isOperational = true;
            throw error;
        }

        const decoded = jwt.verify(token, (process.env as any)['JWT_SECRET']!) as JWTPayload;

        const user = await User.findById(decoded.userId).select('-passwordHash');
        if (!user) {
            const error = new Error('User not found') as AppError;
            error.statusCode = 401;
            error.isOperational = true;
            throw error;
        }

        req.user = user;
        next();
    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
            const appError = new Error('Invalid token') as AppError;
            appError.statusCode = 401;
            appError.isOperational = true;
            next(appError);
        } else if (error instanceof jwt.TokenExpiredError) {
            const appError = new Error('Token expired') as AppError;
            appError.statusCode = 401;
            appError.isOperational = true;
            next(appError);
        } else {
            next(error);
        }
    }
};

export const requireRole = (roles: string[]) => {
    return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
        if (!req.user) {
            const error = new Error('Authentication required') as AppError;
            error.statusCode = 401;
            error.isOperational = true;
            next(error);
            return;
        }

        if (!roles.includes(req.user.role)) {
            const error = new Error('Insufficient permissions') as AppError;
            error.statusCode = 403;
            error.isOperational = true;
            next(error);
            return;
        }

        next();
    };
};

export const requireAdmin = requireRole(['admin']);
export const requireUser = requireRole(['user', 'admin']);

export const optionalAuth = async (
    req: AuthenticatedRequest,
    _res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            next();
            return;
        }

        const decoded = jwt.verify(token, (process.env as any)['JWT_SECRET']!) as JWTPayload;
        const user = await User.findById(decoded.userId).select('-passwordHash');

        if (user) {
            req.user = user;
        }

        next();
    } catch (error) {
        // If token is invalid, just continue without user
        next();
    }
}; 