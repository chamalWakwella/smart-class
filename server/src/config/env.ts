import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

function numberFrom(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const FALLBACK_MONTHLY_FEE = 1000;

export const env = {
  port: numberFrom(process.env.PORT, 5000),
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/smart-class',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  nodeEnv: process.env.NODE_ENV || 'development',
  lateAfter: process.env.CLASS_LATE_AFTER || '16:15',
  timezone: process.env.APP_TIMEZONE || 'Asia/Colombo',
  currency: process.env.CURRENCY || 'Rs.',
  defaultMonthlyFee: numberFrom(process.env.DEFAULT_MONTHLY_FEE, FALLBACK_MONTHLY_FEE),
  appPassword: process.env.APP_PASSWORD || '',
  className: process.env.CLASS_NAME || 'Smart Class Mathematics',
  teacherName: process.env.TEACHER_NAME || 'Chamal Wakwella',
  teacherPhone: process.env.TEACHER_PHONE || '0764629455',
};
