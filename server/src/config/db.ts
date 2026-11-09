import mongoose from 'mongoose';
import { env } from './env';

mongoose.set('strictQuery', true);

let connection: Promise<typeof mongoose> | null = null;

export function connectDb(): Promise<typeof mongoose> {
  if (!process.env.MONGODB_URI && (process.env.VERCEL || env.nodeEnv === 'production')) {
    return Promise.reject(new Error('Set MONGODB_URI before starting in production.'));
  }
  if (!connection) {
    connection = mongoose.connect(env.mongoUri).catch((error: unknown) => {
      connection = null;
      throw error;
    });
  }
  return connection;
}
