import { Schema, model } from 'mongoose';

const markSchema = new Schema(
  {
    studentId: { type: String, required: true },
    examTitle: { type: String, required: true, trim: true },
    score: { type: Number, required: true, min: 0 },
    totalMarks: { type: Number, required: true, min: 0 },
    date: { type: String, required: true },
  },
  { versionKey: false },
);

markSchema.index({ studentId: 1, examTitle: 1 }, { unique: true });
markSchema.index({ examTitle: 1, date: -1 });

export const Mark = model('Mark', markSchema);
