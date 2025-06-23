"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionController = void 0;
class SubscriptionController {
    static async getUserSubscriptions(_req, res) {
        return res.json({
            success: true,
            message: 'Subscriptions retrieved successfully',
            data: { subscriptions: [] }
        });
    }
}
exports.SubscriptionController = SubscriptionController;
//# sourceMappingURL=subscription.js.map