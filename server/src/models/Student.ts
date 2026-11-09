import { Schema, model } from 'mongoose';

const studentSchema = new Schema(
  {
    studentId: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    grade: { type: Number, required: true, enum: [9, 10, 11], index: true },
    guardianPhone: { type: String, required: true, trim: true },
    qrCodeData: { type: String, required: true, unique: true },
  },
  { timestamps: true, versionKey: false },
);

export const Student = model('Student', studentSchema);
