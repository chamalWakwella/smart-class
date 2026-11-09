import mongoose from 'mongoose';
import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { env } from '../config/env';
import { HttpError } from '../utils/httpError';

function duplicateMessage(err: { keyPattern?: Record<string, unknown> }): string {
  const keys = Object.keys(err.keyPattern ?? {});
  if (keys.includes('date') && keys.includes('studentId')) {
    return 'Attendance for this student is already marked today.';
  }
  if (keys.includes('month') && keys.includes('studentId')) {
    return 'This student already has a fee for that month.';
  }
  if (keys.includes('examTitle')) {
    return 'Marks for this exam already exist. Edit the existing row.';
  }
  return 'That record already exists.';
}

export const errorHandler: ErrorRequestHandler = (err: unknown, _req, res, next) => {
  if (res.headersSent) {
    next(err);
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      message: err.issues[0]?.message ?? 'Check the details and try again.',
    });
    return;
  }

  if (err instanceof HttpError) {
    res.status(err.status).json({ success: false, message: err.message });
    return;
  }

  if (typeof err === 'object' && err !== null && 'code' in err && (err as { code?: number }).code === 11000) {
    res.status(409).json({
      success: false,
      message: duplicateMessage(err as { keyPattern?: Record<string, unknown> }),
    });
    return;
  }

  if (err instanceof SyntaxError && 'status' in err && (err as { status?: number }).status === 400) {
    res.status(400).json({ success: false, message: 'The request body is not valid JSON.' });
    return;
  }

  if (err instanceof mongoose.Error.CastError) {
    res.status(400).json({ success: false, message: 'Invalid record id.' });
    return;
  }

  console.error(err);
  const message =
    env.nodeEnv === 'production'
      ? 'Something went wrong.'
      : err instanceof Error
        ? err.message
        : 'Something went wrong.';
  res.status(500).json({ success: false, message });
};
