import Match from '../models/Match.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { planOf } from '../config/plans.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { sendTelegram, formatMatch, matchKeyboard, telegramEnabled } from '../channels/telegram.js';
import { sendWhatsAppMatch, whatsappEnabled } from '../channels/whatsapp.js';
import { sendEmail, layout, jobListHtml } from '../channels/email.js';

/** Current hour (0–23) in the user's timezone. */
export function localHour(tz = 'UTC') {
  try {
    return Number(new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hourCycle: 'h23', timeZone: tz }).format(new Date()));
  } catch {
    return new Date().getUTCHours();
  }
}

function inQuietHours(user) {
  const q = user.alerts?.quietHours;
  if (!q?.enabled) return false;
  const h = localHour(user.profile?.timezone);
  return q.start > q.end ? h >= q.start || h < q.end : h >= q.start && h < q.end;
}

const jobLink = (job) => `${env.siteUrl}/jobs/${job.slug}`;

/** Which channels this user can receive on right now (plan + settings + server config). */
export function activeChannels(user) {
  const allowed = planOf(user).limits.channels;
  const out = [];
  if (user.alerts?.telegram?.enabled && user.alerts.telegram.chatId && allowed.includes('telegram') && telegramEnabled()) out.push('telegram');
  if (user.alerts?.whatsapp?.enabled && user.alerts.whatsapp.optIn && user.alerts.whatsapp.phone && allowed.includes('whatsapp') && whatsappEnabled()) out.push('whatsapp');
  if (user.alerts?.email?.enabled && allowed.includes('email')) out.push('email');
  return out;
}

async function deliverOne(user, item, channels) {
  const sent = [];
  const plan = planOf(user);
  for (const ch of channels) {
    try {
      if (ch === 'telegram') {
        await sendTelegram(user.alerts.telegram.chatId, formatMatch(item), matchKeyboard(item, { canDraft: plan.limits.coverLetters > 0 }));
        sent.push(ch);
      } else if (ch === 'whatsapp') {
        await sendWhatsAppMatch(user.alerts.whatsapp.phone, item, jobLink(item.job));
        sent.push(ch);
      }
    } catch (e) {
      logger.warn(`[notify] ${ch} → ${user.email}: ${e.message}`);
    }
  }
  return sent;
}

/** Instant delivery for fresh matches. Anything held back goes into the next digest. */
export async function notifyMatches(user, items) {
  user.rollUsage();
  const plan = planOf(user);
  const top = items.slice(0, 20);

  await Notification.create({
    user: user._id,
    type: 'match',
    title: top.length === 1 ? `New match: ${top[0].job.title}` : `${items.length} new matches`,
    body: top.slice(0, 3).map((i) => `${i.job.title} at ${i.job.company} (${i.match.score})`).join('\n'),
    link: '/app/matches',
  });

  const instant = plan.limits.delivery === 'instant' && user.alerts?.delivery === 'instant';
  if (!instant || inQuietHours(user)) return; // digest picks these up later

  const cap = Math.min(user.alerts?.maxPerDay || 20, plan.limits.maxAlertsPerDay);
  const channels = activeChannels(user).filter((c) => c !== 'email'); // email goes as a digest, not one per job
  if (!channels.length) return;

  for (const item of top) {
    if (user.usage.alertsToday >= cap) break;
    const sent = await deliverOne(user, item, channels);
    if (sent.length) {
      user.usage.alertsToday += 1;
      await Match.updateOne({ _id: item.match._id }, { notifiedAt: new Date(), channels: sent });
    }
  }
  await User.updateOne({ _id: user._id }, { usage: user.usage });
}

/** Hourly: send each user a digest at their chosen local hour. */
export async function sendDigests() {
  const users = await User.find({ onboarded: true });
  for (const user of users) {
    if (localHour(user.profile?.timezone) !== (user.alerts?.digestHour ?? 8)) continue;
    if (user.lastDigestAt && Date.now() - user.lastDigestAt.getTime() < 20 * 36e5) continue;

    const matches = await Match.find({ user: user._id, notifiedAt: null, inDigest: false, status: 'new', createdAt: { $gte: new Date(Date.now() - 36 * 36e5) } })
      .sort({ score: -1 })
      .limit(15)
      .populate('job');
    const items = matches.filter((m) => m.job).map((m) => ({ match: m, job: m.job }));
    if (!items.length) continue;

    const channels = activeChannels(user);
    const title = `${items.length} job${items.length > 1 ? 's' : ''} matched your searches`;
    try {
      if (channels.includes('email')) {
        await sendEmail({ to: user.email, subject: title, html: layout(title, `${jobListHtml(items)}<p style="margin-top:20px"><a href="${env.siteUrl}/app/matches" style="background:#2747d6;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;font-weight:600">See all matches</a></p>`) });
      }
      if (channels.includes('telegram')) {
        const lines = items.slice(0, 10).map((i, n) => `${n + 1}. <a href="${i.job.applyUrl || i.job.url}">${i.job.title}</a> — ${i.job.company} (${i.match.score})`);
        await sendTelegram(user.alerts.telegram.chatId, `<b>Your daily digest</b>\n\n${lines.join('\n')}\n\n<a href="${env.siteUrl}/app/matches">See all on EmployHunt</a>`);
      }
      await Match.updateMany({ _id: { $in: items.map((i) => i.match._id) } }, { inDigest: true, notifiedAt: new Date() });
      await User.updateOne({ _id: user._id }, { lastDigestAt: new Date() });
    } catch (e) {
      logger.warn(`[digest] ${user.email}: ${e.message}`);
    }
  }
}

export async function notifyUser(user, { type = 'system', title, body, link, telegram = true }) {
  await Notification.create({ user: user._id, type, title, body, link });
  if (telegram && activeChannels(user).includes('telegram')) {
    await sendTelegram(user.alerts.telegram.chatId, `<b>${title}</b>${body ? `\n${body}` : ''}${link ? `\n\n${env.siteUrl}${link}` : ''}`).catch(() => {});
  }
}
