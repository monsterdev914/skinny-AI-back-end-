import mongoose from 'mongoose';
import { IInvoice } from '../types';
export interface InvoiceDocument extends IInvoice {
}
export declare const Invoice: mongoose.Model<InvoiceDocument, {}, {}, {}, mongoose.Document<unknown, {}, InvoiceDocument> & InvoiceDocument & Required<{
    _id: mongoose.Types.ObjectId;
}>, any>;
//# sourceMappingURL=Invoice.d.ts.map