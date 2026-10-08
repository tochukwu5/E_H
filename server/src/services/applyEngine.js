import Application from '../models/Application.js';
import Match from '../models/Match.js';
import User from '../models/User.js';
import { planOf, APPLY_MODE_RANK } from '../config/plans.js';
import { writeCoverLetter, screeningAnswers } from './ai.js';
import { notifyUser } from './notifier.js';
import { HttpError } from '../middleware/error.js';

/**
 * About submission:
 * The green sources only publish READ feeds. Submitting into an employer's ATS needs that
 * employer's own API key (Greenhouse Job Board POST, Lever apply API) or a partnership,
 * so EmployHunt prepares everything — tailored cover letter, screening answers, the exact
 * apply link — and the user submits with one tap. When you sign ATS/employer partnerships,
 * register a submitter here and "auto" mode will submit directly.
 */
export const SUBMITTERS = {
  // greenhouse: async (application, user, job) => { ... return { submitted: true } },
};

export function effectiveApplyMode(user) {
  const allowed = planOf(user).limits.autoApply;
  const wanted = user.apply?.mode || 'off';
  return APPLY_MODE_RANK[wanted] <= APPLY_MODE_RANK[allowed] ? wanted : allowed;
}

/** Create (or return) an application with a tailored cover letter. Counts against the cover-letter quota. */
export async function prepareApplication(user, job, { match, mode = 'manual', regenerate = false } = {}) {
  user.rollUsage();
  const plan = planOf(user);
  let app = await Application.findOne({ user: user._id, job: job._id });
  if (app && app.coverLetter && !regenerate) return app;

  if (user.usage.coverLetters >= plan.limits.coverLetters) {
    throw new HttpError(402, `You've used all ${plan.limits.coverLetters} AI cover letters on the ${plan.name} plan this month. Upgrade to write more.`);
  }
  const withResume = await User.findById(user._id).select('+profile.resume.text');
  const coverLetter = await writeCoverLetter(user, job, { tone: user.apply?.tone, length: user.apply?.length, resumeText: withResume?.profile?.resume?.text || '' });
  user.usage.coverLetters += 1;
  await User.updateOne({ _id: user._id }, { usage: user.usage });

  const status = mode === 'auto' ? 'ready' : 'draft';
  if (!app) {
    app = await Application.create({
      user: user._id,
      job: job._id,
      match: match?._id,
      title: job.title,
      company: job.company,
      url: job.applyUrl || job.url,
      status,
      mode,
      coverLetter,
      answers: screeningAnswers(user, job),
      history: [{ status }],
    });
  } else {
    app.coverLetter = coverLetter;
    app.answers = app.answers?.length ? app.answers : screeningAnswers(user, job);
    await app.save();
  }
  if (match) await Match.updateOne({ _id: match._id }, { status: 'saved' });
  return app;
}

/** Runs after matching: approve-first creates drafts, auto mode prepares and (when possible) submits. */
export async function handleAutoApply(user, created) {
  const mode = effectiveApplyMode(user);
  if (mode === 'off') return;
  user.rollUsage();
  const plan = planOf(user);
  const minScore = user.apply?.minScore ?? 75;
  const dailyLimit = user.apply?.dailyLimit ?? 10;
  const prepared = [];

  for (const { match, job } of created) {
    if (match.score < minScore) continue;
    if (user.usage.appliesToday >= dailyLimit) break;
    if (user.usage.autoApplies >= plan.limits.autoApplyPerMonth) break;
    try {
      const app = await prepareApplication(user, job, { match, mode });
      const submitter = mode === 'auto' && SUBMITTERS[job.ats];
      if (submitter) {
        const r = await submitter(app, user, job).catch(() => null);
        if (r?.submitted) {
          app.status = 'applied';
          app.appliedAt = new Date();
          app.followUpAt = new Date(Date.now() + 6 * 864e5);
          app.history.push({ status: 'applied' });
          await app.save();
          await Match.updateOne({ _id: match._id }, { status: 'applied' });
        }
      }
      user.usage.appliesToday += 1;
      user.usage.autoApplies += 1;
      prepared.push({ app, job });
    } catch (e) {
      if (e.status === 402) break; // quota reached
    }
  }
  await User.updateOne({ _id: user._id }, { usage: user.usage });

  if (prepared.length) {
    const submitted = prepared.filter((p) => p.app.status === 'applied').length;
    await notifyUser(user, {
      type: 'application',
      title: submitted ? `Applied to ${submitted} job${submitted > 1 ? 's' : ''}` : `${prepared.length} application${prepared.length > 1 ? 's' : ''} ready for you`,
      body: prepared
        .slice(0, 5)
        .map((p) => `• ${p.job.title} at ${p.job.company}`)
        .join('\n') + (submitted < prepared.length ? '\nReview the cover letter, then tap Apply to submit.' : ''),
      link: '/app/applications',
    });
  }
}
