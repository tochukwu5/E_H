import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

export async function connectDB() {
  mongoose.set('strictQuery', true);
  await mongoose.connect(env.mongoUri, { autoIndex: true });
  logger.info(`MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
}
