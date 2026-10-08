/** Run the fetcher, matcher and alerts in their own process (set RUN_SCHEDULER=false on the API). */
import { connectDB } from './config/db.js';
import { startScheduler } from './services/scheduler.js';
import { logger } from './utils/logger.js';

connectDB()
  .then(() => {
    startScheduler();
    logger.info('Worker running');
  })
  .catch((e) => {
    logger.error(e);
    process.exit(1);
  });
