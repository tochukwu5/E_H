import { Router } from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import Job from '../models/Job.js';
import Company from '../models/Company.js';
import SourceRun from '../models/SourceRun.js';
import { asyncHandler, HttpError } from '../middleware/error.js';
import { SOURCES, PLANNED_SOURCES, GROUP_LABELS, publicSourceInfo } from '../sources/index.js';
import { pdfToText, atsCheck } from '../services/resume.js';
import { handleTelegramUpdate } from '../services/telegramBot.js';
import { env } from '../config/env.js';

const r = Router();
const PUBLIC_FIELDS = '-description -dedupeKey -externalKey -companyKey -__v';

// ─── Jobs ─────────────────────────────────────────────────
r.get(
  '/jobs',
  asyncHandler(async (req, res) => {
    const { q, remote, type, worldwide, source, seniority, posted, salary, page = 1, limit: lim } = req.query;
    const filter = { active: true, isDuplicate: false, flags: { $ne: 'possible_scam' } };
    if (q) filter.$text = { $search: String(q).slice(0, 100) };
    if (remote === 'true') filter.remote = true;
    if (type) filter.jobType = { $in: String(type).split(',') };
    if (seniority) filter.seniority = { $in: String(seniority).split(',') };
    if (worldwide === 'true') filter.eligibility = 'worldwide';
    if (source) filter.source = { $in: String(source).split(',') };
    if (salary === 'true') filter.salaryMin = { $gt: 0 };
    if (posted) filter.postedAt = { $gte: new Date(Date.now() - Number(posted) * 36e5) };
    const limit = Math.min(50, Number(lim) || 20);
    const skip = (Math.max(1, Number(page)) - 1) * limit;
    const sort = q ? { score: { $meta: 'textScore' }, postedAt: -1 } : { postedAt: -1 };
    const proj = q ? { score: { $meta: 'textScore' } } : {};
    const [items, total] = await Promise.all([Job.find(filter, proj).select(PUBLIC_FIELDS).sort(sort).skip(skip).limit(limit), Job.countDocuments(filter)]);
    res.json({ items, total, page: Number(page), pages: Math.ceil(total / limit) });
  })
);

r.get(
  '/jobs/stats',
  asyncHandler(async (_req, res) => {
    const since = new Date(Date.now() - 864e5);
    const [active, today, remote, worldwide, companies, bySource] = await Promise.all([
      Job.countDocuments({ active: true, isDuplicate: false }),
      Job.countDocuments({ firstSeenAt: { $gte: since }, isDuplicate: false }),
      Job.countDocuments({ active: true, remote: true, isDuplicate: false }),
      Job.countDocuments({ active: true, eligibility: 'worldwide', isDuplicate: false }),
      Company.countDocuments({ active: true }),
      Job.aggregate([{ $match: { active: true, isDuplicate: false } }, { $group: { _id: '$source', n: { $sum: 1 } } }]),
    ]);
    res.json({ active, today, remote, worldwide, companies, sources: SOURCES.length, bySource });
  })
);

r.get(
  '/jobs/:slug',
  asyncHandler(async (req, res) => {
    const job = await Job.findOne({ slug: req.params.slug }).select('-dedupeKey -externalKey -__v');
    if (!job) throw new HttpError(404, 'This job is no longer listed.');
    const similar = await Job.find({ _id: { $ne: job._id }, active: true, isDuplicate: false, $or: [{ companyKey: job.companyKey }, { skills: { $in: job.skills.slice(0, 4) }, seniority: job.seniority }] })
      .select(PUBLIC_FIELDS)
      .sort({ postedAt: -1 })
      .limit(6);
    res.json({ job, similar });
  })
);

// ─── Sources (transparency page) ──────────────────────────
r.get(
  '/sources',
  asyncHandler(async (_req, res) => {
    const last = await SourceRun.aggregate([{ $sort: { startedAt: -1 } }, { $group: { _id: '$source', ok: { $first: '$ok' }, at: { $first: '$finishedAt' }, fetched: { $first: '$fetched' } } }]);
    const lastBy = Object.fromEntries(last.map((l) => [l._id, l]));
    const companies = await Company.aggregate([{ $match: { active: true } }, { $group: { _id: '$ats', n: { $sum: 1 } } }]);
    const companyBy = Object.fromEntries(companies.map((c) => [c._id, c.n]));
    res.json({
      groups: GROUP_LABELS,
      sources: SOURCES.map((s) => ({ ...publicSourceInfo(s), companies: s.group === 'ats' ? companyBy[s.id] || 0 : undefined, lastRun: lastBy[s.id] || null })),
      planned: PLANNED_SOURCES,
    });
  })
);

// ─── Free ATS resume checker ──────────────────────────────
const toolLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 20, message: { message: 'You’ve run the checker a lot this hour. Try again later.' } });
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

r.post(
  '/tools/ats-check',
  toolLimiter,
  upload.single('resume'),
  asyncHandler(async (req, res) => {
    const { jobDescription = '', resumeText = '' } = z.object({ jobDescription: z.string().max(20000).optional(), resumeText: z.string().max(30000).optional() }).parse(req.body);
    let text = resumeText;
    if (req.file) {
      if (req.file.mimetype !== 'application/pdf') throw new HttpError(400, 'Upload your resume as a PDF, or paste the text instead.');
      text = await pdfToText(req.file.buffer).catch(() => '');
    }
    if (!text && !req.file) throw new HttpError(400, 'Upload a PDF resume or paste your resume text.');
    if (jobDescription.trim().length < 80) throw new HttpError(400, 'Paste the full job description (at least a few sentences).');
    res.json(atsCheck(text, jobDescription));
  })
);

// ─── SEO: sitemap ─────────────────────────────────────────
r.get(
  '/sitemap.xml',
  asyncHandler(async (_req, res) => {
    const jobs = await Job.find({ active: true, isDuplicate: false }).select('slug updatedAt').sort({ postedAt: -1 }).limit(45000).lean();
    const urls = ['', '/jobs', '/pricing', '/tools/ats-checker', '/sources']
      .map((p) => `<url><loc>${env.siteUrl}${p}</loc></url>`)
      .concat(jobs.map((j) => `<url><loc>${env.siteUrl}/jobs/${j.slug}</loc><lastmod>${new Date(j.updatedAt).toISOString().slice(0, 10)}</lastmod></url>`));
    res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join('')}</urlset>`);
  })
);

// ─── Telegram webhook (production) ────────────────────────
r.post(
  '/telegram/webhook',
  asyncHandler(async (req, res) => {
    if (env.telegram.webhookSecret && req.get('X-Telegram-Bot-Api-Secret-Token') !== env.telegram.webhookSecret) throw new HttpError(401, 'Bad secret');
    await handleTelegramUpdate(req.body).catch(() => {});
    res.json({ ok: true });
  })
);

export default r;
