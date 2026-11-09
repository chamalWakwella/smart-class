import crypto from 'crypto';
import { env } from '../config/env';
import { Student } from '../models/Student';
import { signToken } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { HttpError } from '../utils/httpError';
import { loginBody, studentLoginBody } from '../validation/schemas';

const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 8;
const attempts = new Map<string, { count: number; start: number }>();

function clientKey(ip: string | undefined, suffix: string): string {
  return `${ip || 'unknown'}:${suffix}`;
}

function locked(ip: string): boolean {
  const row = attempts.get(ip);
  if (!row) return false;
  if (Date.now() - row.start > WINDOW_MS) {
    attempts.delete(ip);
    return false;
  }
  return row.count >= MAX_ATTEMPTS;
}

function recordFail(ip: string): void {
  const now = Date.now();
  const row = attempts.get(ip);
  if (!row || now - row.start > WINDOW_MS) {
    attempts.set(ip, { count: 1, start: now });
    return;
  }
  row.count += 1;
}

function sameSecret(input: string, expected: string): boolean {
  const left = crypto.createHash('sha256').update(input).digest();
  const right = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(left, right);
}

function digits(value: string): string {
  return value.replace(/\D/g, '');
}

export const login = asyncHandler(async (req, res) => {
  if (!env.appPassword) {
    throw new HttpError(400, 'Teacher sign-in is not turned on.');
  }
  const body = loginBody.parse(req.body);
  const ip = clientKey(req.ip, 'admin');
  if (locked(ip)) {
    throw new HttpError(429, 'Too many attempts. Wait a few minutes and try again.');
  }
  if (!sameSecret(body.password, env.appPassword)) {
    recordFail(ip);
    throw new HttpError(401, 'Incorrect password.');
  }
  attempts.delete(ip);
  res.json({ success: true, data: { token: signToken('admin'), role: 'admin' } });
});

export const studentLogin = asyncHandler(async (req, res) => {
  const body = studentLoginBody.parse(req.body);
  const ip = clientKey(req.ip, 'student');
  if (locked(ip)) {
    throw new HttpError(429, 'Too many attempts. Wait a few minutes and try again.');
  }
  const student = await Student.findOne({ studentId: body.studentId });
  const phoneMatches = Boolean(student) && sameSecret(digits(body.guardianPhone), digits(student?.guardianPhone ?? ''));
  if (!student || !phoneMatches) {
    recordFail(ip);
    throw new HttpError(401, 'That student ID and guardian phone do not match.');
  }
  attempts.delete(ip);
  res.json({
    success: true,
    data: {
      token: signToken('student', student.studentId),
      role: 'student',
      studentId: student.studentId,
    },
  });
});

export const session = asyncHandler(async (_req, res) => {
  res.json({ success: true, data: { ok: true, role: 'admin' } });
});
