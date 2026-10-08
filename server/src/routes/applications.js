import { Router } from 'express';
import { z } from 'zod';
import Application, { APP_STATUSES } from '../models/Application.js';
import Match from '../models/Match.js';
import Job from '../models/Job.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler, HttpError } from '../middleware/error.js';
import { validate } from '../middleware/validate.js';
import { prepareApplication } from '../services/applyEngine.js';

const r = Router();
r.use(requireAuth);

r.get(
  '/',
  asyncHandler(async (req, res) => {
    const items = await Application.find({ user: req.user._id }).sort({ updatedAt: -1 }).limit(500).populate('job', 'slug title company location remote applyUrl url source sourceName');
    res.json({ items });
  })
);

/** Draft an application (cover letter + answers) for a job. */
r.post(
  '/draft',
  validate(z.object({ jobId: z.string().min(1), regenerate: z.boolean().optional() })),
  asyncHandler(async (req, res) => {
    const job = await Job.findById(req.body.jobId);
    if (!job) throw new HttpError(404, 'That job is no longer available.');
    const match = await Match.findOne({ user: req.user._id, job: job._id });
    const app = await prepareApplication(req.user, job, { match, mode: 'approve', regenerate: req.body.regenerate });
    res.status(201).json({ application: await app.populate('job', 'slug title company location remote applyUrl url source sourceName') });
  })
);

/** Track an application made outside EmployHunt. */
r.post(
  '/manual',
  validate(z.object({ title: z.string().trim().min(1).max(200), company: z.string().trim().min(1).max(120), url: z.string().trim().url().optional().or(z.literal('')), status: z.enum(APP_STATUSES).default('applied'), notes: z.string().max(4000).optional() })),
  asyncHandler(async (req, res) => {
    const b = req.body;
    const app = await Application.create({ user: req.user._id, ...b, url: b.url || undefined, mode: 'manual', appliedAt: b.status === 'applied' ? new Date() : undefined, followUpAt: b.status === 'applied' ? new Date(Date.now() + 6 * 864e5) : undefined, history: [{ status: b.status }] });
    res.status(201).json({ application: app });
  })
);

r.patch(
  '/:id',
  validate(z.object({ status: z.enum(APP_STATUSES).optional(), coverLetter: z.string().max(8000).optional(), notes: z.string().max(4000).optional(), answers: z.array(z.object({ question: z.string().max(300), answer: z.string().max(2000) })).max(30).optional(), followUpAt: z.coerce.date().optional() })),
  asyncHandler(async (req, res) => {
    const app = await Application.findOne({ _id: req.params.id, user: req.user._id });
    if (!app) throw new HttpError(404, 'That application no longer exists.');
    const { status, ...rest } = req.body;
    Object.assign(app, rest);
    if (status && status !== app.status) {
      app.status = status;
      app.history.push({ status });
      if (status === 'applied') {
        app.appliedAt = new Date();
        app.followUpAt = app.followUpAt || new Date(Date.now() + 6 * 864e5);
        if (app.match) await Match.updateOne({ _id: app.match }, { status: 'applied' });
      }
    }
    await app.save();
    res.json({ application: await app.populate('job', 'slug title company location remote applyUrl url source sourceName') });
  })
);

r.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await Application.deleteOne({ _id: req.params.id, user: req.user._id });
    res.json({ ok: true });
  })
);

export default r;
