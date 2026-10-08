import { Router } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import User from '../models/User.js';
import { asyncHandler, HttpError } from '../middleware/error.js';
import { validate } from '../middleware/validate.js';
import { requireAuth, signToken, setAuthCookie, clearAuthCookie } from '../middleware/auth.js';
import { sendEmail, layout } from '../channels/email.js';
import { env } from '../config/env.js';

const r = Router();
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false, message: { message: 'Too many attempts. Wait a few minutes and try again.' } });

const password = z.string().min(8, 'Use at least 8 characters for your password.').max(128);

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Enter your name.').max(80),
  email: z.string().trim().email('Enter a valid email address.'),
  password,
  referralCode: z.string().trim().max(20).optional(),
  timezone: z.string().max(60).optional(),
});

r.post(
  '/register',
  limiter,
  validate(registerSchema),
  asyncHandler(async (req, res) => {
    const { name, email, password: pw, referralCode, timezone } = req.body;
    const user = new User({ name, email, profile: { timezone: timezone || 'UTC' } });
    await user.setPassword(pw);

    if (referralCode) {
      const ref = await User.findOne({ referralCode });
      if (ref) {
        user.referredBy = ref._id;
        // Both people get a 7-day Pro trial.
        user.plan = 'pro';
        user.trialEndsAt = user.planRenewsAt = new Date(Date.now() + 7 * 864e5);
        ref.referralCount += 1;
        const base = ref.planRenewsAt && ref.planRenewsAt > new Date() ? ref.planRenewsAt : new Date();
        if (ref.plan === 'free') ref.plan = 'pro';
        ref.planRenewsAt = new Date(base.getTime() + 7 * 864e5);
        await ref.save();
      }
    }
    await user.save();
    const token = signToken(user);
    setAuthCookie(res, token);
    res.status(201).json({ user, token });
  })
);

r.post(
  '/login',
  limiter,
  validate(z.object({ email: z.string().trim().email('Enter a valid email address.'), password: z.string().min(1, 'Enter your password.') })),
  asyncHandler(async (req, res) => {
    const user = await User.findOne({ email: req.body.email.toLowerCase() }).select('+passwordHash');
    if (!user || !(await user.checkPassword(req.body.password))) throw new HttpError(401, 'That email and password don’t match an account.');
    user.lastLoginAt = new Date();
    await user.save();
    const token = signToken(user);
    setAuthCookie(res, token);
    res.json({ user, token });
  })
);

r.post('/logout', (_req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

r.get('/me', requireAuth, (req, res) => res.json({ user: req.user }));

r.post(
  '/forgot-password',
  limiter,
  validate(z.object({ email: z.string().trim().email('Enter a valid email address.') })),
  asyncHandler(async (req, res) => {
    const user = await User.findOne({ email: req.body.email.toLowerCase() });
    if (user) {
      const raw = crypto.randomBytes(32).toString('hex');
      user.resetToken = crypto.createHash('sha256').update(raw).digest('hex');
      user.resetExpires = new Date(Date.now() + 60 * 60 * 1000);
      await user.save();
      const link = `${env.siteUrl}/reset-password?token=${raw}`;
      await sendEmail({
        to: user.email,
        subject: 'Reset your EmployHunt password',
        html: layout('Reset your password', `<p>Tap the button to choose a new password. The link works for one hour.</p><p><a href="${link}" style="background:#2747d6;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;font-weight:600">Choose a new password</a></p><p style="font-size:13px;color:#6b7690">Didn't ask for this? You can ignore this email.</p>`),
        text: `Reset your password: ${link}`,
      });
    }
    // Same answer either way so nobody can test which emails have accounts.
    res.json({ ok: true, message: 'If that email has an account, a reset link is on its way.' });
  })
);

r.post(
  '/reset-password',
  limiter,
  validate(z.object({ token: z.string().min(10), password })),
  asyncHandler(async (req, res) => {
    const hashed = crypto.createHash('sha256').update(req.body.token).digest('hex');
    const user = await User.findOne({ resetToken: hashed, resetExpires: { $gt: new Date() } }).select('+resetToken +resetExpires');
    if (!user) throw new HttpError(400, 'This reset link has expired. Request a new one.');
    await user.setPassword(req.body.password);
    user.resetToken = undefined;
    user.resetExpires = undefined;
    await user.save();
    const token = signToken(user);
    setAuthCookie(res, token);
    res.json({ user, token });
  })
);

r.post(
  '/change-password',
  requireAuth,
  validate(z.object({ current: z.string().min(1), password })),
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id).select('+passwordHash');
    if (!(await user.checkPassword(req.body.current))) throw new HttpError(400, 'Your current password is incorrect.');
    await user.setPassword(req.body.password);
    await user.save();
    res.json({ ok: true });
  })
);

export default r;
