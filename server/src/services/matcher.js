import Job from '../models/Job.js';
import User from '../models/User.js';
import Match from '../models/Match.js';
import { tokenize, normalizeKey } from '../utils/text.js';
import { planOf } from '../config/plans.js';
import { logger } from '../utils/logger.js';
import { notifyMatches } from './notifier.js';
import { handleAutoApply } from './applyEngine.js';
import { aiMatchReason } from './ai.js';

const COUNTRY_REGION = {
  NG: 'africa', GH: 'africa', KE: 'africa', ZA: 'africa', EG: 'africa', RW: 'africa', UG: 'africa', TZ: 'africa', ET: 'africa', MA: 'africa', CM: 'africa', SN: 'africa', CI: 'africa',
  GB: 'uk', IE: 'europe', DE: 'europe', FR: 'europe', ES: 'europe', IT: 'europe', NL: 'europe', PL: 'europe', PT: 'europe', SE: 'europe', NO: 'europe', DK: 'europe', FI: 'europe', BE: 'europe', AT: 'europe', CH: 'europe', RO: 'europe', UA: 'europe',
  US: 'us', CA: 'canada', MX: 'latam', BR: 'latam', AR: 'latam', CO: 'latam', CL: 'latam', PE: 'latam',
  IN: 'asia', PK: 'asia', PH: 'asia', ID: 'asia', VN: 'asia', SG: 'asia', JP: 'asia', MY: 'asia', BD: 'asia', AE: 'asia', SA: 'asia',
  AU: 'oceania', NZ: 'oceania',
};
const SENIORITY_ORDER = ['intern', 'junior', 'mid', 'senior', 'lead'];

const overlap = (a, b) => {
  if (!a.length) return 0;
  const set = new Set(b);
  return a.filter((t) => set.has(t)).length / a.length;
};

/** Can someone in `country` apply to this job, as far as we can tell? */
export function eligibleFor(job, country) {
  if (!country) return true;
  const region = COUNTRY_REGION[country.toUpperCase()];
  const elig = job.eligibility || [];
  if (elig.includes('worldwide')) return true;
  if (region && elig.includes(region)) return true;
  if (elig.includes(country.toLowerCase())) return true;
  if (job.country && job.country.toUpperCase() === country.toUpperCase()) return true;
  return false;
}

/**
 * Score a job for one saved search. Returns { pass, score, reasons, gaps }.
 * Hard filters fail fast; the score is a weighted blend of title, skills, seniority and freshness.
 */
export function scoreJob(user, search, job) {
  const fail = (why) => ({ pass: false, score: 0, reasons: [why], gaps: [] });
  const text = `${job.title} ${(job.tags || []).join(' ')} ${(job.description || '').slice(0, 8000)}`.toLowerCase();

  if ((user.blockedCompanies || []).some((c) => normalizeKey(c) === job.companyKey)) return fail('Blocked company');
  if (job.flags?.includes('possible_scam')) return fail('Looks like a scam');
  const excluded = (search.excludeKeywords || []).find((k) => k && text.includes(k.toLowerCase()));
  if (excluded) return fail(`Mentions "${excluded}"`);

  if (search.workModes?.length && job.workMode !== 'unknown' && !search.workModes.includes(job.workMode)) return fail(`Work mode is ${job.workMode}`);
  if (search.jobTypes?.length && job.jobType !== 'unknown' && !search.jobTypes.includes(job.jobType)) return fail(`Job type is ${job.jobType.replace('_', ' ')}`);

  if (search.eligibility === 'my_country') {
    const country = user.profile?.country;
    const okRemote = job.remote && eligibleFor(job, country);
    const locs = (search.locations || []).map((l) => l.toLowerCase());
    const okLocal = !job.remote && locs.length && locs.some((l) => (job.location || '').toLowerCase().includes(l));
    const okCountry = job.country && country && job.country.toUpperCase() === country.toUpperCase();
    if (!okRemote && !okLocal && !okCountry) return fail('Not open to your country');
  } else if (search.locations?.length && !job.remote) {
    const locs = search.locations.map((l) => l.toLowerCase());
    if (!locs.some((l) => (job.location || '').toLowerCase().includes(l))) return fail('Outside your locations');
  }

  if (search.minSalary && job.salaryMax && job.salaryPeriod === 'year' && (!job.salaryCurrency || job.salaryCurrency === search.currency) && job.salaryMax < search.minSalary) {
    return fail('Pays below your minimum');
  }

  const reasons = [];
  const titleTokens = tokenize(job.title);

  // Title (0–45)
  let titleScore = 0;
  let bestTitle = '';
  for (const t of search.titles || []) {
    const want = tokenize(t);
    const s = Math.max(overlap(want, titleTokens), overlap(want, tokenize(text.slice(0, 400))) * 0.6);
    if (s > titleScore) [titleScore, bestTitle] = [s, t];
  }
  const titlePts = Math.round(titleScore * 45);
  if (titleScore >= 0.6) reasons.push(`Title matches "${bestTitle}"`);

  // Skills (0–35): search keywords count double, profile skills fill the rest
  const must = (search.keywords || []).map((k) => k.toLowerCase());
  const profileSkills = (user.profile?.skills || []).map((s) => s.toLowerCase());
  const mustHit = must.filter((k) => text.includes(k));
  const jobSkills = job.skills || [];
  const skillHit = jobSkills.filter((s) => profileSkills.includes(s));
  const mustRatio = must.length ? mustHit.length / must.length : null;
  const skillRatio = jobSkills.length ? skillHit.length / jobSkills.length : 0.5;
  const skillPts = Math.round((mustRatio === null ? skillRatio : mustRatio * 0.6 + skillRatio * 0.4) * 35);
  if (skillHit.length) reasons.push(`Uses ${skillHit.slice(0, 3).join(', ')}`);
  const gaps = jobSkills.filter((s) => !profileSkills.includes(s)).slice(0, 4);

  // Seniority (0–10)
  let senPts = 6;
  const want = search.seniority?.length ? search.seniority : [user.profile?.experienceLevel].filter(Boolean);
  if (job.seniority !== 'unknown' && want.length) {
    const d = Math.min(...want.map((w) => Math.abs(SENIORITY_ORDER.indexOf(w) - SENIORITY_ORDER.indexOf(job.seniority))));
    senPts = d === 0 ? 10 : d === 1 ? 5 : 0;
    if (d === 0) reasons.push(`${job.seniority[0].toUpperCase()}${job.seniority.slice(1)} level`);
  }

  // Freshness and quality (0–10)
  const ageH = (Date.now() - new Date(job.postedAt || job.firstSeenAt).getTime()) / 36e5;
  const freshPts = (ageH < 24 ? 6 : ageH < 72 ? 4 : 1) + (job.quality >= 70 ? 4 : job.quality >= 50 ? 2 : 0);

  if (job.remote && job.eligibility?.includes('worldwide')) reasons.push('Remote, open worldwide');
  if (job.salaryMin) reasons.push('Salary listed');

  const score = Math.max(0, Math.min(100, titlePts + skillPts + senPts + freshPts));
  return { pass: score >= (search.strictness ?? 60), score, reasons: reasons.slice(0, 4), gaps };
}

