import mongoose from 'mongoose';
import { ISubscription } from '../types';
export interface SubscriptionDocument extends ISubscription {
}
export declare const Subscription: mongoose.Model<SubscriptionDocument, {}, {}, {}, mongoose.Document<unknown, {}, SubscriptionDocument> & SubscriptionDocument & Required<{
    _id: mongoose.Types.ObjectId;
}>, any>;
//# sourceMappingURL=Subscription.d.ts.map