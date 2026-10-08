import { htmlToText, truncate, slugify, hash, normalizeKey, extractSkills } from '../utils/text.js';

/**
 * Every adapter returns "raw-ish" objects with these optional fields:
 * { sourceId, title, company, location, description(html|text), url, applyUrl, postedAt, remote,
 *   jobType, salaryMin, salaryMax, salaryCurrency, salaryPeriod, tags, category, companyLogo, ats, country }
 * normalizeJob() turns that into a full Job document payload with inferred fields.
 */

const REGION_WORDS = {
  worldwide: /\b(worldwide|anywhere|global(ly)?|work from anywhere|any location|all countries|international)\b/i,
  africa: /\b(africa|african|nigeria|kenya|ghana|south africa|egypt|lagos|nairobi|emea)\b/i,
  europe: /\b(europe|european|eu\b|emea|uk|united kingdom|germany|france|spain|netherlands|poland|portugal|ireland|sweden|norway|cet|cest)\b/i,
  uk: /\b(uk|united kingdom|england|london|scotland|wales|gb)\b/i,
  us: /\b(us|usa|u\.s\.|united states|america|north america|est|pst|cst|new york|san francisco|california|texas)\b/i,
  latam: /\b(latam|latin america|south america|brazil|mexico|argentina|colombia)\b/i,
  asia: /\b(asia|apac|india|singapore|philippines|japan|indonesia|vietnam)\b/i,
  canada: /\b(canada|toronto|vancouver|montreal)\b/i,
  oceania: /\b(australia|new zealand|sydney|melbourne|anz)\b/i,
};

const ONLY_WORDS = /\b(only|must (be|reside|live)|based in|located in|resident|citizens?|authori[sz]ed to work)\b/i;

export function inferEligibility(location = '', description = '', remote = false) {
  const loc = String(location || '');
  const out = new Set();
  for (const [region, re] of Object.entries(REGION_WORDS)) if (re.test(loc)) out.add(region);
  if (remote && (!loc || /^remote$/i.test(loc.trim()))) {
    // "Remote" with no region: look at the description for restrictions
    const text = String(description).slice(0, 4000);
    const restricted = ONLY_WORDS.test(text) && /(us|united states|uk|europe|eu|canada)/i.test(text);
    if (REGION_WORDS.worldwide.test(text) || !restricted) out.add('worldwide');
  }
  if (out.has('africa') && out.size === 1 && /emea/i.test(loc)) out.add('europe');
  return [...out];
}

export function inferRemote(location = '', title = '', explicit) {
  if (typeof explicit === 'boolean') return explicit;
  return /\b(remote|work from home|wfh|distributed|anywhere)\b/i.test(`${location} ${title}`);
}

export function inferWorkMode(location = '', title = '', remote, explicit) {
  const s = `${explicit || ''} ${location} ${title}`.toLowerCase();
  if (/hybrid/.test(s)) return 'hybrid';
  if (remote || /remote/.test(s)) return 'remote';
  if (/on-?site|in-?office|office/.test(s)) return 'onsite';
  return location ? 'onsite' : 'unknown';
}

export function inferJobType(raw = '', title = '', description = '') {
  const s = `${raw} ${title}`.toLowerCase();
  if (/intern(ship)?|trainee|graduate program/.test(s)) return 'internship';
  if (/freelance|gig|project[- ]based|per project/.test(s)) return 'freelance';
  if (/contract|contractor|temporary|temp\b|fixed[- ]term|c2c|1099/.test(s)) return 'contract';
  if (/part[- _]?time/.test(s)) return 'part_time';
  if (/full[- _]?time|permanent|fulltime|full_time/.test(s)) return 'full_time';
  if (/\b(contract|freelance)\b/i.test(String(description).slice(0, 600))) return 'contract';
  return 'unknown';
}

export function inferSeniority(title = '') {
  const t = title.toLowerCase();
  if (/\b(intern|internship|trainee)\b/.test(t)) return 'intern';
  if (/\b(principal|staff|lead|head|director|vp|chief|manager)\b/.test(t)) return 'lead';
  if (/\b(senior|sr\.?|iii|expert)\b/.test(t)) return 'senior';
  if (/\b(junior|jr\.?|entry|graduate|associate|i)\b/.test(t)) return 'junior';
  if (/\b(mid|intermediate|ii)\b/.test(t)) return 'mid';
  return 'unknown';
}