/** Best result across a user's active searches (+ watchlist override). */
export function bestMatch(user, job) {
  let best = null;
  const limit = planOf(user).limits.niches;
  for (const s of (user.searches || []).filter((x) => x.active).slice(0, limit)) {
    const r = scoreJob(user, s, job);
    if (!best || r.score > best.score) best = { ...r, search: s };
  }
  const watch = (user.watchlist || []).some((c) => normalizeKey(c) === job.companyKey);
  if (watch && best && !best.pass && best.score > 0) best = { ...best, pass: true, watchlisted: true, reasons: ['On your company watchlist', ...best.reasons] };
  return best;
}

/** Called after each fetch with ids of brand-new jobs. */
export async function processNewJobs(jobIds) {
  const jobs = await Job.find({ _id: { $in: jobIds }, isDuplicate: false, active: true });
  if (!jobs.length) return;
  const users = await User.find({ onboarded: true, 'searches.0': { $exists: true } });
  let total = 0;

  for (const user of users) {
    const created = [];
    for (const job of jobs) {
      const m = bestMatch(user, job);
      if (!m?.pass) continue;
      try {
        const doc = await Match.create({
          user: user._id,
          job: job._id,
          searchId: m.search?._id,
          searchName: m.search?.name,
          score: m.score,
          reasons: m.reasons,
          gaps: m.gaps,
          watchlisted: Boolean(m.watchlisted),
        });
        created.push({ match: doc, job });
      } catch (e) {
        if (e.code !== 11000) logger.warn(`[match] ${e.message}`);
      }
    }
    if (!created.length) continue;
    total += created.length;
    created.sort((a, b) => b.match.score - a.match.score);

    if (planOf(user).limits.aiMatchReasons) {
      for (const c of created.slice(0, 5)) {
        const reason = await aiMatchReason(user, c.job).catch(() => null);
        if (reason) {
          c.match.aiReason = reason;
          await c.match.save();
        }
      }
    }
    await notifyMatches(user, created).catch((e) => logger.warn(`[notify] ${e.message}`));
    await handleAutoApply(user, created).catch((e) => logger.warn(`[apply] ${e.message}`));
  }
  logger.info(`[match] ${jobs.length} new jobs → ${total} matches for ${users.length} users`);
}

/** Backfill matches for one user from recent jobs (after onboarding or editing searches). */
export async function backfillUser(user, { days = 7, limit = 1500 } = {}) {
  const jobs = await Job.find({ active: true, isDuplicate: false, firstSeenAt: { $gte: new Date(Date.now() - days * 864e5) } })
    .sort({ firstSeenAt: -1 })
    .limit(limit);
  let n = 0;
  for (const job of jobs) {
    const m = bestMatch(user, job);
    if (!m?.pass) continue;
    const r = await Match.updateOne(
      { user: user._id, job: job._id },
      { $setOnInsert: { searchId: m.search?._id, searchName: m.search?.name, score: m.score, reasons: m.reasons, gaps: m.gaps, watchlisted: Boolean(m.watchlisted), notifiedAt: new Date(), channels: ['backfill'] } },
      { upsert: true }
    );
    if (r.upsertedCount) n++;
  }
  return n;
}
