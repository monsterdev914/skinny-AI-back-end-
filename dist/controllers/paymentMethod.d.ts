import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
export declare class PaymentMethodController {
    static getUserPaymentMethods(_req: AuthenticatedRequest, res: Response): Promise<Response<any, Record<string, any>>>;
}
//# sourceMappingURL=paymentMethod.d.ts.map