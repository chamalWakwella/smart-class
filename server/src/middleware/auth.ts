import crypto from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';

const TWELVE_HOURS = 12 * 60 * 60 * 1000;

export type AuthRole = 'admin' | 'student';

export type TokenPayload = {
  role: AuthRole;
  studentId?: string;
  exp: number;
};

declare global {
  namespace Express {
    interface Request {
      authRole?: AuthRole;
      studentId?: string;
    }
  }
}

function secret(): string {
  return env.appPassword || 'smart-class-local-dev';
}

export function signToken(role: AuthRole, studentId?: string): string {
  const body: TokenPayload = { role, exp: Date.now() + TWELVE_HOURS };
  if (studentId) body.studentId = studentId;
  const payload = Buffer.from(JSON.stringify(body)).toString('base64url');
  const signature = crypto.createHmac('sha256', secret()).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

export function verifyToken(token: string): TokenPayload | null {
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;
  const expected = crypto.createHmac('sha256', secret()).update(payload).digest('base64url');
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) return null;
  try {
    const body = JSON.parse(Buffer.from(payload, 'base64url').toString()) as Partial<TokenPayload>;
    if (body.role !== 'admin' && body.role !== 'student') return null;
    if (typeof body.exp !== 'number' || body.exp <= Date.now()) return null;
    if (body.role === 'student' && typeof body.studentId !== 'string') return null;
    return {
      role: body.role,
      exp: body.exp,
      ...(typeof body.studentId === 'string' ? { studentId: body.studentId } : {}),
    };
  } catch {
    return null;
  }
}

function bearer(req: Request): TokenPayload | null {
  const header = req.header('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) return null;
  return verifyToken(token);
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const payload = bearer(req);
  if (payload?.role === 'student') {
    res.status(403).json({ success: false, message: 'That page is for the teacher.' });
    return;
  }
  if (!env.appPassword) {
    req.authRole = 'admin';
    next();
    return;
  }
  if (payload?.role !== 'admin') {
    res.status(401).json({ success: false, message: 'Sign in as the teacher to continue.' });
    return;
  }
  req.authRole = 'admin';
  next();
}

export function requireStudent(req: Request, res: Response, next: NextFunction): void {
  const payload = bearer(req);
  if (payload?.role !== 'student' || !payload.studentId) {
    res.status(401).json({ success: false, message: 'Sign in with your student ID to continue.' });
    return;
  }
  req.authRole = 'student';
  req.studentId = payload.studentId;
  next();
}
