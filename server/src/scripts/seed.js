/**
 * Creates the admin account and a starter list of company boards on the green ATS platforms.
 * Board slugs change over time; any that keep failing are paused automatically.
 * Grow this list in Admin → Companies (bulk paste supports board URLs).
 */
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { env } from '../config/env.js';
import User from '../models/User.js';
import Company from '../models/Company.js';
import { logger } from '../utils/logger.js';

const STARTER = {
  greenhouse: ['stripe', 'airbnb', 'figma', 'discord', 'gitlab', 'coinbase', 'robinhood', 'dropbox', 'reddit', 'duolingo', 'cloudflare', 'datadog', 'twilio', 'mongodb', 'elastic', 'gusto', 'brex', 'instacart', 'pinterest', 'lyft', 'andela', 'chippercash', 'deel', 'remotecom', 'grafanalabs'],
  lever: ['palantir', 'plaid', 'spotify', 'kraken', 'netlify', 'zapier', 'toptal', 'binance', 'mozilla', 'wealthsimple'],
  ashby: ['openai', 'notion', 'ramp', 'linear', 'vercel', 'supabase', 'replit', 'posthog', 'retool', 'deno', 'raycast', 'cursor'],
  recruitee: ['bunq', 'mollie'],
  personio: ['personio'],
  teamtailor: ['career'],
};

const title = (s) => s.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

async function main() {
  await connectDB();

  if (env.adminEmail && env.adminPassword) {
    let admin = await User.findOne({ email: env.adminEmail.toLowerCase() });
    if (!admin) {
      admin = new User({ name: 'Admin', email: env.adminEmail, role: 'admin', plan: 'premium', onboarded: true });
      await admin.setPassword(env.adminPassword);
      await admin.save();
      logger.info(`Admin created: ${env.adminEmail}`);
    } else {
      logger.info(`Admin already exists: ${env.adminEmail}`);
    }
  }

  let added = 0;
  for (const [ats, slugs] of Object.entries(STARTER)) {
    for (const slug of slugs) {
      const r = await Company.updateOne({ ats, slug }, { $setOnInsert: { name: title(slug), active: true } }, { upsert: true });
      if (r.upsertedCount) added++;
    }
  }
  logger.info(`Companies: ${added} added (${await Company.countDocuments()} total)`);
  await mongoose.disconnect();
}

main().catch((e) => {
  logger.error(e);
  process.exit(1);
});
