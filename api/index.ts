import type { IncomingMessage, ServerResponse } from 'http';
import { createApp } from '../server/src/app';
import { connectDb } from '../server/src/config/db';

const app = createApp();

export const maxDuration = 15;

function headerValue(req: IncomingMessage, name: string): string {
  const value = req.headers[name];
  return Array.isArray(value) ? value[0] || '' : value || '';
}

function incomingPath(req: IncomingMessage): string {
  const candidates = ['x-forwarded-uri', 'x-original-url', 'x-invoke-path', 'x-vercel-forwarded-path'];
  for (const name of candidates) {
    const value = headerValue(req, name);
    if (value.startsWith('/api/')) return value;
  }
  return req.url || '/';
}

function withApiPrefix(url: string): string {
  const queryAt = url.indexOf('?');
  const path = queryAt === -1 ? url : url.slice(0, queryAt);
  const search = queryAt === -1 ? '' : url.slice(queryAt);
  if (path === '/api' || path.startsWith('/api/')) return url;
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `/api${normalized}${search}`;
}

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    await connectDb();
  } catch (error) {
    console.error(error);
    const message = process.env.MONGODB_URI
      ? 'The class database is not responding.'
      : 'Set MONGODB_URI on Vercel before the register can open.';
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: false, message }));
    return;
  }

  req.url = withApiPrefix(incomingPath(req));
  app(req, res);
}
