import mongoose from 'mongoose';
import { env } from './env';

mongoose.set('strictQuery', true);

let connection: Promise<typeof mongoose> | null = null;

function databaseHost(uri: string): string {
  const normalized = uri.replace(/^mongodb(?:\+srv)?:\/\//, 'https://');
  try {
    return new URL(normalized).hostname;
  } catch {
    return '';
  }
}

export function connectDb(): Promise<typeof mongoose> {
  const uri = process.env.MONGODB_URI || '';
  const host = databaseHost(uri);
  const onVercel = Boolean(process.env.VERCEL);
  const localOnly = !uri || host === 'localhost' || host === '127.0.0.1';
  if (onVercel && localOnly) {
    return Promise.reject(new Error('Set MONGODB_URI before starting in production.'));
  }
  if (!connection) {
    connection = mongoose
      .connect(env.mongoUri, { serverSelectionTimeoutMS: 8000 })
      .catch((error: unknown) => {
        connection = null;
        throw error;
      });
  }
  return connection;
}
