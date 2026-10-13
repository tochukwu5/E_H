import cron from 'node-cron';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { runFetch } from './fetcher.js';
import { sendDigests, notifyUser } from './notifier.js';
import Application from '../models/Application.js';
import User from '../models/User.js';
  import { runCleanup } from './cleanup.js';

async function followUps() {
  const due = await Application.find({ status: 'applied', followUpSent: false, followUpAt: { $lte: new Date() } }).limit(500);
  for (const app of due) {
    const user = await User.findById(app.user);
    if (user) {
      await notifyUser(user, {
        type: 'follow_up',
        title: `Time to follow up with ${app.company}`,
        body: `You applied for ${app.title} ${Math.round((Date.now() - app.appliedAt) / 864e5)} days ago. A short, polite follow-up often gets a reply.`,
        link: '/app/applications',
      });
    }
    app.followUpSent = true;
    await app.save();
  }
}

/** Downgrade plans whose paid period ended (until a payment provider is wired up). */
async function expirePlans() {
  await User.updateMany({ plan: { $ne: 'free' }, planRenewsAt: { $lt: new Date() } }, { $set: { plan: 'free' } });
}

export function startScheduler() {
  const safe = (name, fn) => async () => {
    try {
      await fn();
    } catch (e) {
      logger.error(`[cron:${name}]`, e);
    }
  };
  cron.schedule(env.fetchCron, safe('fetch', () => runFetch()));
  cron.schedule('5 * * * *', safe('digest', sendDigests));
  cron.schedule('20 */3 * * *', safe('followups', followUps));
  cron.schedule('0 3 * * *', safe('plans', expirePlans));
      cron.schedule('30 3 * * *', safe('cleanup', runCleanup)); // nightly, keeps the database small
    setTimeout(safe('cleanup-boot', runCleanup), 20_000); // also once shortly after every start/deploy
  logger.info(`[cron] scheduler started (fetch: "${env.fetchCron}")`);
  // First fetch shortly after boot so a fresh install has jobs to show.
  setTimeout(safe('fetch-boot', () => runFetch()), 10_000);
}
