import { z } from 'zod';
import { isRealDate } from '../utils/time';

const optionalQuery = z.preprocess((value) => {
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  return trimmed ? trimmed : undefined;
}, z.string().max(80).optional());

const optionalGrade = z.preprocess((value) => {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === undefined || raw === null || raw === '' || raw === 'all') return undefined;
  return raw;
}, z.enum(['9', '10', '11']).optional());

export const studentIdSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^MATH-(9|10|11)-\d{3,}$/, 'Student ID should look like MATH-9-001.');

export const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid record id.');

const gradeField = z.coerce
  .number()
  .refine((value) => value === 9 || value === 10 || value === 11, 'Grade must be 9, 10, or 11.');

const phoneField = z
  .string()
  .trim()
  .min(7, 'Enter a guardian phone number.')
  .max(20, 'Phone number is too long.')
  .regex(/^[0-9+\-\s()]+$/, 'Use digits, spaces, and + for the phone number.');

const monthField = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Month should look like 2026-11.');

const dateField = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date should look like 2026-11-04.')
  .refine(isRealDate, 'That date is not a real calendar day.');

export const studentBody = z.object({
  name: z.string().trim().min(2, 'Name should be at least 2 characters.').max(80, 'Name is too long.'),
  grade: gradeField,
  guardianPhone: phoneField,
});

export const studentUpdate = studentBody
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'Nothing to update.');

export const studentListQuery = z.object({
  grade: optionalGrade,
  q: optionalQuery,
});

export const scanBody = z.object({
  qrData: z.string().trim().min(1, 'Scan data is empty.').max(500, 'Scan data is too long.'),
});

export const attendanceQuery = z.object({
  date: z.preprocess((value) => {
    const raw = Array.isArray(value) ? value[0] : value;
    if (typeof raw !== 'string' || !raw.trim()) return undefined;
    return raw.trim();
  }, dateField.optional()),
  grade: optionalGrade,
});

export const feeBody = z.object({
  studentId: studentIdSchema,
  month: monthField,
  amount: z.coerce.number().min(0, 'Amount cannot be negative.').max(1_000_000),
  status: z.enum(['Paid', 'Pending']),
});

export const feeUpdate = z
  .object({
    amount: z.coerce.number().min(0, 'Amount cannot be negative.').max(1_000_000).optional(),
    status: z.enum(['Paid', 'Pending']).optional(),
  })
  .refine((value) => value.amount !== undefined || value.status !== undefined, 'Nothing to update.');

export const feeGenerate = z.object({
  month: monthField,
  amount: z.coerce.number().min(0, 'Amount cannot be negative.').max(1_000_000),
  grade: z.preprocess((value) => {
    if (value === undefined || value === null || value === '') return undefined;
    return value;
  }, gradeField.optional()),
});

export const feeListQuery = z.object({
  studentId: z.preprocess((value) => {
    const raw = Array.isArray(value) ? value[0] : value;
    if (typeof raw !== 'string' || !raw.trim()) return undefined;
    return raw.trim();
  }, studentIdSchema.optional()),
  month: z.preprocess((value) => {
    const raw = Array.isArray(value) ? value[0] : value;
    if (typeof raw !== 'string' || !raw.trim()) return undefined;
    return raw.trim();
  }, monthField.optional()),
  status: z.preprocess((value) => {
    const raw = Array.isArray(value) ? value[0] : value;
    if (raw === undefined || raw === null || raw === '' || raw === 'all') return undefined;
    return raw;
  }, z.enum(['Paid', 'Pending']).optional()),
});

export const feeDashboardQuery = z.object({
  month: z.preprocess((value) => {
    const raw = Array.isArray(value) ? value[0] : value;
    if (typeof raw !== 'string' || !raw.trim()) return undefined;
    return raw.trim();
  }, monthField.optional()),
  grade: optionalGrade,
  status: z.preprocess((value) => {
    const raw = Array.isArray(value) ? value[0] : value;
    if (raw === undefined || raw === null || raw === '' || raw === 'all') return undefined;
    return raw;
  }, z.enum(['Paid', 'Pending']).optional()),
  q: optionalQuery,
});

const markFields = {
  studentId: studentIdSchema,
  examTitle: z.string().trim().min(2, 'Exam title is too short.').max(80, 'Exam title is too long.'),
  score: z.coerce.number().min(0, 'Score cannot be negative.').max(10_000),
  totalMarks: z.coerce.number().positive('Total marks must be greater than zero.').max(10_000),
  date: dateField,
};

export const markBody = z
  .object(markFields)
  .refine((value) => value.score <= value.totalMarks, {
    message: 'Score cannot exceed the total.',
    path: ['score'],
  });

export const markUpdate = z
  .object({
    examTitle: markFields.examTitle.optional(),
    score: markFields.score.optional(),
    totalMarks: markFields.totalMarks.optional(),
    date: markFields.date.optional(),
  })
  .refine((value) => Object.values(value).some((item) => item !== undefined), 'Nothing to update.');

export const markListQuery = z.object({
  studentId: z.preprocess((value) => {
    const raw = Array.isArray(value) ? value[0] : value;
    if (typeof raw !== 'string' || !raw.trim()) return undefined;
    return raw.trim();
  }, studentIdSchema.optional()),
  examTitle: optionalQuery,
  grade: optionalGrade,
});

export const loginBody = z.object({
  password: z.string().min(1, 'Enter the class password.'),
});

export const studentLoginBody = z.object({
  studentId: studentIdSchema,
  guardianPhone: z.string().trim().min(7, 'Enter the guardian phone number.').max(20),
});

export function parseStudentId(value: string): string {
  return studentIdSchema.parse(value);
}
