import mongoose from 'mongoose';
import env from './config/env.js';
import connectDB from './config/db.js';
import app from './app.js';

async function start(): Promise<void> {
  // Connect first: the server should not accept requests it cannot serve.
  await connectDB();

  const server = app.listen(env.port, () => {
    console.log(`FinTrack AI API running on port ${env.port} (${env.nodeEnv})`);
  });

  // Hosts send SIGTERM before replacing the process on a new deploy.
  const shutdown = (signal: string) => {
    console.log(`${signal} received, shutting down...`);
    server.close(async () => {
      await mongoose.connection.close();
      process.exit(0);
    });
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start().catch(err => {
  console.error('Failed to start server:', err.message);
  process.exit(1);
});
