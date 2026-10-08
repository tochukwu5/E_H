/** Remote job boards with free public APIs or RSS feeds. Most ask for a link back — the UI shows source credit on every job. */
import { XMLParser } from 'fast-xml-parser';
import { request } from '../utils/http.js';
import { env } from '../config/env.js';

const xml = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
const arr = (v) => (Array.isArray(v) ? v : v == null ? [] : [v]);

export const remotive = {
  id: 'remotive',
  name: 'Remotive',
  website: 'https://remotive.com',
  terms: 'Credit Remotive and link to the original listing.',
  async fetch() {
    const data = await request('https://remotive.com/api/remote-jobs?limit=300');
    return arr(data.jobs).map((j) => ({
      sourceId: j.id,
      title: j.title,
      company: j.company_name,
      companyLogo: j.company_logo,
      location: j.candidate_required_location || 'Remote',
      remote: true,
      description: j.description,
      url: j.url,
      postedAt: j.publication_date,
      jobType: j.job_type,
      salaryText: j.salary,
      category: j.category,
      tags: j.tags,
    }));
  },
};

export const remoteok = {
  id: 'remoteok',
  name: 'RemoteOK',
  website: 'https://remoteok.com',
  terms: 'Link back to Remote OK and mention it as the source.',
  async fetch() {
    const data = await request('https://remoteok.com/api');
    return arr(data)
      .filter((j) => j && j.id && j.position)
      .map((j) => ({
        sourceId: j.id,
        title: j.position,
        company: j.company,
        companyLogo: j.company_logo || j.logo,
        location: j.location || 'Remote',
        remote: true,
        description: j.description,
        url: j.url,
        applyUrl: j.apply_url || j.url,
        postedAt: j.date || (j.epoch ? j.epoch * 1000 : undefined),
        salaryMin: j.salary_min || undefined,
        salaryMax: j.salary_max || undefined,
        salaryCurrency: j.salary_min ? 'USD' : undefined,
        salaryPeriod: j.salary_min ? 'year' : undefined,
        tags: j.tags,
      }));
  },
};

export const himalayas = {
  id: 'himalayas',
  name: 'Himalayas',
  website: 'https://himalayas.app',
  terms: 'Attribute Himalayas and link to the job page.',
  async fetch() {
    const out = [];
    for (let offset = 0; offset < 200; offset += 20) {
      const data = await request(`https://himalayas.app/jobs/api?limit=20&offset=${offset}`);
      const jobs = arr(data.jobs);
      out.push(...jobs);
      if (jobs.length < 20) break;
    }
    return out.map((j) => ({
      sourceId: j.guid || j.applicationLink,
      title: j.title,
      company: j.companyName,
      companyLogo: j.companyLogo,
      location: arr(j.locationRestrictions).join(', ') || 'Worldwide',
      remote: true,
      eligibility: arr(j.locationRestrictions).length ? undefined : ['worldwide'],
      description: j.description || j.excerpt,
      url: j.applicationLink || j.guid,
      postedAt: j.pubDate ? (String(j.pubDate).length <= 10 ? j.pubDate * 1000 : j.pubDate) : undefined,
      jobType: j.employmentType,
      salaryMin: j.minSalary,
      salaryMax: j.maxSalary,
      salaryCurrency: j.currency || (j.minSalary ? 'USD' : undefined),
      salaryPeriod: j.minSalary ? 'year' : undefined,
      tags: [...arr(j.categories), ...arr(j.seniority)],
    }));
  },
};

export const jobicy = {
  id: 'jobicy',
  name: 'Jobicy',
  website: 'https://jobicy.com',
  terms: 'Link back to Jobicy. Fetch at most a few times per hour.',
  async fetch() {
    const data = await request('https://jobicy.com/api/v2/remote-jobs?count=100');
    return arr(data.jobs).map((j) => ({
      sourceId: j.id,
      title: j.jobTitle,
      company: j.companyName,
      companyLogo: j.companyLogo,
      location: j.jobGeo || 'Remote',
      remote: true,
      description: j.jobDescription || j.jobExcerpt,
      url: j.url,
      postedAt: j.pubDate,
      jobType: arr(j.jobType).join(' '),
      salaryMin: j.annualSalaryMin,
      salaryMax: j.annualSalaryMax,
      salaryCurrency: j.salaryCurrency,
      salaryPeriod: j.annualSalaryMin ? 'year' : undefined,
      tags: [...arr(j.jobIndustry), j.jobLevel].filter(Boolean),
    }));
  },
};

