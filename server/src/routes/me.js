import { Router } from 'express';
import multer from 'multer';
import fs from 'fs/promises';
import path from 'path';
import { z } from 'zod';
import User from '../models/User.js';
import Match from '../models/Match.js';
import Application from '../models/Application.js';
import Notification from '../models/Notification.js';
import { requireAuth, clearAuthCookie } from '../middleware/auth.js';
import { asyncHandler, HttpError } from '../middleware/error.js';
import { validate } from '../middleware/validate.js';
import { planOf, APPLY_MODE_RANK } from '../config/plans.js';
import { pdfToText, parseResume } from '../services/resume.js';
import { backfillUser } from '../services/matcher.js';
import { telegramLink, telegramEnabled, sendTelegram } from '../channels/telegram.js';
import { whatsappEnabled, sendWhatsAppText } from '../channels/whatsapp.js';
import { sendEmail, layout } from '../channels/email.js';

const r = Router();
r.use(requireAuth);

const UPLOAD_DIR = path.resolve('uploads/resumes');
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => (file.mimetype === 'application/pdf' ? cb(null, true) : cb(new HttpError(400, 'Upload your resume as a PDF.'))),
});

const str = (max = 200) => z.string().trim().max(max).optional().or(z.literal(''));
const strList = z.array(z.string().trim().min(1).max(60)).max(30).default([]);

const profileSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  profile: z
    .object({
      headline: str(140),
      summary: str(1500),
      country: str(2),
      city: str(80),
      timezone: str(60),
      experienceLevel: z.enum(['intern', 'junior', 'mid', 'senior', 'lead']).optional(),
      yearsExperience: z.coerce.number().min(0).max(50).optional(),
      skills: strList.optional(),
      phone: str(30),
      links: z.object({ portfolio: str(), github: str(), linkedin: str(), website: str() }).partial().optional(),
    })
    .partial()
    .optional(),
});

r.patch(
  '/profile',
  validate(profileSchema),
  asyncHandler(async (req, res) => {
    const u = req.user;
    if (req.body.name) u.name = req.body.name;
    if (req.body.profile) {
      const { links, ...rest } = req.body.profile;
      Object.assign(u.profile, rest);
      if (links) u.profile.links = { ...(u.profile.links?.toObject?.() || u.profile.links || {}), ...links };
      if (rest.country) u.profile.country = rest.country.toUpperCase();
    }
    await u.save();
    res.json({ user: u });
  })
);

r.post(
  '/resume',
  upload.single('resume'),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new HttpError(400, 'Choose a PDF to upload.');
    const text = await pdfToText(req.file.buffer).catch(() => '');
    const parsed = parseResume(text);
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    const fileName = `${req.user._id}.pdf`;
    await fs.writeFile(path.join(UPLOAD_DIR, fileName), req.file.buffer);

    const u = await User.findById(req.user._id);
    u.profile.resume = { fileName: req.file.originalname, text, path: fileName, uploadedAt: new Date() };
    // Fill empty fields only — never overwrite what the user typed.
    if (!u.profile.skills?.length) u.profile.skills = parsed.skills;
    else u.profile.skills = [...new Set([...u.profile.skills, ...parsed.skills])];
    if (!u.profile.headline && parsed.headline) u.profile.headline = parsed.headline;
    if (!u.profile.yearsExperience && parsed.yearsExperience) u.profile.yearsExperience = parsed.yearsExperience;
    if (parsed.experienceLevel && !u.onboarded) u.profile.experienceLevel = parsed.experienceLevel;
    if (!u.profile.phone && parsed.phone) u.profile.phone = parsed.phone;
    for (const k of ['linkedin', 'github', 'portfolio']) if (!u.profile.links?.[k] && parsed.links[k]) u.set(`profile.links.${k}`, parsed.links[k]);
    await u.save();
    res.json({ user: u, parsed: { ...parsed, readable: Boolean(text) } });
  })
);

r.get(
  '/resume/file',
  asyncHandler(async (req, res) => {
    const p = req.user.profile?.resume?.path;
    if (!p) throw new HttpError(404, 'No resume uploaded yet.');
    res.sendFile(path.join(UPLOAD_DIR, path.basename(p)));
  })
);

// ─── Saved searches ("niches") ────────────────────────────
const searchSchema = z.object({
  name: z.string().trim().min(1, 'Name this search.').max(60),
  titles: strList.refine((v) => v.length > 0, 'Add at least one job title.'),
  keywords: strList,
  excludeKeywords: strList,
  jobTypes: z.array(z.enum(['full_time', 'part_time', 'contract', 'freelance', 'internship'])).default([]),
  workModes: z.array(z.enum(['remote', 'hybrid', 'onsite'])).default([]),
  locations: strList,
  eligibility: z.enum(['anywhere', 'my_country']).default('anywhere'),
  seniority: z.array(z.enum(['intern', 'junior', 'mid', 'senior', 'lead'])).default([]),
  minSalary: z.coerce.number().min(0).max(10_000_000).default(0),
  currency: z.string().trim().length(3).default('USD'),
  strictness: z.coerce.number().min(0).max(100).default(60),
  active: z.boolean().default(true),
});

