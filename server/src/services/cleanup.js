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

/**
 * After deleting lots of jobs, MongoDB keeps the old index space reserved, so indexes can end up
 * far bigger than the data. Rebuilding them gives that space back. Only runs when indexes are bloated.
 */
async function rebuildBloatedIndexes() {
  const s = await Job.db.db.stats();
  const dataMB = s.dataSize / 1048576;
  const indexMB = s.indexSize / 1048576;
  if (indexMB < 60 || indexMB < dataMB * 1.5) return false;
  logger.warn(`[cleanup] indexes are ${Math.round(indexMB)} MB for ${Math.round(dataMB)} MB of data, rebuilding them`);
  await Job.collection.dropIndexes(); // keeps the built-in _id index
  await Job.createIndexes();
  const after = await Job.db.db.stats();
  logger.info(`[cleanup] indexes rebuilt: ${Math.round(indexMB)} MB → ${Math.round(after.indexSize / 1048576)} MB`);
  return true;
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

  const { total: aged } = await deleteJobsInChunks({
    _id: { $nin: keep },
    $or: [
      { active: false },
      { postedAt: { $lt: days(env.jobMaxAgeDays) } },
      // Some sources don't give a posting date: use the day we first found the job instead.
      { postedAt: null, firstSeenAt: { $lt: days(env.jobMaxAgeDays) } },
      { isDuplicate: true, firstSeenAt: { $lt: days(3) } },
    ],
  });

  // Hard cap: if there are still too many jobs, remove the oldest ones (never the kept ones).
  let capped = 0;
  const count = await Job.estimatedDocumentCount();
  if (count > env.jobMaxCount) {
    const cutoff = await Job.find({ _id: { $nin: keep } }).sort({ firstSeenAt: -1 }).skip(env.jobMaxCount).limit(1).select('firstSeenAt').lean();
    if (cutoff[0]?.firstSeenAt) {
      ({ total: capped } = await deleteJobsInChunks({ _id: { $nin: keep }, firstSeenAt: { $lte: cutoff[0].firstSeenAt } }));
    }
  }
  const jobs = aged + capped;

  const [matches, runs, notes] = await Promise.all([
    Match.deleteMany({ status: { $in: ['new', 'skipped'] }, createdAt: { $lt: days(21) } }),
    SourceRun.deleteMany({ startedAt: { $lt: days(2) } }),
    Notification.deleteMany({ createdAt: { $lt: days(30) } }),
  ]);

  const rebuilt = await rebuildBloatedIndexes().catch((e) => logger.warn(`[cleanup] index rebuild: ${e.message}`));

  const result = { jobs, indexesRebuilt: Boolean(rebuilt), matches: matches.deletedCount, fetchLogs: runs.deletedCount, notifications: notes.deletedCount, seconds: Math.round((Date.now() - t0) / 1000) };
  logger.info('[cleanup] removed', result);
  return result;
}

/** Run a cleanup first if the database is getting close to the 512 MB limit. Called before each fetch. */
export async function cleanupIfLarge() {
  const { totalMB } = await dbSizeMB();
  if (totalMB < env.dbSoftLimitMB) return null;
  logger.warn(`[cleanup] database is ${totalMB} MB (limit ${env.dbSoftLimitMB} MB), cleaning up before fetching`);
  return runCleanup();
}

/** Rough database size in MB, for logs and the admin overview. */
export async function dbSizeMB() {
  const s = await Job.db.db.stats();
  return { dataMB: Math.round(s.dataSize / 1048576), indexMB: Math.round(s.indexSize / 1048576), totalMB: Math.round((s.dataSize + s.indexSize) / 1048576) };
}