export const arbeitnow = {
  id: 'arbeitnow',
  name: 'Arbeitnow',
  website: 'https://www.arbeitnow.com',
  terms: 'Free API. Credit Arbeitnow.',
  async fetch() {
    const out = [];
    for (let page = 1; page <= 3; page++) {
      const data = await request(`https://www.arbeitnow.com/api/job-board-api?page=${page}`);
      out.push(...arr(data.data));
      if (!data.links?.next) break;
    }
    return out.map((j) => ({
      sourceId: j.slug,
      title: j.title,
      company: j.company_name,
      location: j.location,
      remote: j.remote,
      description: j.description,
      url: j.url,
      postedAt: j.created_at ? j.created_at * 1000 : undefined,
      jobType: arr(j.job_types).join(' '),
      tags: j.tags,
      country: 'DE',
    }));
  },
};

export const weworkremotely = {
  id: 'weworkremotely',
  name: 'We Work Remotely',
  website: 'https://weworkremotely.com',
  terms: 'Public RSS feeds. Link to the original listing.',
  async fetch() {
    const feeds = ['remote-programming-jobs', 'remote-design-jobs', 'remote-customer-support-jobs', 'remote-sales-and-marketing-jobs', 'remote-devops-sysadmin-jobs', 'remote-management-and-finance-jobs', 'all-other-remote-jobs'];
    const out = [];
    for (const f of feeds) {
      try {
        const body = await request(`https://weworkremotely.com/categories/${f}.rss`, { as: 'text' });
        const items = arr(xml.parse(body)?.rss?.channel?.item);
        for (const it of items) {
          const [company, ...rest] = String(it.title || '').split(':');
          out.push({
            sourceId: String(it.guid?.['#text'] || it.guid || it.link).split('/').pop(),
            title: rest.join(':').trim() || it.title,
            company: rest.length ? company.trim() : undefined,
            location: it.region || 'Remote',
            remote: true,
            description: it.description,
            url: it.link,
            postedAt: it.pubDate,
            jobType: it.type,
            category: it.category,
            companyLogo: it['media:content']?.['@_url'],
          });
        }
      } catch {
        /* one feed failing shouldn't stop the others */
      }
    }
    return out;
  },
};

export const workingnomads = {
  id: 'workingnomads',
  name: 'Working Nomads',
  website: 'https://www.workingnomads.com',
  terms: 'Public jobs feed. Link back to Working Nomads.',
  async fetch() {
    const data = await request('https://www.workingnomads.com/api/exposed_jobs/');
    return arr(data).map((j) => ({
      sourceId: j.url,
      title: j.title,
      company: j.company_name,
      location: j.location || 'Remote',
      remote: true,
      description: j.description,
      url: j.url,
      postedAt: j.pub_date,
      category: j.category_name,
      tags: String(j.tags || '').split(',').map((t) => t.trim()).filter(Boolean),
    }));
  },
};

export const findwork = {
  id: 'findwork',
  name: 'Findwork',
  website: 'https://findwork.dev',
  needsKey: 'FINDWORK_API_KEY',
  enabled: () => Boolean(env.keys.findwork),
  async fetch() {
    const data = await request('https://findwork.dev/api/jobs/?sort_by=date', { headers: { Authorization: `Token ${env.keys.findwork}` } });
    return arr(data.results).map((j) => ({
      sourceId: j.id,
      title: j.role,
      company: j.company_name,
      companyLogo: j.logo,
      location: j.location,
      remote: j.remote,
      description: j.text,
      url: j.url,
      postedAt: j.date_posted,
      jobType: j.employment_type,
      tags: j.keywords,
    }));
  },
};

export const themuse = {
  id: 'themuse',
  name: 'The Muse',
  website: 'https://www.themuse.com',
  needsKey: 'THEMUSE_API_KEY',
  enabled: () => Boolean(env.keys.themuse),
  async fetch() {
    const out = [];
    for (let page = 0; page < 5; page++) {
      const data = await request(`https://www.themuse.com/api/public/jobs?page=${page}&descending=true&api_key=${env.keys.themuse}`);
      out.push(...arr(data.results));
    }
    return out.map((j) => ({
      sourceId: j.id,
      title: j.name,
      company: j.company?.name,
      location: arr(j.locations).map((l) => l.name).join(', '),
      description: j.contents,
      url: j.refs?.landing_page,
      postedAt: j.publication_date,
      tags: [...arr(j.categories).map((c) => c.name), ...arr(j.levels).map((l) => l.name)],
      jobType: arr(j.levels).some((l) => /intern/i.test(l.name)) ? 'internship' : undefined,
    }));
  },
};

export const BOARD_SOURCES = [remotive, remoteok, himalayas, jobicy, arbeitnow, weworkremotely, workingnomads, findwork, themuse];