function checkNicheLimit(user, extra = 1) {
  const plan = planOf(user);
  const active = user.searches.filter((s) => s.active).length + extra;
  if (active > plan.limits.niches) throw new HttpError(402, `The ${plan.name} plan includes ${plan.limits.niches} active search${plan.limits.niches > 1 ? 'es' : ''}. Pause one or upgrade to add more.`);
}

r.post(
  '/searches',
  validate(searchSchema),
  asyncHandler(async (req, res) => {
    if (req.body.active) checkNicheLimit(req.user);
    req.user.searches.push(req.body);
    await req.user.save();
    backfillUser(req.user).catch(() => {});
    res.status(201).json({ user: req.user });
  })
);

r.put(
  '/searches/:id',
  validate(searchSchema),
  asyncHandler(async (req, res) => {
    const s = req.user.searches.id(req.params.id);
    if (!s) throw new HttpError(404, 'That search no longer exists.');
    if (req.body.active && !s.active) checkNicheLimit(req.user);
    Object.assign(s, req.body);
    await req.user.save();
    backfillUser(req.user).catch(() => {});
    res.json({ user: req.user });
  })
);

r.delete(
  '/searches/:id',
  asyncHandler(async (req, res) => {
    req.user.searches.pull({ _id: req.params.id });
    await req.user.save();
    res.json({ user: req.user });
  })
);

// ─── Lists, alerts, apply settings ────────────────────────
r.patch(
  '/lists',
  validate(z.object({ watchlist: strList.optional(), blockedCompanies: strList.optional() })),
  asyncHandler(async (req, res) => {
    const plan = planOf(req.user);
    if (req.body.watchlist && req.body.watchlist.length > plan.limits.companyWatchlist) {
      throw new HttpError(402, `The ${plan.name} plan lets you watch ${plan.limits.companyWatchlist} companies.`);
    }
    Object.assign(req.user, req.body);
    await req.user.save();
    res.json({ user: req.user });
  })
);

const alertsSchema = z.object({
  email: z.object({ enabled: z.boolean() }).optional(),
  telegram: z.object({ enabled: z.boolean() }).optional(),
  whatsapp: z.object({ enabled: z.boolean().optional(), phone: str(25), optIn: z.boolean().optional() }).optional(),
  delivery: z.enum(['instant', 'digest']).optional(),
  digestHour: z.coerce.number().min(0).max(23).optional(),
  quietHours: z.object({ enabled: z.boolean(), start: z.coerce.number().min(0).max(23), end: z.coerce.number().min(0).max(23) }).optional(),
  maxPerDay: z.coerce.number().min(1).max(500).optional(),
});

r.patch(
  '/alerts',
  validate(alertsSchema),
  asyncHandler(async (req, res) => {
    const u = req.user;
    const plan = planOf(u);
    const b = req.body;
    if (b.whatsapp?.enabled && !plan.limits.channels.includes('whatsapp')) throw new HttpError(402, 'WhatsApp alerts start on the Basic plan.');
    if (b.delivery === 'instant' && plan.limits.delivery !== 'instant') throw new HttpError(402, 'Instant alerts start on the Basic plan. The Free plan sends a daily digest.');
    if (b.email) u.alerts.email.enabled = b.email.enabled;
    if (b.telegram) u.alerts.telegram.enabled = b.telegram.enabled && Boolean(u.alerts.telegram.chatId);
    if (b.whatsapp) Object.assign(u.alerts.whatsapp, b.whatsapp);
    for (const k of ['delivery', 'digestHour', 'maxPerDay']) if (b[k] !== undefined) u.alerts[k] = b[k];
    if (b.quietHours) u.alerts.quietHours = b.quietHours;
    await u.save();
    res.json({ user: u });
  })
);

r.get('/alerts/telegram-link', (req, res) => {
  res.json({ enabled: telegramEnabled(), url: telegramLink(req.user.alerts.telegram.linkCode), connected: Boolean(req.user.alerts.telegram.chatId) });
});

r.post(
  '/alerts/telegram-disconnect',
  asyncHandler(async (req, res) => {
    req.user.alerts.telegram = { enabled: false, chatId: undefined, linkCode: undefined };
    await req.user.save(); // pre-save hook issues a fresh link code
    res.json({ user: req.user });
  })
);

