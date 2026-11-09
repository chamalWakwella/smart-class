import mongoose from 'mongoose';
import { env } from '../config/env';
import { asyncHandler } from '../utils/asyncHandler';
import { todayISO } from '../utils/time';

export const health = asyncHandler(async (_req, res) => {
  res.json({
    success: true,
    data: {
      ok: true,
      db: mongoose.connection.readyState === 1,
    },
  });
});

export const getConfig = asyncHandler(async (_req, res) => {
  res.json({
    success: true,
    data: {
      className: env.className,
      teacherName: env.teacherName,
      teacherPhone: env.teacherPhone,
      currency: env.currency,
      lateAfter: env.lateAfter,
      timezone: env.timezone,
      defaultMonthlyFee: env.defaultMonthlyFee,
      authRequired: Boolean(env.appPassword),
      today: todayISO(),
    },
  });
});
