import { Router } from 'express';
import { z } from 'zod';
import Match from '../models/Match.js';
import Job from '../models/Job.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler, HttpError } from '../middleware/error.js';
import { validate } from '../middleware/validate.js';
import { bestMatch } from '../services/matcher.js';

const r = Router();
r.use(requireAuth);

r.get(
  '/',
  asyncHandler(async (req, res) => {
    const { status = 'active', search, minScore = 0, page = 1, sort = 'recent' } = req.query;
    const q = { user: req.user._id, score: { $gte: Number(minScore) || 0 } };
    if (status === 'active') q.status = { $in: ['new', 'saved'] };
    else if (status !== 'all') q.status = status;
    if (search) q.searchId = search;
    const limit = 20;
    const skip = (Math.max(1, Number(page)) - 1) * limit;
    const [items, total] = await Promise.all([
      Match.find(q)
        .sort(sort === 'score' ? { score: -1, createdAt: -1 } : { createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('job', '-description'),
      Match.countDocuments(q),
    ]);
    res.json({ items: items.filter((m) => m.job), total, page: Number(page), pages: Math.ceil(total / limit) });
  })
);

r.patch(
  '/:id',
  validate(z.object({ status: z.enum(['new', 'saved', 'skipped', 'applied']) })),
  asyncHandler(async (req, res) => {
    const m = await Match.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, { status: req.body.status }, { new: true }).populate('job', '-description');
    if (!m) throw new HttpError(404, 'That match no longer exists.');
    res.json({ match: m });
  })
);

/** Score any job for the current user (used on job pages to show "your match"). */
r.get(
  '/score/:jobId',
  asyncHandler(async (req, res) => {
    const job = await Job.findById(req.params.jobId);
    if (!job) throw new HttpError(404, 'Job not found.');
    const m = bestMatch(req.user, job);
    res.json({ score: m?.score ?? null, reasons: m?.reasons || [], gaps: m?.gaps || [], pass: Boolean(m?.pass) });
  })
);

export default r;