r.post(
  '/alerts/test',
  validate(z.object({ channel: z.enum(['email', 'telegram', 'whatsapp']) })),
  asyncHandler(async (req, res) => {
    const u = req.user;
    const msg = 'This is a test alert from EmployHunt. Real job matches will look like this.';
    if (req.body.channel === 'telegram') {
      if (!telegramEnabled()) throw new HttpError(400, 'Telegram is not configured on this server yet.');
      if (!u.alerts.telegram.chatId) throw new HttpError(400, 'Connect Telegram first.');
      await sendTelegram(u.alerts.telegram.chatId, `✅ ${msg}`);
    } else if (req.body.channel === 'whatsapp') {
      if (!whatsappEnabled()) throw new HttpError(400, 'WhatsApp is not configured on this server yet.');
      if (!u.alerts.whatsapp.phone) throw new HttpError(400, 'Add your WhatsApp number first.');
      await sendWhatsAppText(u.alerts.whatsapp.phone, msg);
    } else {
      await sendEmail({ to: u.email, subject: 'Test alert from EmployHunt', html: layout('Your alerts work', `<p>${msg}</p>`) });
    }
    res.json({ ok: true });
  })
);

const applySchema = z.object({
  mode: z.enum(['off', 'approve', 'auto']).optional(),
  dailyLimit: z.coerce.number().min(1).max(100).optional(),
  minScore: z.coerce.number().min(0).max(100).optional(),
  tone: z.enum(['professional', 'friendly', 'confident', 'concise']).optional(),
  length: z.enum(['short', 'medium', 'long']).optional(),
  answers: z
    .object({ workAuthorization: str(200), needsSponsorship: z.boolean(), noticePeriod: str(100), salaryExpectation: str(100), willingToRelocate: z.boolean() })
    .partial()
    .optional(),
});

r.patch(
  '/apply',
  validate(applySchema),
  asyncHandler(async (req, res) => {
    const plan = planOf(req.user);
    if (req.body.mode && APPLY_MODE_RANK[req.body.mode] > APPLY_MODE_RANK[plan.limits.autoApply]) {
      throw new HttpError(402, req.body.mode === 'auto' ? 'Auto mode is on the Premium plan.' : 'Approve-first applications start on the Pro plan.');
    }
    const { answers, ...rest } = req.body;
    Object.assign(req.user.apply, rest);
    if (answers) Object.assign(req.user.apply.answers, answers);
    await req.user.save();
    res.json({ user: req.user });
  })
);

r.post(
  '/onboarding/complete',
  asyncHandler(async (req, res) => {
    if (!req.user.searches.length) throw new HttpError(400, 'Add at least one job search to finish setup.');
    req.user.onboarded = true;
    await req.user.save();
    const found = await backfillUser(req.user);
    res.json({ user: req.user, found });
  })
);

r.get(
  '/stats',
  asyncHandler(async (req, res) => {
    const uid = req.user._id;
    const since = new Date(Date.now() - 7 * 864e5);
    const [matchesWeek, newMatches, saved, appsByStatus, daily] = await Promise.all([
      Match.countDocuments({ user: uid, createdAt: { $gte: since } }),
      Match.countDocuments({ user: uid, status: 'new' }),
      Match.countDocuments({ user: uid, status: 'saved' }),
      Application.aggregate([{ $match: { user: uid } }, { $group: { _id: '$status', n: { $sum: 1 } } }]),
      Match.aggregate([
        { $match: { user: uid, createdAt: { $gte: new Date(Date.now() - 14 * 864e5) } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, n: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
    ]);
    const apps = Object.fromEntries(appsByStatus.map((a) => [a._id, a.n]));
    req.user.rollUsage();
    const plan = planOf(req.user);
    res.json({
      matchesWeek,
      newMatches,
      saved,
      applications: apps,
      daily,
      usage: { ...req.user.usage.toObject?.() ?? req.user.usage, limits: plan.limits },
    });
  })
);

// ─── Notifications ────────────────────────────────────────
r.get(
  '/notifications',
  asyncHandler(async (req, res) => {
    const items = await Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(40);
    const unread = await Notification.countDocuments({ user: req.user._id, read: false });
    res.json({ items, unread });
  })
);

r.post(
  '/notifications/read',
  asyncHandler(async (req, res) => {
    await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
    res.json({ ok: true });
  })
);

// ─── Privacy: export and delete ───────────────────────────
r.get(
  '/export',
  asyncHandler(async (req, res) => {
    const [matches, applications] = await Promise.all([
      Match.find({ user: req.user._id }).populate('job', 'title company url postedAt').lean(),
      Application.find({ user: req.user._id }).lean(),
    ]);
    res.setHeader('Content-Disposition', 'attachment; filename="employhunt-data.json"');
    res.json({ exportedAt: new Date(), account: req.user, matches, applications });
  })
);

r.delete(
  '/',
  validate(z.object({ confirm: z.literal('DELETE', { errorMap: () => ({ message: 'Type DELETE to confirm.' }) }) })),
  asyncHandler(async (req, res) => {
    const uid = req.user._id;
    await Promise.all([Match.deleteMany({ user: uid }), Application.deleteMany({ user: uid }), Notification.deleteMany({ user: uid })]);
    if (req.user.profile?.resume?.path) await fs.unlink(path.join(UPLOAD_DIR, path.basename(req.user.profile.resume.path))).catch(() => {});
    await User.deleteOne({ _id: uid });
    clearAuthCookie(res);
    res.json({ ok: true });
  })
);

export default r;
