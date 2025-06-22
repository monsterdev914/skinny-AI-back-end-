import { Request, Response, NextFunction } from 'express';
import { AppError } from '../types';

export const errorHandler = (
    error: Error | AppError,
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    let statusCode = 500;
    let message = 'Internal Server Error';

    if (error instanceof Error) {
        if ('statusCode' in error) {
            statusCode = (error as AppError).statusCode;
            message = error.message;
        } else {
            // Handle Mongoose validation errors
            if (error.name === 'ValidationError') {
                statusCode = 400;
                message = 'Validation Error';
            } else if (error.name === 'CastError') {
                statusCode = 400;
                message = 'Invalid ID format';
            } else if (error.name === 'MongoError' && (error as any).code === 11000) {
                statusCode = 409;
                message = 'Duplicate field value';
            } else {
                message = error.message;
            }
        }
    }

    // Log error in development
    if (process.env.NODE_ENV === 'development') {
        console.error('Error:', error);
    }

    res.status(statusCode).json({
        success: false,
        message,
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
};

export const notFound = (req: Request, res: Response, next: NextFunction): void => {
    const error = new Error(`Route ${req.originalUrl} not found`) as AppError;
    error.statusCode = 404;
    error.isOperational = true;
    next(error);
};

export const asyncHandler = (fn: Function) => {
    return (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}; 