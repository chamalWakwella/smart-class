import { Counter } from '../models/Counter';

export async function nextStudentId(grade: 9 | 10 | 11): Promise<string> {
  const counter = await Counter.findOneAndUpdate(
    { key: `student-${grade}` },
    { $inc: { seq: 1 } },
    { new: true, upsert: true },
  );
  const seq = counter?.seq ?? 1;
  return `MATH-${grade}-${String(seq).padStart(3, '0')}`;
}
