import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

const api = (method) => `https://api.telegram.org/bot${env.telegram.token}/${method}`;
export const telegramEnabled = () => Boolean(env.telegram.token);
export const telegramLink = (code) => `https://t.me/${env.telegram.username}?start=${code}`;

export async function tg(method, payload) {
  if (!telegramEnabled()) return null;
  const res = await fetch(api(method), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  const data = await res.json().catch(() => ({}));
  if (!data.ok) throw new Error(`Telegram ${method}: ${data.description || res.status}`);
  return data.result;
}

const esc = (s = '') => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);

export function formatMatch({ job, match }) {
  const salary = job.salaryMin ? `\n💰 ${job.salaryCurrency || ''} ${Math.round(job.salaryMin).toLocaleString()}${job.salaryMax ? `–${Math.round(job.salaryMax).toLocaleString()}` : ''}${job.salaryPeriod === 'hour' ? '/hr' : job.salaryPeriod === 'year' ? '/yr' : ''}` : '';
  const why = match.aiReason || match.reasons?.join(' · ');
  return `<b>${esc(job.title)}</b>\n🏢 ${esc(job.company)}\n📍 ${esc(job.location || 'Not specified')}${job.remote ? ' · Remote' : ''}${salary}\n🎯 Match ${match.score}/100${why ? `\n<i>${esc(why)}</i>` : ''}\n\n${esc((job.excerpt || '').slice(0, 220))}\n\nSource: ${esc(job.sourceName || job.source)}`;
}

export function matchKeyboard({ job, match }, { canDraft }) {
  const row2 = [
    { text: '⭐ Save', callback_data: `save:${match._id}` },
    { text: '✖ Skip', callback_data: `skip:${match._id}` },
  ];
  if (canDraft) row2.push({ text: '✍ Draft application', callback_data: `draft:${match._id}` });
  return { inline_keyboard: [[{ text: 'Open and apply', url: job.applyUrl || job.url }], row2] };
}

export async function sendTelegram(chatId, html, replyMarkup) {
  return tg('sendMessage', { chat_id: chatId, text: html, parse_mode: 'HTML', disable_web_page_preview: true, reply_markup: replyMarkup });
}

/** Long polling loop for local development (TELEGRAM_POLLING=true). */
export function startTelegramPolling(handleUpdate) {
  if (!telegramEnabled() || !env.telegram.polling) return;
  let offset = 0;
  let stopped = false;
  const loop = async () => {
    while (!stopped) {
      try {
        const updates = await tg('getUpdates', { offset, timeout: 30, allowed_updates: ['message', 'callback_query'] });
        for (const u of updates || []) {
          offset = u.update_id + 1;
          await handleUpdate(u).catch((e) => logger.warn(`[telegram] update failed: ${e.message}`));
        }
      } catch (e) {
        logger.warn(`[telegram] polling: ${e.message}`);
        await new Promise((r) => setTimeout(r, 5000));
      }
    }
  };
  tg('deleteWebhook', {}).catch(() => {});
  loop();
  logger.info('[telegram] polling started');
  return () => (stopped = true);
}
