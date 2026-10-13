import Job from '../models/Job.js';
import Match from '../models/Match.js';
import Application from '../models/Application.js';
import SourceRun from '../models/SourceRun.js';
import Notification from '../models/Notification.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

const days = (n) => new Date(Date.now() - n * 864e5);

/** Replace the old text index (which included full descriptions) with the slim one defined in the Job model. */
async function slimSearchIndex() {
  const indexes = await Job.collection.indexes().catch(() => []);
  const oldText = indexes.find((i) => i.name !== 'job_search' && i.weights && 'description' in i.weights);
  if (oldText) {
    await Job.collection.dropIndex(oldText.name);
    logger.info(`[cleanup] dropped old search index "${oldText.name}"`);
  }
  await Job.createIndexes();
}

/** Delete in chunks so a large first cleanup never sends one huge query. */
async function deleteJobsInChunks(filter) {
  let total = 0;
  const removedIds = [];
  for (;;) {
    const ids = await Job.find(filter).select('_id').limit(5000).lean();
    if (!ids.length) break;
    const batch = ids.map((d) => d._id);
    await Job.deleteMany({ _id: { $in: batch } });
    // Drop unsaved matches pointing at these jobs; saved/applied ones are kept on purpose.
    await Match.deleteMany({ job: { $in: batch }, status: { $in: ['new', 'skipped'] } });
    total += batch.length;
    removedIds.push(...batch);
    if (batch.length < 5000) break;
  }
  return { total, removedIds };
}

/**
 * Keeps the free MongoDB plan (512 MB) healthy:
 * - deletes closed jobs, postings older than JOB_MAX_AGE_DAYS, and old cross-source duplicates
 * - never deletes a job someone saved, applied to, or has in their application tracker
 * - trims old unsaved matches, fetch logs and notifications
 */
export async function runCleanup() {
  const t0 = Date.now();
  await slimSearchIndex().catch((e) => logger.warn(`[cleanup] index: ${e.message}`));

  const [inTracker, savedOrApplied] = await Promise.all([
    Application.distinct('job', { job: { $ne: null } }),
    Match.distinct('job', { status: { $in: ['saved', 'applied'] } }),
  ]);
  const keep = [...inTracker, ...savedOrApplied];

  const { total: jobs } = await deleteJobsInChunks({
    _id: { $nin: keep },
    $or: [{ active: false }, { postedAt: { $lt: days(env.jobMaxAgeDays) } }, { isDuplicate: true, firstSeenAt: { $lt: days(3) } }],
  });

  const [matches, runs, notes] = await Promise.all([
    Match.deleteMany({ status: { $in: ['new', 'skipped'] }, createdAt: { $lt: days(21) } }),
    SourceRun.deleteMany({ startedAt: { $lt: days(2) } }),
    Notification.deleteMany({ createdAt: { $lt: days(30) } }),
  ]);

  const result = { jobs, matches: matches.deletedCount, fetchLogs: runs.deletedCount, notifications: notes.deletedCount, seconds: Math.round((Date.now() - t0) / 1000) };
  logger.info('[cleanup] removed', result);
  return result;
}

/** Rough database size in MB, for logs and the admin overview. */
export async function dbSizeMB() {
  const s = await Job.db.db.stats();
  return { dataMB: Math.round(s.dataSize / 1048576), indexMB: Math.round(s.indexSize / 1048576), totalMB: Math.round((s.dataSize + s.indexSize) / 1048576) };
}