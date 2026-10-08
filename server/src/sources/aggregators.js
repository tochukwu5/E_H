/** Aggregators with official API keys. They search by keyword, so the fetcher passes the keywords users actually track. */
import { request } from '../utils/http.js';
import { env } from '../config/env.js';

const arr = (v) => (Array.isArray(v) ? v : v == null ? [] : [v]);

export const adzuna = {
  id: 'adzuna',
  name: 'Adzuna',
  website: 'https://www.adzuna.com',
  needsKey: 'ADZUNA_APP_ID + ADZUNA_APP_KEY',
  keywordBased: true,
  enabled: () => Boolean(env.keys.adzunaId && env.keys.adzunaKey),
  async fetch({ keywords }) {
    const out = [];
    for (const country of env.keys.adzunaCountries) {
      for (const kw of keywords.slice(0, 6)) {
        const u = `https://api.adzuna.com/v1/api/jobs/${country}/search/1?app_id=${env.keys.adzunaId}&app_key=${env.keys.adzunaKey}&results_per_page=50&max_days_old=3&sort_by=date&what=${encodeURIComponent(kw)}&content-type=application/json`;
        try {
          const data = await request(u);
          out.push(
            ...arr(data.results).map((j) => ({
              sourceId: j.id,
              title: j.title,
              company: j.company?.display_name,
              location: j.location?.display_name,
              country: country.toUpperCase(),
              description: j.description,
              url: j.redirect_url,
              postedAt: j.created,
              jobType: [j.contract_time, j.contract_type].filter(Boolean).join(' '),
              salaryMin: j.salary_min,
              salaryMax: j.salary_max,
              salaryPeriod: j.salary_min ? 'year' : undefined,
              salaryCurrency: { gb: 'GBP', us: 'USD', ca: 'CAD', au: 'AUD', de: 'EUR', fr: 'EUR', za: 'ZAR', in: 'INR', nl: 'EUR' }[country],
              category: j.category?.label,
            }))
          );
        } catch {
          /* keep going */
        }
      }
    }
    return out;
  },
};

export const jooble = {
  id: 'jooble',
  name: 'Jooble',
  website: 'https://jooble.org',
  needsKey: 'JOOBLE_API_KEY',
  keywordBased: true,
  enabled: () => Boolean(env.keys.jooble),
  async fetch({ keywords }) {
    const out = [];
    for (const kw of keywords.slice(0, 8)) {
      try {
        const data = await request(`https://jooble.org/api/${env.keys.jooble}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: { keywords: kw, location: '', page: 1 } });
        out.push(
          ...arr(data.jobs).map((j) => ({
            sourceId: j.id,
            title: j.title,
            company: j.company,
            location: j.location,
            description: j.snippet,
            url: j.link,
            postedAt: j.updated,
            jobType: j.type,
            salaryText: j.salary,
          }))
        );
      } catch {
        /* keep going */
      }
    }
    return out;
  },
};

export const careerjet = {
  id: 'careerjet',
  name: 'Careerjet',
  website: 'https://www.careerjet.com',
  needsKey: 'CAREERJET_AFFID',
  keywordBased: true,
  enabled: () => Boolean(env.keys.careerjet),
  async fetch({ keywords }) {
    const out = [];
    for (const locale of ['en_GB', 'en_US', 'en_NG', 'en_ZA']) {
      for (const kw of keywords.slice(0, 4)) {
        const u = `http://public.api.careerjet.net/search?locale_code=${locale}&keywords=${encodeURIComponent(kw)}&pagesize=50&sort=date&affid=${env.keys.careerjet}&user_ip=127.0.0.1&user_agent=EmployHuntBot&url=${encodeURIComponent(env.siteUrl)}`;
        try {
          const data = await request(u);
          out.push(
            ...arr(data.jobs).map((j) => ({
              sourceId: j.url,
              title: j.title,
              company: j.company,
              location: j.locations,
              description: j.description,
              url: j.url,
              postedAt: j.date,
              salaryText: j.salary,
            }))
          );
        } catch {
          /* keep going */
        }
      }
    }
    return out;
  },
};

export const reed = {
  id: 'reed',
  name: 'Reed',
  website: 'https://www.reed.co.uk',
  needsKey: 'REED_API_KEY',
  keywordBased: true,
  enabled: () => Boolean(env.keys.reed),
  async fetch({ keywords }) {
    const auth = `Basic ${Buffer.from(`${env.keys.reed}:`).toString('base64')}`;
    const out = [];
    for (const kw of keywords.slice(0, 8)) {
      try {
        const data = await request(`https://www.reed.co.uk/api/1.0/search?keywords=${encodeURIComponent(kw)}&resultsToTake=100`, { headers: { Authorization: auth } });
        out.push(
          ...arr(data.results).map((j) => {
            const [d, m, y] = String(j.date || '').split('/');
            return {
              sourceId: j.jobId,
              title: j.jobTitle,
              company: j.employerName,
              location: j.locationName,
              country: 'GB',
              description: j.jobDescription,
              url: j.jobUrl,
              postedAt: y ? `${y}-${m}-${d}` : undefined,
              salaryMin: j.minimumSalary,
              salaryMax: j.maximumSalary,
              salaryCurrency: j.currency || 'GBP',
              salaryPeriod: j.minimumSalary ? 'year' : undefined,
            };
          })
        );
      } catch {
        /* keep going */
      }
    }
    return out;
  },
};

export const AGGREGATOR_SOURCES = [adzuna, jooble, careerjet, reed];