/** Pull "$80k - $100k", "€50,000–60,000", "40/hr" out of free text. */
export function parseSalary(text = '') {
  const s = String(text);
  const m = s.match(/([$€£₦])\s?(\d{1,3}(?:[,.]\d{3})*(?:\.\d+)?)\s?(k)?\s?(?:-|–|to)\s?[$€£₦]?\s?(\d{1,3}(?:[,.]\d{3})*(?:\.\d+)?)\s?(k)?/i);
  if (!m) return {};
  const cur = { $: 'USD', '€': 'EUR', '£': 'GBP', '₦': 'NGN' }[m[1]];
  const num = (v, k) => Number(String(v).replace(/[,]/g, '')) * (k ? 1000 : 1);
  const min = num(m[2], m[3]);
  const max = num(m[4], m[5] || m[3]);
  const period = /hour|hr\b|\/h/i.test(s.slice(m.index, m.index + 60)) ? 'hour' : min < 1000 ? 'hour' : 'year';
  return { salaryMin: min, salaryMax: max, salaryCurrency: cur, salaryPeriod: period };
}

const SCAM = /(registration fee|pay (a|the)? ?(fee|deposit)|processing fee|whatsapp me|text me on|telegram me|cash app|wire transfer|send (your )?(bank|ssn)|no experience.{0,20}\$\d{3,}\s?(per|a) (day|week)|earn \$\d+ (daily|per day)|crypto(currency)? investment)/i;

export function qualityFlags(job) {
  const flags = [];
  if (!job.company || /unknown|confidential/i.test(job.company)) flags.push('no_company');
  if ((job.description || '').length < 250) flags.push('thin_description');
  if (SCAM.test(`${job.title} ${job.description}`)) flags.push('possible_scam');
  if (job.postedAt && Date.now() - new Date(job.postedAt).getTime() > 1000 * 60 * 60 * 24 * 45) flags.push('stale');
  return flags;
}

export function normalizeJob(raw, source) {
  const description = htmlToText(raw.description || '');
  const title = htmlToText(raw.title || '').slice(0, 200) || 'Untitled role';
  const company = (htmlToText(raw.company || '') || 'Unknown company').slice(0, 120);
  const location = htmlToText(raw.location || '').slice(0, 160);
  const remote = inferRemote(location, title, raw.remote);
  const salary = raw.salaryMin || raw.salaryMax ? {} : parseSalary(`${raw.salaryText || ''} ${description.slice(0, 3000)}`);
  const postedAt = raw.postedAt ? new Date(raw.postedAt) : new Date();
  const sourceId = String(raw.sourceId ?? hash(raw.url || `${title}${company}`));

  const job = {
    source: source.id,
    sourceName: source.name,
    externalKey: `${source.id}:${sourceId}`,
    dedupeKey: hash(`${normalizeKey(title)}|${normalizeKey(company)}`),
    slug: `${slugify(`${title} at ${company}`)}-${hash(`${source.id}:${sourceId}`).slice(0, 8)}`,
    title,
    company,
    companyKey: normalizeKey(company),
    companyLogo: raw.companyLogo,
    location: location || (remote ? 'Remote' : ''),
    country: raw.country,
    remote,
    workMode: inferWorkMode(location, title, remote, raw.workMode),
    jobType: raw.jobType && ['full_time', 'part_time', 'contract', 'freelance', 'internship'].includes(raw.jobType) ? raw.jobType : inferJobType(raw.jobType, title, description),
    seniority: inferSeniority(title),
    salaryMin: raw.salaryMin ? Number(raw.salaryMin) : salary.salaryMin,
    salaryMax: raw.salaryMax ? Number(raw.salaryMax) : salary.salaryMax,
    salaryCurrency: raw.salaryCurrency || salary.salaryCurrency,
    salaryPeriod: raw.salaryPeriod || salary.salaryPeriod || 'unknown',
    category: raw.category,
    tags: (raw.tags || []).map((t) => String(t).toLowerCase()).slice(0, 15),
    description: description.slice(0, 20000),
    excerpt: truncate(description.replace(/\s+/g, ' '), 260),
    url: raw.url,
    applyUrl: raw.applyUrl || raw.url,
    ats: raw.ats,
    postedAt: isNaN(postedAt) ? new Date() : postedAt,
    lastSeenAt: new Date(),
    active: true,
  };
  job.eligibility = raw.eligibility?.length ? raw.eligibility : inferEligibility(location, description, remote);
  job.skills = extractSkills(`${title} ${job.tags.join(' ')} ${description.slice(0, 6000)}`);
  job.flags = qualityFlags(job);
  job.quality = Math.max(0, 80 - job.flags.length * 25 + (job.salaryMin ? 10 : 0) + (job.skills.length > 3 ? 10 : 0));
  return job;
}
