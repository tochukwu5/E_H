/**
 * WhatsApp Cloud API (Meta). Messages that start a conversation must use a template
 * approved in WhatsApp Manager. Create a template named WHATSAPP_TEMPLATE_NAME with
 * body variables: {{1}} job title, {{2}} company, {{3}} location, {{4}} match score, {{5}} link.
 * Each template message is billed by Meta — factor it into plan pricing.
 */
import { env } from '../config/env.js';

export const whatsappEnabled = () => Boolean(env.whatsapp.token && env.whatsapp.phoneId);

async function send(payload) {
  const res = await fetch(`https://graph.facebook.com/v21.0/${env.whatsapp.phoneId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.whatsapp.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', ...payload }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`WhatsApp: ${data.error?.message || res.status}`);
  return data;
}

export async function sendWhatsAppMatch(phone, { job, match }, link) {
  if (!whatsappEnabled()) return null;
  const to = String(phone).replace(/[^\d]/g, '');
  return send({
    to,
    type: 'template',
    template: { 
      name: env.whatsapp.template,
      language: { code: env.whatsapp.lang },
      components: [
        {
          type: 'body',
          parameters: [job.title, job.company, job.location || 'Remote', String(match.score), link].map((text) => ({ type: 'text', text: String(text).slice(0, 200) })),
        },
      ],
    },
  });
}

export async function sendWhatsAppText(phone, body) {
  if (!whatsappEnabled()) return null;
  return send({ to: String(phone).replace(/[^\d]/g, ''), type: 'text', text: { body: body.slice(0, 4000), preview_url: false } });
}
