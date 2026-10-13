/** `npm run cleanup` — shrink the database now and print the size before and after. */
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { runCleanup, dbSizeMB } from '../services/cleanup.js';
import { logger } from '../utils/logger.js';

connectDB()
  .then(async () => {
    logger.info('Size before:', await dbSizeMB());
    await runCleanup();
    logger.info('Size after:', await dbSizeMB());
  })
  .catch((e) => logger.error(e))
  .finally(() => mongoose.disconnect());