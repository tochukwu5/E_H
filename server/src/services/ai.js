import Anthropic from '@anthropic-ai/sdk';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

let client = null;
const ai = () => {
  if (!env.anthropicKey) return null;
  if (!client) client = new Anthropic({ apiKey: env.anthropicKey });
  return client;
};
export const aiEnabled = () => Boolean(env.anthropicKey);

async function complete(prompt, maxTokens = 600) {
  const c = ai();
  if (!c) return null;
  try {
    const res = await c.messages.create({ model: env.anthropicModel, max_tokens: maxTokens, messages: [{ role: 'user', content: prompt }] });
    return res.content?.find((b) => b.type === 'text')?.text?.trim() || null;
  } catch (e) {
    logger.warn(`[ai] ${e.message}`);
    return null;
  }
}

function profileBlock(user, resumeText = '') {
  const p = user.profile || {};
  return [
    `Name: ${user.name}`,
    p.headline && `Headline: ${p.headline}`,
    p.experienceLevel && `Level: ${p.experienceLevel}${p.yearsExperience ? `, ${p.yearsExperience} years` : ''}`,
    p.skills?.length && `Skills: ${p.skills.join(', ')}`,
    p.summary && `Summary: ${p.summary}`,
    p.links?.portfolio && `Portfolio: ${p.links.portfolio}`,
    p.links?.github && `GitHub: ${p.links.github}`,
    p.links?.linkedin && `LinkedIn: ${p.links.linkedin}`,
    resumeText && `Resume (excerpt):\n${resumeText.slice(0, 5000)}`,
  ]
    .filter(Boolean)
    .join('\n');
}

const jobBlock = (job) => `Title: ${job.title}\nCompany: ${job.company}\nLocation: ${job.location || 'n/a'}\nType: ${job.jobType}\nDescription:\n${(job.description || '').slice(0, 6000)}`;

export async function aiMatchReason(user, job) {
  return complete(
    `In one sentence under 25 words, tell this candidate why the job fits them and name the single biggest gap, if any. Plain language, no preamble.\n\nCANDIDATE\n${profileBlock(user)}\n\nJOB\n${jobBlock(job)}`,
    80
  );
}

const LENGTH = { short: '120–160 words', medium: '180–240 words', long: '260–340 words' };

/** Cover letter / freelance proposal. Falls back to a solid template when no AI key is set. */
export async function writeCoverLetter(user, job, { tone = 'professional', length = 'short', resumeText = '' } = {}) {
  const isGig = job.jobType === 'freelance';
  const text = await complete(
    `Write a ${isGig ? 'freelance proposal' : 'cover letter'} for this candidate.

Rules:
- ${LENGTH[length] || LENGTH.short}, ${tone} tone, first person, sounds like a real person wrote it.
- Open with something specific from the job description, not "I am writing to apply".
- Connect 2–3 concrete things from the candidate's background to what the job needs. Never invent experience, employers, numbers or skills the candidate does not list.
- ${isGig ? 'Briefly say how you would approach the project and end with a question.' : 'End with a short, confident call to action.'}
- No subject line, no placeholders like [Company], no markdown.

CANDIDATE
${profileBlock(user, resumeText)}

JOB
${jobBlock(job)}`,
    900
  );
  if (text) return text;

  // Template fallback
  const skills = (user.profile?.skills || []).filter((s) => (job.skills || []).includes(s)).slice(0, 3);
  const skillLine = skills.length ? `I work daily with ${skills.join(', ')}, which lines up closely with what you've described.` : `My background lines up closely with what you've described.`;
  return `Hi ${job.company} team,

I came across the ${job.title} role and wanted to reach out. ${skillLine}

${user.profile?.headline ? `${user.profile.headline}. ` : ''}${user.profile?.yearsExperience ? `Over ${user.profile.yearsExperience} years I've shipped work end to end and taken ownership of results. ` : ''}I'd bring that same focus to your team from day one.
${user.profile?.links?.portfolio ? `\nYou can see some of my work here: ${user.profile.links.portfolio}\n` : ''}
I'd love to talk about how I can help. Thanks for your time.

${user.name}`;
}

/** Draft answers to common screening questions from the user's saved answers + profile. */
export function screeningAnswers(user, job) {
  const a = user.apply?.answers || {};
  const p = user.profile || {};
  const out = [];
  if (p.yearsExperience) out.push({ question: 'Years of relevant experience', answer: String(p.yearsExperience) });
  if (a.workAuthorization) out.push({ question: 'Are you authorized to work in this location?', answer: a.workAuthorization });
  out.push({ question: 'Will you now or in the future require visa sponsorship?', answer: a.needsSponsorship ? 'Yes' : 'No' });
  if (a.noticePeriod) out.push({ question: 'When can you start?', answer: a.noticePeriod });
  if (a.salaryExpectation) out.push({ question: 'Salary expectations', answer: a.salaryExpectation });
  if (!job.remote) out.push({ question: 'Are you willing to relocate?', answer: a.willingToRelocate ? 'Yes' : 'No' });
  if (p.links?.linkedin) out.push({ question: 'LinkedIn profile', answer: p.links.linkedin });
  if (p.links?.portfolio || p.links?.github) out.push({ question: 'Portfolio / GitHub', answer: p.links.portfolio || p.links.github });
  return out;
}
