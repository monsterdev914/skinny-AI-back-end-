"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.asyncHandler = exports.notFound = exports.errorHandler = void 0;
const errorHandler = (error, _req, res, _next) => {
    let statusCode = 500;
    let message = 'Internal Server Error';
    if (error instanceof Error) {
        if ('statusCode' in error) {
            statusCode = error.statusCode;
            message = error.message;
        }
        else {
            if (error.name === 'ValidationError') {
                statusCode = 400;
                message = 'Validation Error';
            }
            else if (error.name === 'CastError') {
                statusCode = 400;
                message = 'Invalid ID format';
            }
            else if (error.name === 'MongoError' && error.code === 11000) {
                statusCode = 409;
                message = 'Duplicate field value';
            }
            else {
                message = error.message;
            }
        }
    }
    if (process.env['NODE_ENV'] === 'development') {
        console.error('Error:', error);
    }
    res.status(statusCode).json({
        success: false,
        message,
        ...(process.env['NODE_ENV'] === 'development' && { stack: error.stack })
    });
};
exports.errorHandler = errorHandler;
const notFound = (req, _res, next) => {
    const error = new Error(`Route ${req.originalUrl} not found`);
    error.statusCode = 404;
    error.isOperational = true;
    next(error);
};
exports.notFound = notFound;
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
exports.asyncHandler = asyncHandler;
//# sourceMappingURL=errorHandler.js.map