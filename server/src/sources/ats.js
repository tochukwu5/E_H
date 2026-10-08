/**
 * Company career pages on ATS platforms that publish official, public job-board feeds.
 * Each adapter takes ONE company slug and returns raw jobs. The fetcher loops over
 * the Company collection (managed in Admin → Companies).
 */
import { XMLParser } from 'fast-xml-parser';
import { request } from '../utils/http.js';

const xml = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_', cdataPropName: false, trimValues: true });
const arr = (v) => (Array.isArray(v) ? v : v == null ? [] : [v]);

export const greenhouse = {
  id: 'greenhouse',
  name: 'Greenhouse',
  website: 'https://www.greenhouse.com',
  docs: 'https://developers.greenhouse.io/job-board.html',
  async fetchCompany(c) {
    const data = await request(`https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(c.slug)}/jobs?content=true`);
    return arr(data.jobs).map((j) => ({
      sourceId: `${c.slug}-${j.id}`,
      title: j.title,
      company: c.name,
      location: j.location?.name,
      description: j.content,
      url: j.absolute_url,
      applyUrl: j.absolute_url,
      postedAt: j.first_published || j.updated_at,
      tags: arr(j.departments).map((d) => d.name),
      ats: 'greenhouse',
    }));
  },
};

export const lever = {
  id: 'lever',
  name: 'Lever',
  website: 'https://www.lever.co',
  docs: 'https://github.com/lever/postings-api',
  async fetchCompany(c) {
    const data = await request(`https://api.lever.co/v0/postings/${encodeURIComponent(c.slug)}?mode=json`);
    return arr(data).map((j) => ({
      sourceId: j.id,
      title: j.text,
      company: c.name,
      location: j.categories?.location || arr(j.categories?.allLocations).join(', '),
      description: [j.descriptionPlain || j.description, ...arr(j.lists).map((l) => `${l.text}\n${l.content}`), j.additionalPlain || j.additional].filter(Boolean).join('\n\n'),
      url: j.hostedUrl,
      applyUrl: j.applyUrl || j.hostedUrl,
      postedAt: j.createdAt,
      remote: j.workplaceType ? j.workplaceType === 'remote' : undefined,
      workMode: j.workplaceType,
      jobType: j.categories?.commitment,
      salaryMin: j.salaryRange?.min,
      salaryMax: j.salaryRange?.max,
      salaryCurrency: j.salaryRange?.currency,
      salaryPeriod: j.salaryRange?.interval?.includes('hour') ? 'hour' : j.salaryRange ? 'year' : undefined,
      tags: [j.categories?.team, j.categories?.department].filter(Boolean),
      ats: 'lever',
    }));
  },
};

export const ashby = {
  id: 'ashby',
  name: 'Ashby',
  website: 'https://www.ashbyhq.com',
  docs: 'https://developers.ashbyhq.com/docs/public-job-posting-api',
  async fetchCompany(c) {
    const data = await request(`https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(c.slug)}?includeCompensation=true`);
    return arr(data.jobs)
      .filter((j) => j.isListed !== false)
      .map((j) => {
        const comp = arr(j.compensation?.summaryComponents).find((x) => x.compensationType === 'Salary');
        return {
          sourceId: j.id,
          title: j.title,
          company: c.name,
          location: [j.location, ...arr(j.secondaryLocations).map((l) => l.location)].filter(Boolean).join(', '),
          description: j.descriptionHtml || j.descriptionPlain,
          url: j.jobUrl,
          applyUrl: j.applyUrl || j.jobUrl,
          postedAt: j.publishedAt,
          remote: j.isRemote,
          workMode: j.workplaceType,
          jobType: j.employmentType,
          salaryMin: comp?.minValue,
          salaryMax: comp?.maxValue,
          salaryCurrency: comp?.currencyCode,
          salaryPeriod: comp?.interval?.toLowerCase().includes('hour') ? 'hour' : comp ? 'year' : undefined,
          tags: [j.department, j.team].filter(Boolean),
          ats: 'ashby',
        };
      });
  },
};

export const recruitee = {
  id: 'recruitee',
  name: 'Recruitee',
  website: 'https://recruitee.com',
  docs: 'https://docs.recruitee.com/reference/offers',
  async fetchCompany(c) {
    const data = await request(`https://${encodeURIComponent(c.slug)}.recruitee.com/api/offers/`);
    return arr(data.offers).map((j) => ({
      sourceId: `${c.slug}-${j.id}`,
      title: j.title,
      company: j.company_name || c.name,
      location: j.location || [j.city, j.country].filter(Boolean).join(', '),
      country: j.country_code,
      description: `${j.description || ''}\n\n${j.requirements || ''}`,
      url: j.careers_url,
      applyUrl: j.careers_apply_url || j.careers_url,
      postedAt: j.published_at || j.created_at,
      remote: j.remote,
      jobType: j.employment_type_code,
      salaryMin: j.salary?.min,
      salaryMax: j.salary?.max,
      salaryCurrency: j.salary?.currency,
      tags: arr(j.tags),
      ats: 'recruitee',
    }));
  },
};

export const personio = {
  id: 'personio',
  name: 'Personio',
  website: 'https://www.personio.com',
  docs: 'https://developer.personio.de/docs/integration-of-xml-feed',
  async fetchCompany(c) {
    const base = c.slug.includes('.') ? c.slug : `${c.slug}.jobs.personio.de`;
    const body = await request(`https://${base}/xml?language=en`, { as: 'text' });
    const doc = xml.parse(body);
    return arr(doc?.['workzag-jobs']?.position).map((p) => ({
      sourceId: `${c.slug}-${p.id}`,
      title: p.name,
      company: p.subcompany || c.name,
      location: arr(p.office).join(', ') || p.office,
      description: arr(p.jobDescriptions?.jobDescription).map((d) => `${d.name}\n${d.value}`).join('\n\n'),
      url: `https://${base}/job/${p.id}`,
      applyUrl: `https://${base}/job/${p.id}#apply`,
      postedAt: p.createdAt,
      jobType: p.employmentType || p.schedule,
      tags: [p.department, p.recruitingCategory].filter(Boolean),
      ats: 'personio',
    }));
  },
};

export const teamtailor = {
  id: 'teamtailor',
  name: 'Teamtailor',
  website: 'https://www.teamtailor.com',
  docs: 'https://support.teamtailor.com/en/articles/112524-rss-feed',
  async fetchCompany(c) {
    const host = c.slug.includes('.') ? c.slug : `${c.slug}.teamtailor.com`;
    const body = await request(`https://${host}/jobs.rss`, { as: 'text' });
    const doc = xml.parse(body);
    return arr(doc?.rss?.channel?.item).map((it) => ({
      sourceId: `${c.slug}-${String(it.guid?.['#text'] || it.guid || it.link).split('/').pop()}`,
      title: it.title,
      company: c.name,
      location: arr(it['tt:locations']?.['tt:location']).map((l) => l['tt:city'] || l['tt:name']).filter(Boolean).join(', ') || it['tt:location'],
      description: it.description,
      url: it.link,
      applyUrl: it.link,
      postedAt: it.pubDate,
      remote: it.remoteStatus ? /fully|remote/i.test(it.remoteStatus) : undefined,
      tags: [it['tt:department']].filter(Boolean),
      ats: 'teamtailor',
    }));
  },
};

export const ATS_SOURCES = [greenhouse, lever, ashby, recruitee, personio, teamtailor];
