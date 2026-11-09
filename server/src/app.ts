import fs from 'fs';
import path from 'path';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import apiRouter from './routes';

function clientDistPath(): string | null {
  const candidates = [
    path.resolve(__dirname, '../../client/dist'),
    path.resolve(process.cwd(), '../client/dist'),
    path.resolve(process.cwd(), 'client/dist'),
  ];
  return candidates.find((candidate) => fs.existsSync(path.join(candidate, 'index.html'))) ?? null;
}

function originAllowed(origin: string): boolean {
  const allowed = env.clientOrigin
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  if (allowed.includes(origin)) return true;
  if (env.nodeEnv !== 'production' && /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) return true;
  try {
    const host = new URL(origin).hostname;
    if (host === 'vercel.app' || host.endsWith('.vercel.app')) return true;
  } catch {
    return false;
  }
  return false;
}

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || originAllowed(origin)) {
          callback(null, true);
          return;
        }
        callback(null, false);
      },
      allowedHeaders: ['Content-Type', 'Authorization'],
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use((req, res, next) => {
    if (!req.path.startsWith('/api')) {
      next();
      return;
    }
    const started = Date.now();
    res.on('finish', () => {
      console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - started}ms`);
    });
    next();
  });

  app.use('/api', apiRouter);

  if (env.nodeEnv === 'production' && !process.env.VERCEL) {
    const dist = clientDistPath();
    if (dist) {
      app.use(express.static(dist, { index: false, maxAge: '1d' }));
      app.use((req, res, next) => {
        if ((req.method !== 'GET' && req.method !== 'HEAD') || req.path.startsWith('/api')) {
          next();
          return;
        }
        res.setHeader('Cache-Control', 'no-cache');
        res.sendFile(path.join(dist, 'index.html'));
      });
    } else {
      console.warn('Client build was not found. The API is running without the dashboard.');
    }
  }

  app.use((_req, res) => {
    res.status(404).json({ success: false, message: 'Not found.' });
  });
  app.use(errorHandler);
  return app;
}
