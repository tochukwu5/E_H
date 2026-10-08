import { env } from '../config/env.js';

const UA = `EmployHuntBot/1.0 (+${env.siteUrl}; ${env.contactEmail})`;

/**
 * fetch with a timeout, a polite User-Agent and simple retry on 429/5xx.
 * Returns parsed JSON, text, or throws an Error with `status`.
 */
export async function request(url, { method = 'GET', headers = {}, body, timeout = 20000, as = 'json', retries = 1 } = {}) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeout);
    try {
      const res = await fetch(url, {
        method,
        headers: { 'User-Agent': UA, Accept: as === 'json' ? 'application/json' : '*/*', ...headers },
        body: body && typeof body !== 'string' && !(body instanceof URLSearchParams) ? JSON.stringify(body) : body,
        signal: ctrl.signal,
      });
      if ((res.status === 429 || res.status >= 500) && attempt < retries) {
        await sleep(1500 * (attempt + 1));
        continue;
      }
      if (!res.ok) {
        const err = new Error(`${method} ${url} → HTTP ${res.status}`);
        err.status = res.status;
        throw err;
      }
      return as === 'json' ? await res.json() : await res.text();
    } finally {
      clearTimeout(t);
    }
  }
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Run async tasks with a concurrency cap. */
export async function pool(items, limit, fn) {
  const out = [];
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      try {
        out[idx] = await fn(items[idx], idx);
      } catch (e) {
        out[idx] = { error: e };
      }
    }
  });
  await Promise.all(workers);
  return out;
}
