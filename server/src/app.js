import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import { notFound, errorHandler } from './middleware/error.js';
import authRoutes from './routes/auth.js';
import meRoutes from './routes/me.js';
import matchRoutes from './routes/matches.js';
import applicationRoutes from './routes/applications.js';
import publicRoutes from './routes/public.js';
import billingRoutes from './routes/billing.js';
import adminRoutes from './routes/admin.js';

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors({ origin: env.clientUrl.split(','), credentials: true }));
  app.use(compression());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false }));
  app.use(cookieParser());
  if (!env.isProd) app.use(morgan('dev'));

  app.use('/api', rateLimit({ windowMs: 60 * 1000, limit: 300, standardHeaders: true, legacyHeaders: false }));
  app.get('/api/health', (_req, res) => res.json({ ok: true, time: new Date() }));
  app.use('/api/auth', authRoutes);
  app.use('/api/me', meRoutes);
  app.use('/api/matches', matchRoutes);
  app.use('/api/applications', applicationRoutes);
  app.use('/api/billing', billingRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api', publicRoutes);
  app.get('/sitemap.xml', (req, res, next) => {
    req.url = '/sitemap.xml';
    publicRoutes(req, res, next);
  });

  // In production, serve the built React app from the same origin.
  const dist = path.resolve('../client/dist');
  if (env.isProd && fs.existsSync(dist)) {
    app.use(express.static(dist, { maxAge: '7d', index: false }));
    app.get(/^\/(?!api).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')));
  }

  app.use('/api', notFound);
  app.use(errorHandler);
  return app;
}
