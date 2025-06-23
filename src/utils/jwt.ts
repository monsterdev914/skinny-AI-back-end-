import jwt from 'jsonwebtoken';
import { JWTPayload } from '../types';

export const generateAccessToken = (payload: Omit<JWTPayload, 'iat' | 'exp'>): string => {
    return jwt.sign(payload, (process.env as any).JWT_SECRET!, {
        expiresIn: (process.env as any).JWT_EXPIRES_IN || '7d'
    });
};

export const generateRefreshToken = (payload: Omit<JWTPayload, 'iat' | 'exp'>): string => {
    return jwt.sign(payload, (process.env as any).JWT_REFRESH_SECRET!, {
        expiresIn: (process.env as any).JWT_REFRESH_EXPIRES_IN || '30d'
    });
};

export const verifyAccessToken = (token: string): JWTPayload => {
    return jwt.verify(token, (process.env as any).JWT_SECRET!) as JWTPayload;
};

export const verifyRefreshToken = (token: string): JWTPayload => {
    return jwt.verify(token, (process.env as any).JWT_REFRESH_SECRET!) as JWTPayload;
};

export const decodeToken = (token: string): JWTPayload | null => {
    try {
        return jwt.decode(token) as JWTPayload;
    } catch (error) {
        return null;
    }
}; 