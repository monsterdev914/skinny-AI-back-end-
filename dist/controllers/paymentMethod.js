"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentMethodController = void 0;
class PaymentMethodController {
    static async getUserPaymentMethods(_req, res) {
        return res.json({
            success: true,
            message: 'Payment methods retrieved successfully',
            data: { paymentMethods: [] }
        });
    }
}
exports.PaymentMethodController = PaymentMethodController;
//# sourceMappingURL=paymentMethod.js.map