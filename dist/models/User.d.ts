import mongoose from 'mongoose';
import { IUser } from '../types';
export interface UserDocument extends IUser {
    comparePassword(candidatePassword: string): Promise<boolean>;
    generateVerificationToken(): string;
    generatePasswordResetToken(): string;
}
interface UserModel extends mongoose.Model<UserDocument> {
    findByEmail(email: string): Promise<UserDocument | null>;
    findByVerificationToken(token: string): Promise<UserDocument | null>;
    findByResetPasswordToken(token: string): Promise<UserDocument | null>;
}
export declare const User: UserModel;
export {};
//# sourceMappingURL=User.d.ts.map