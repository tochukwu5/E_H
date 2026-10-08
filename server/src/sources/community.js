/** Freelance and community sources. Good for freelancers and gig work. */
import { request } from '../utils/http.js';
import { env } from '../config/env.js';

const arr = (v) => (Array.isArray(v) ? v : v == null ? [] : [v]);

export const hackernews = {
  id: 'hackernews',
  name: 'Hacker News: Who is hiring?',
  website: 'https://news.ycombinator.com',
  async fetch() {
    // Latest monthly thread posted by the "whoishiring" account (via the public Algolia HN API)
    const search = await request('https://hn.algolia.com/api/v1/search_by_date?tags=story,author_whoishiring&hitsPerPage=5');
    const thread = arr(search.hits).find((h) => /who is hiring/i.test(h.title));
    if (!thread) return [];
    const item = await request(`https://hn.algolia.com/api/v1/items/${thread.objectID}`);
    return arr(item.children)
      .filter((c) => c.text && !c.deleted)
      .map((c) => {
        const plain = c.text.replace(/<[^>]+>/g, ' ');
        const head = plain.split(/\n|<p>/)[0];
        const parts = head.split('|').map((s) => s.trim()).filter(Boolean);
        return {
          sourceId: c.id,
          title: parts.find((p) => /engineer|developer|designer|manager|scientist|analyst|lead|head|marketing|sales|ops|support/i.test(p)) || parts[1] || 'Open roles',
          company: parts[0]?.slice(0, 80),
          location: parts.find((p) => /remote|onsite|hybrid|,|\b[A-Z]{2}\b/.test(p) && p !== parts[0]) || '',
          description: c.text,
          url: `https://news.ycombinator.com/item?id=${c.id}`,
          postedAt: c.created_at,
          tags: ['hacker news'],
        };
      });
  },
};

export const freelancer = {
  id: 'freelancer',
  name: 'Freelancer.com',
  website: 'https://www.freelancer.com',
  keywordBased: true,
  async fetch({ keywords }) {
    const out = [];
    for (const kw of keywords.slice(0, 6)) {
      try {
        const data = await request(`https://www.freelancer.com/api/projects/0.1/projects/active/?query=${encodeURIComponent(kw)}&limit=50&full_description=true&job_details=true&sort_field=time_updated`);
        out.push(
          ...arr(data.result?.projects).map((p) => ({
            sourceId: p.id,
            title: p.title,
            company: 'Freelancer.com client',
            location: 'Remote',
            remote: true,
            eligibility: ['worldwide'],
            description: p.description || p.preview_description,
            url: `https://www.freelancer.com/projects/${p.seo_url}`,
            postedAt: p.submitdate ? p.submitdate * 1000 : undefined,
            jobType: 'freelance',
            salaryMin: p.budget?.minimum,
            salaryMax: p.budget?.maximum,
            salaryCurrency: p.currency?.code,
            salaryPeriod: p.type === 'hourly' ? 'hour' : 'project',
            tags: arr(p.jobs).map((j) => j.name),
          }))
        );
      } catch {
        /* keep going */
      }
    }
    return out;
  },
};

let redditToken = { value: null, exp: 0 };
export const reddit = {
  id: 'reddit',
  name: 'Reddit (r/forhire, r/hiring)',
  website: 'https://www.reddit.com',
  needsKey: 'REDDIT_CLIENT_ID + REDDIT_CLIENT_SECRET + REDDIT_ENABLED=true',
  note: 'Commercial use needs a paid agreement with Reddit. Off by default.',
  enabled: () => Boolean(env.keys.redditEnabled && env.keys.redditId && env.keys.redditSecret),
  async fetch() {
    if (!redditToken.value || Date.now() > redditToken.exp) {
      const auth = Buffer.from(`${env.keys.redditId}:${env.keys.redditSecret}`).toString('base64');
      const t = await request('https://www.reddit.com/api/v1/access_token', { method: 'POST', headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'grant_type=client_credentials' });
      redditToken = { value: t.access_token, exp: Date.now() + (t.expires_in - 60) * 1000 };
    }
    const data = await request('https://oauth.reddit.com/r/forhire+hiring+remotejs/new?limit=100', { headers: { Authorization: `Bearer ${redditToken.value}` } });
    return arr(data.data?.children)
      .map((c) => c.data)
      .filter((p) => /\[hiring\]/i.test(p.title))
      .map((p) => ({
        sourceId: p.id,
        title: p.title.replace(/\[hiring\]/i, '').trim(),
        company: `u/${p.author}`,
        location: /remote/i.test(p.title) ? 'Remote' : '',
        description: p.selftext,
        url: `https://www.reddit.com${p.permalink}`,
        postedAt: p.created_utc * 1000,
        jobType: /\b(contract|project|gig)\b/i.test(p.title) ? 'freelance' : undefined,
        tags: [p.subreddit],
      }));
  },
};

export const COMMUNITY_SOURCES = [hackernews, freelancer, reddit];
