import mongoose from 'mongoose';
import { IPaymentMethod } from '../types';
export interface PaymentMethodDocument extends IPaymentMethod {
}
export declare const PaymentMethod: mongoose.Model<PaymentMethodDocument, {}, {}, {}, mongoose.Document<unknown, {}, PaymentMethodDocument> & PaymentMethodDocument & Required<{
    _id: mongoose.Types.ObjectId;
}>, any>;
//# sourceMappingURL=PaymentMethod.d.ts.map