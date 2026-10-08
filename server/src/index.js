import { env } from './config/env.js';
import { connectDB } from './config/db.js';
import { createApp } from './app.js';
import { startScheduler } from './services/scheduler.js';
import { startTelegramPolling } from './channels/telegram.js';
import { handleTelegramUpdate } from './services/telegramBot.js';
import { logger } from './utils/logger.js';

// A failure inside a background job (one bad source, a dropped connection) must never take the website down.
process.on('unhandledRejection', (reason) => logger.error('[crash-guard] unhandled promise rejection:', reason));
process.on('uncaughtException', (err) => logger.error('[crash-guard] uncaught exception:', err));

async function main() {
  await connectDB();
  const app = createApp();
  app.listen(env.port, () => logger.info(`EmployHunt API on http://localhost:${env.port}`));
  if (env.runScheduler) startScheduler();
  startTelegramPolling(handleTelegramUpdate);
}

main().catch((e) => {
  logger.error('Failed to start', e);
  process.exit(1);
});