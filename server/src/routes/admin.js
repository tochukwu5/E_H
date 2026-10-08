import { Router } from 'express';
import { z } from 'zod';
import User from '../models/User.js';
import Job from '../models/Job.js';
import Match from '../models/Match.js';
import Application from '../models/Application.js';
import Company from '../models/Company.js';
import SourceRun from '../models/SourceRun.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { asyncHandler, HttpError } from '../middleware/error.js';
import { validate } from '../middleware/validate.js';
import { runFetch, isFetching } from '../services/fetcher.js';
import { SOURCES, publicSourceInfo, getSource } from '../sources/index.js';
import { ATS_SOURCES } from '../sources/ats.js';

const r = Router();
r.use(requireAuth, requireAdmin);

r.get(
  '/overview',
  asyncHandler(async (_req, res) => {
    const day = new Date(Date.now() - 864e5);
    const [users, usersToday, byPlan, jobs, jobsToday, matchesToday, apps, companies] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ createdAt: { $gte: day } }),
      User.aggregate([{ $group: { _id: '$plan', n: { $sum: 1 } } }]),
      Job.countDocuments({ active: true, isDuplicate: false }),
      Job.countDocuments({ firstSeenAt: { $gte: day } }),
      Match.countDocuments({ createdAt: { $gte: day } }),
      Application.countDocuments(),
      Company.countDocuments({ active: true }),
    ]);
    const plans = Object.fromEntries(byPlan.map((p) => [p._id, p.n]));
    const mrr = (plans.basic || 0) * 15 + (plans.pro || 0) * 29 + (plans.premium || 0) * 49;
    res.json({ users, usersToday, plans, mrr, jobs, jobsToday, matchesToday, apps, companies, fetching: isFetching() });
  })
);

r.get(
  '/sources',
  asyncHandler(async (_req, res) => {
    const since = new Date(Date.now() - 864e5);
    const stats = await SourceRun.aggregate([
      { $match: { startedAt: { $gte: since }, skipped: { $ne: true } } },
      { $sort: { startedAt: -1 } },
      { $group: { _id: '$source', runs: { $sum: 1 }, ok: { $sum: { $cond: ['$ok', 1, 0] } }, inserted: { $sum: '$inserted' }, lastError: { $first: '$error' }, lastOk: { $first: '$ok' }, lastAt: { $first: '$finishedAt' }, avgMs: { $avg: '$durationMs' } } },
    ]);
    const by = Object.fromEntries(stats.map((s) => [s._id, s]));
    const jobs = await Job.aggregate([{ $match: { active: true } }, { $group: { _id: '$source', n: { $sum: 1 } } }]);
    const jobsBy = Object.fromEntries(jobs.map((j) => [j._id, j.n]));
    res.json({ sources: SOURCES.map((s) => ({ ...publicSourceInfo(s), health: by[s.id] || null, activeJobs: jobsBy[s.id] || 0 })), fetching: isFetching() });
  })
);

r.post(
  '/fetch',
  validate(z.object({ source: z.string().optional() })),
  asyncHandler(async (req, res) => {
    if (req.body.source && !getSource(req.body.source)) throw new HttpError(404, 'Unknown source.');
    if (isFetching()) throw new HttpError(409, 'A fetch is already running.');
    runFetch({ only: req.body.source }).catch(() => {});
    res.status(202).json({ started: true });
  })
);

