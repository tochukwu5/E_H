import { Router } from 'express';
import { z } from 'zod';
import { PLANS, planOf, APPLY_MODE_RANK } from '../config/plans.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/error.js';
import { validate } from '../middleware/validate.js';
import { notifyUser } from '../services/notifier.js';

const r = Router();

r.get('/plans', (_req, res) => res.json({ plans: Object.values(PLANS) }));

/**
 * MOCK checkout. Swap this for Paystack / Flutterwave / Stripe (or USDC via Paragon) later:
 * create a checkout session here, then upgrade the plan from the provider's webhook.
 */
r.post(
  '/change-plan',
  requireAuth,
  validate(z.object({ plan: z.enum(['free', 'basic', 'pro', 'premium']) })),
  asyncHandler(async (req, res) => {
    const u = req.user;
    u.plan = req.body.plan;
    u.planRenewsAt = req.body.plan === 'free' ? undefined : new Date(Date.now() + 30 * 864e5);
    u.trialEndsAt = undefined;
    // Keep settings inside the new plan's limits.
    const plan = planOf(u);
    let active = 0;
    for (const s of u.searches) {
      if (s.active) active++;
      if (active > plan.limits.niches) s.active = false;
    }
    if (APPLY_MODE_RANK[u.apply.mode] > APPLY_MODE_RANK[plan.limits.autoApply]) u.apply.mode = plan.limits.autoApply;
    if (plan.limits.delivery !== 'instant') u.alerts.delivery = 'digest';
    if (!plan.limits.channels.includes('whatsapp')) u.alerts.whatsapp.enabled = false;
    await u.save();
    await notifyUser(u, { type: 'billing', title: `You're on the ${plan.name} plan`, body: plan.price ? `Renews on ${u.planRenewsAt.toDateString()}.` : 'You can upgrade any time.', telegram: false });
    res.json({ user: u });
  })
);

export default r;
