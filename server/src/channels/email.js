import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

let transport = null;
const getTransport = () => {
  if (!env.smtp.host) return null;
  if (!transport) {
    transport = nodemailer.createTransport({
      host: env.smtp.host, port: env.smtp.port, secure: env.smtp.port === 465,
      auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
      connectionTimeout: 10_000, greetingTimeout: 10_000, socketTimeout: 15_000,
    });
  }
  return transport;
};

/** "EmployHunt <hello@site.com>" → { name: 'EmployHunt', email: 'hello@site.com' } */
function parseFrom(from) {
  const m = String(from).match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  return m ? { name: m[1].trim() || 'EmployHunt', email: m[2].trim() } : { name: 'EmployHunt', email: String(from).trim() };
}

/** Send through Brevo's HTTPS API (port 443), which works on hosts that block SMTP. */
async function sendViaBrevoApi({ to, subject, html, text }) {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': env.brevoApiKey, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ sender: parseFrom(env.smtp.from), to: [{ email: to }], subject, htmlContent: html || undefined, textContent: text || undefined }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(`Brevo API ${res.status}: ${body.message || body.code || 'send failed'}`);
  }
  return res.json().catch(() => ({}));
}

export async function sendEmail({ to, subject, html, text }) {
  if (env.brevoApiKey) return sendViaBrevoApi({ to, subject, html, text });
  const t = getTransport();
  if (!t) {
    logger.info(`[email:dev] to=${to} subject="${subject}"\n${text || html?.replace(/<[^>]+>/g, ' ').slice(0, 600)}`);
    return { dev: true };
  }
  return t.sendMail({ from: env.smtp.from, to, subject, html, text });
}

const esc = (s = '') => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export function layout(title, inner) {
  return `<!doctype html><html><body style="margin:0;background:#f3f5f9;font-family:Figtree,Segoe UI,Arial,sans-serif;color:#17213a">
  <div style="max-width:560px;margin:0 auto;padding:32px 20px">
    <div style="font-weight:700;font-size:18px;margin-bottom:20px;color:#2747d6">EmployHunt</div>
    <div style="background:#fff;border:1px solid #e3e8f1;border-radius:14px;padding:28px">
      <h1 style="font-size:20px;margin:0 0 16px">${esc(title)}</h1>${inner}
    </div>
    <p style="font-size:12px;color:#6b7690;margin-top:20px">You get this because you have alerts on at EmployHunt. Change what you receive in Settings → Alerts.</p>
  </div></body></html>`;
}

export function jobListHtml(items) {
  return items
    .map(
      ({ job, match }) => `<div style="padding:14px 0;border-top:1px solid #eef1f6">
      <a href="${esc(job.applyUrl || job.url)}" style="font-weight:600;color:#17213a;text-decoration:none;font-size:15px">${esc(job.title)}</a>
      <div style="font-size:13px;color:#4c5878;margin-top:4px">${esc(job.company)} · ${esc(job.location || 'Not specified')}</div>
      <div style="font-size:13px;color:#0f8f6b;margin-top:4px">Match ${match.score}/100${match.reasons?.[0] ? ` — ${esc(match.reasons[0])}` : ''}</div>
    </div>`
    )
    .join('');
}

export { esc as escapeHtml };