// ─── Companies (ATS boards) ───────────────────────────────
const atsIds = ATS_SOURCES.map((s) => s.id);
r.get(
  '/companies',
  asyncHandler(async (req, res) => {
    const { q, ats, page = 1 } = req.query;
    const f = {};
    if (q) f.name = { $regex: String(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
    if (ats) f.ats = ats;
    const limit = 50;
    const [items, total] = await Promise.all([Company.find(f).sort({ name: 1 }).skip((page - 1) * limit).limit(limit), Company.countDocuments(f)]);
    res.json({ items, total, pages: Math.ceil(total / limit) });
  })
);

const companySchema = z.object({ name: z.string().trim().min(1).max(120), ats: z.enum(atsIds), slug: z.string().trim().min(1).max(120), website: z.string().url().optional().or(z.literal('')), active: z.boolean().default(true) });

r.post(
  '/companies',
  validate(companySchema),
  asyncHandler(async (req, res) => {
    const c = await Company.create(req.body);
    res.status(201).json({ company: c });
  })
);

/** Bulk add: one per line, "ats:slug" or "ats:slug:Company Name", or a board URL. */
r.post(
  '/companies/bulk',
  validate(z.object({ text: z.string().max(200000) })),
  asyncHandler(async (req, res) => {
    const rows = [];
    for (const raw of req.body.text.split(/\r?\n/)) {
      const line = raw.trim();
      if (!line) continue;
      let m;
      if ((m = line.match(/greenhouse\.io\/(?:embed\/job_board\?for=)?([\w-]+)/i))) rows.push({ ats: 'greenhouse', slug: m[1] });
      else if ((m = line.match(/jobs\.(?:eu\.)?lever\.co\/([\w-]+)/i))) rows.push({ ats: 'lever', slug: m[1] });
      else if ((m = line.match(/jobs\.ashbyhq\.com\/([\w.-]+)/i))) rows.push({ ats: 'ashby', slug: m[1] });
      else if ((m = line.match(/([\w-]+)\.recruitee\.com/i))) rows.push({ ats: 'recruitee', slug: m[1] });
      else if ((m = line.match(/([\w-]+)\.jobs\.personio\.(?:de|com)/i))) rows.push({ ats: 'personio', slug: m[1] });
      else if ((m = line.match(/([\w-]+)\.teamtailor\.com/i))) rows.push({ ats: 'teamtailor', slug: m[1] });
      else {
        const [ats, slug, ...name] = line.split(':').map((s) => s.trim());
        if (atsIds.includes(ats) && slug) rows.push({ ats, slug, name: name.join(':') || undefined });
      }
    }
    let added = 0;
    for (const row of rows) {
      const name = row.name || row.slug.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      const r2 = await Company.updateOne({ ats: row.ats, slug: row.slug }, { $setOnInsert: { name, active: true } }, { upsert: true });
      if (r2.upsertedCount) added++;
    }
    res.json({ parsed: rows.length, added });
  })
);

r.patch(
  '/companies/:id',
  validate(companySchema.partial()),
  asyncHandler(async (req, res) => {
    const c = await Company.findByIdAndUpdate(req.params.id, { ...req.body, ...(req.body.active ? { failures: 0 } : {}) }, { new: true });
    if (!c) throw new HttpError(404, 'Company not found.');
    res.json({ company: c });
  })
);

r.delete(
  '/companies/:id',
  asyncHandler(async (req, res) => {
    await Company.deleteOne({ _id: req.params.id });
    res.json({ ok: true });
  })
);

// ─── Users ────────────────────────────────────────────────
r.get(
  '/users',
  asyncHandler(async (req, res) => {
    const { q, page = 1 } = req.query;
    const f = q ? { $or: [{ email: { $regex: String(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } }, { name: { $regex: String(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } }] } : {};
    const limit = 50;
    const [items, total] = await Promise.all([User.find(f).select('name email plan role onboarded createdAt lastLoginAt referralCount searches').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit), User.countDocuments(f)]);
    res.json({ items, total, pages: Math.ceil(total / limit) });
  })
);

r.patch(
  '/users/:id',
  validate(z.object({ plan: z.enum(['free', 'basic', 'pro', 'premium']).optional(), role: z.enum(['user', 'admin']).optional() })),
  asyncHandler(async (req, res) => {
    const u = await User.findByIdAndUpdate(req.params.id, { ...req.body, ...(req.body.plan && req.body.plan !== 'free' ? { planRenewsAt: new Date(Date.now() + 30 * 864e5) } : {}) }, { new: true });
    if (!u) throw new HttpError(404, 'User not found.');
    res.json({ user: u });
  })
);

export default r;
