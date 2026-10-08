import Job from '../models/Job.js';
import Company from '../models/Company.js';
import SourceRun from '../models/SourceRun.js';
import User from '../models/User.js';
import { SOURCES, isEnabled, getSource } from '../sources/index.js';
import { normalizeJob } from './normalize.js';
import { pool } from '../utils/http.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';
import { processNewJobs } from './matcher.js';

let running = false;
export const isFetching = () => running;

/** Keywords for search-based sources: what users actually track, plus defaults. */
async function trackedKeywords() {
  const rows = await User.aggregate([
    { $unwind: '$searches' },
    { $match: { 'searches.active': true } },
    { $unwind: '$searches.titles' },
    { $group: { _id: { $toLower: '$searches.titles' }, n: { $sum: 1 } } },
    { $sort: { n: -1 } },
    { $limit: 15 },
  ]);
  const fromUsers = rows.map((r) => r._id).filter(Boolean);
  return [...new Set([...fromUsers, ...env.defaultKeywords])].slice(0, 20);
}

/** Upsert normalized jobs; returns ids of jobs we had never seen before. */
export async function saveJobs(jobs) {
  if (!jobs.length) return { inserted: [], updated: 0 };
  const valid = jobs.filter((j) => j.url && j.title);
  const ops = valid.map((j) => {
    const { slug, ...rest } = j;
    return { updateOne: { filter: { externalKey: j.externalKey }, update: { $set: rest, $setOnInsert: { slug, firstSeenAt: new Date() } }, upsert: true } };
  });
  const res = await Job.bulkWrite(ops, { ordered: false });
  const insertedIds = Object.values(res.upsertedIds || {});

  // Mark cross-source duplicates: the earliest-seen copy stays canonical.
  if (insertedIds.length) {
    const fresh = await Job.find({ _id: { $in: insertedIds } }, 'dedupeKey');
    const keys = [...new Set(fresh.map((f) => f.dedupeKey))];
    const existing = await Job.find({ dedupeKey: { $in: keys }, _id: { $nin: insertedIds }, isDuplicate: false, active: true }, 'dedupeKey');
    const dupKeys = new Set(existing.map((e) => e.dedupeKey));
    const dupIds = fresh.filter((f) => dupKeys.has(f.dedupeKey)).map((f) => f._id);
    if (dupIds.length) await Job.updateMany({ _id: { $in: dupIds } }, { $set: { isDuplicate: true }, $addToSet: { flags: 'duplicate' } });
    return { inserted: insertedIds.filter((id) => !dupIds.some((d) => String(d) === String(id))), updated: res.modifiedCount };
  }
  return { inserted: [], updated: res.modifiedCount };
}

async function recordRun(source, fn) {
  const run = await SourceRun.create({ source, startedAt: new Date() });
  const t0 = Date.now();
  try {
    const r = await fn();
    Object.assign(run, { ok: true, ...r });
    return r;
  } catch (e) {
    Object.assign(run, { ok: false, error: String(e.message || e).slice(0, 500) });
    logger.warn(`[fetch] ${source} failed: ${e.message}`);
    return { inserted: 0, newIds: [] };
  } finally {
    run.finishedAt = new Date();
    run.durationMs = Date.now() - t0;
    await run.save();
  }
}

async function fetchFeedSource(source, ctx) {
  return recordRun(source.id, async () => {
    const raw = await source.fetch(ctx);
    const jobs = raw.map((r) => normalizeJob(r, source));
    const { inserted, updated } = await saveJobs(jobs);
    return { fetched: raw.length, inserted: inserted.length, updated, newIds: inserted };
  });
}

async function fetchAtsSource(source) {
  const companies = await Company.find({ ats: source.id, active: true });
  if (!companies.length) {
    await SourceRun.create({ source: source.id, ok: true, skipped: true, error: 'No companies added yet', finishedAt: new Date(), durationMs: 0 });
    return { newIds: [] };
  }
  return recordRun(source.id, async () => {
    let fetched = 0;
    const newIds = [];
    let updated = 0;
    await pool(companies, 6, async (c) => {
      try {
        const raw = await source.fetchCompany(c);
        const jobs = raw.map((r) => normalizeJob(r, source));
        const res = await saveJobs(jobs);
        fetched += raw.length;
        updated += res.updated;
        newIds.push(...res.inserted);
        await Company.updateOne({ _id: c._id }, { lastFetchedAt: new Date(), lastError: null, jobCount: raw.length, failures: 0 });
      } catch (e) {
        const failures = (c.failures || 0) + 1;
        // A board that 404s five times in a row has probably moved: pause it so we stay polite.
        await Company.updateOne({ _id: c._id }, { lastFetchedAt: new Date(), lastError: e.message, failures, ...(failures >= 5 && e.status === 404 ? { active: false } : {}) });
      }
    });
    return { fetched, inserted: newIds.length, updated, newIds };
  });
}

/** Run one source or every enabled source, then match the new jobs to users. */
export async function runFetch({ only } = {}) {
  if (running) return { skipped: true, reason: 'A fetch is already running' };
  running = true;
  const t0 = Date.now();
  try {
    const ctx = { keywords: await trackedKeywords() };
    const list = only ? [getSource(only)].filter(Boolean) : SOURCES;
    const newIds = [];
    for (const s of list) {
      if (s.group !== 'ats' && !isEnabled(s)) continue;
      const r = s.group === 'ats' ? await fetchAtsSource(s) : await fetchFeedSource(s, ctx);
      newIds.push(...(r?.newIds || []));
    }
    // Jobs not seen for 10 days are treated as closed.
    await Job.updateMany({ active: true, lastSeenAt: { $lt: new Date(Date.now() - 10 * 864e5) } }, { $set: { active: false } });
    logger.info(`[fetch] done in ${((Date.now() - t0) / 1000).toFixed(1)}s, ${newIds.length} new jobs`);
    if (newIds.length) await processNewJobs(newIds);
    return { newJobs: newIds.length, seconds: (Date.now() - t0) / 1000 };
  } finally {
    running = false;
  }
}
