import { Schema, model } from 'mongoose';

const feeSchema = new Schema(
  {
    studentId: { type: String, required: true },
    month: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    status: { type: String, required: true, enum: ['Paid', 'Pending'] },
    paidDate: { type: Date, default: null },
  },
  { versionKey: false },
);

feeSchema.index({ studentId: 1, month: 1 }, { unique: true });

export const Fee = model('Fee', feeSchema);
