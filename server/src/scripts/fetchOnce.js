/** `npm run fetch:once [source]` — run the fetcher once and exit. Handy for testing a source. */
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { runFetch } from '../services/fetcher.js';
import { logger } from '../utils/logger.js';

const only = process.argv[2];
connectDB()
  .then(() => runFetch({ only }))
  .then((r) => logger.info('Result:', r))
  .catch((e) => logger.error(e))
  .finally(() => mongoose.disconnect());
