import { Schema, model } from 'mongoose';

const attendanceSchema = new Schema(
  {
    studentId: { type: String, required: true },
    date: { type: String, required: true },
    timestamp: { type: Date, required: true },
    status: { type: String, required: true, enum: ['Present', 'Late'] },
  },
  { versionKey: false },
);

attendanceSchema.index({ studentId: 1, date: 1 }, { unique: true });

export const Attendance = model('Attendance', attendanceSchema);
