import { createApp } from './app';
import { connectDb } from './config/db';
import { env } from './config/env';

// Production refuses to boot without a database and a teacher password.

async function main(): Promise<void> {
  if (env.nodeEnv === 'production' && !process.env.MONGODB_URI) {
    throw new Error('Set MONGODB_URI before starting in production.');
  }
  if (env.nodeEnv === 'production' && !env.appPassword) {
    throw new Error('Set APP_PASSWORD before starting in production.');
  }

  await connectDb();
  const app = createApp();
  const server = app.listen(env.port, () => {
    console.log(`Smart Class API listening on http://localhost:${env.port}`);
  });

  const shutdown = () => {
    server.close(() => process.exit(0));
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
