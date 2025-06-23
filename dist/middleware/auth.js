"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.optionalAuth = exports.requireUser = exports.requireAdmin = exports.requireRole = exports.authenticateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = require("../models/User");
const authenticateToken = async (req, _res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];
        if (!token) {
            const error = new Error('Access token required');
            error.statusCode = 401;
            error.isOperational = true;
            throw error;
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env['JWT_SECRET']);
        const user = await User_1.User.findById(decoded.userId).select('-passwordHash');
        if (!user) {
            const error = new Error('User not found');
            error.statusCode = 401;
            error.isOperational = true;
            throw error;
        }
        req.user = user;
        next();
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            const appError = new Error('Invalid token');
            appError.statusCode = 401;
            appError.isOperational = true;
            next(appError);
        }
        else if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            const appError = new Error('Token expired');
            appError.statusCode = 401;
            appError.isOperational = true;
            next(appError);
        }
        else {
            next(error);
        }
    }
};
exports.authenticateToken = authenticateToken;
const requireRole = (roles) => {
    return (req, _res, next) => {
        if (!req.user) {
            const error = new Error('Authentication required');
            error.statusCode = 401;
            error.isOperational = true;
            next(error);
            return;
        }
        if (!roles.includes(req.user.role)) {
            const error = new Error('Insufficient permissions');
            error.statusCode = 403;
            error.isOperational = true;
            next(error);
            return;
        }
        next();
    };
};
exports.requireRole = requireRole;
exports.requireAdmin = (0, exports.requireRole)(['admin']);
exports.requireUser = (0, exports.requireRole)(['user', 'admin']);
const optionalAuth = async (req, _res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];
        if (!token) {
            next();
            return;
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env['JWT_SECRET']);
        const user = await User_1.User.findById(decoded.userId).select('-passwordHash');
        if (user) {
            req.user = user;
        }
        next();
    }
    catch (error) {
        next();
    }
};
exports.optionalAuth = optionalAuth;
//# sourceMappingURL=auth.js.map