/** Official government job APIs. Free, documented and meant for re-use. */
import { request } from '../utils/http.js';
import { env } from '../config/env.js';

const arr = (v) => (Array.isArray(v) ? v : v == null ? [] : [v]);

export const usajobs = {
  id: 'usajobs',
  name: 'USAJobs',
  website: 'https://www.usajobs.gov',
  needsKey: 'USAJOBS_API_KEY',
  keywordBased: true,
  enabled: () => Boolean(env.keys.usajobs),
  async fetch({ keywords }) {
    const out = [];
    for (const kw of keywords.slice(0, 6)) {
      try {
        const data = await request(`https://data.usajobs.gov/api/search?Keyword=${encodeURIComponent(kw)}&ResultsPerPage=100&DatePosted=3`, {
          headers: { Host: 'data.usajobs.gov', 'User-Agent': env.contactEmail, 'Authorization-Key': env.keys.usajobs },
        });
        for (const item of arr(data.SearchResult?.SearchResultItems)) {
          const d = item.MatchedObjectDescriptor || {};
          const pay = arr(d.PositionRemuneration)[0] || {};
          out.push({
            sourceId: d.PositionID || item.MatchedObjectId,
            title: d.PositionTitle,
            company: d.OrganizationName || d.DepartmentName,
            location: d.PositionLocationDisplay,
            country: 'US',
            description: [d.QualificationSummary, d.UserArea?.Details?.JobSummary, arr(d.UserArea?.Details?.MajorDuties).join('\n')].filter(Boolean).join('\n\n'),
            url: d.PositionURI,
            applyUrl: arr(d.ApplyURI)[0] || d.PositionURI,
            postedAt: d.PublicationStartDate,
            jobType: arr(d.PositionSchedule).map((s) => s.Name).join(' '),
            salaryMin: Number(pay.MinimumRange) || undefined,
            salaryMax: Number(pay.MaximumRange) || undefined,
            salaryCurrency: 'USD',
            salaryPeriod: pay.RateIntervalCode === 'PH' ? 'hour' : 'year',
            eligibility: ['us'],
          });
        }
      } catch {
        /* keep going */
      }
    }
    return out;
  },
};

export const jobtech = {
  id: 'jobtech',
  name: 'JobTech (Sweden)',
  website: 'https://jobtechdev.se',
  keywordBased: true,
  async fetch({ keywords }) {
    const out = [];
    for (const kw of keywords.slice(0, 5)) {
      try {
        const data = await request(`https://jobsearch.api.jobtechdev.se/search?q=${encodeURIComponent(kw)}&limit=100&sort=pubdate-desc`);
        out.push(
          ...arr(data.hits).map((j) => ({
            sourceId: j.id,
            title: j.headline,
            company: j.employer?.name,
            location: [j.workplace_address?.municipality, j.workplace_address?.country].filter(Boolean).join(', '),
            country: 'SE',
            remote: /distans|remote/i.test(`${j.headline} ${j.description?.text?.slice(0, 500)}`) || undefined,
            description: j.description?.text_formatted || j.description?.text,
            url: j.webpage_url,
            applyUrl: j.application_details?.url || j.webpage_url,
            postedAt: j.publication_date,
            jobType: j.employment_type?.label,
            eligibility: ['europe'],
          }))
        );
      } catch {
        /* keep going */
      }
    }
    return out;
  },
};

export const bundesagentur = {
  id: 'bundesagentur',
  name: 'Bundesagentur für Arbeit (Germany)',
  website: 'https://www.arbeitsagentur.de',
  keywordBased: true,
  async fetch({ keywords }) {
    const out = [];
    for (const kw of keywords.slice(0, 5)) {
      try {
        const data = await request(`https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v4/jobs?was=${encodeURIComponent(kw)}&size=100&veroeffentlichtseit=3`, {
          headers: { 'X-API-Key': 'jobboerse-jobsuche' }, // public client id published by the agency
        });
        out.push(
          ...arr(data.stellenangebote).map((j) => ({
            sourceId: j.refnr,
            title: j.titel || j.beruf,
            company: j.arbeitgeber,
            location: [j.arbeitsort?.ort, j.arbeitsort?.land].filter(Boolean).join(', '),
            country: 'DE',
            description: `${j.beruf || ''} — ${j.titel || ''}. Full details on the Bundesagentur für Arbeit job page.`,
            url: j.externeUrl || `https://www.arbeitsagentur.de/jobsuche/jobdetail/${j.refnr}`,
            postedAt: j.aktuelleVeroeffentlichungsdatum || j.eintrittsdatum,
            eligibility: ['europe'],
          }))
        );
      } catch {
        /* keep going */
      }
    }
    return out;
  },
};

let ftToken = { value: null, exp: 0 };
async function franceToken() {
  if (ftToken.value && Date.now() < ftToken.exp) return ftToken.value;
  const body = new URLSearchParams({ grant_type: 'client_credentials', client_id: env.keys.franceId, client_secret: env.keys.franceSecret, scope: 'api_offresdemploiv2 o2dsoffre' });
  const data = await request('https://entreprise.francetravail.fr/connexion/oauth2/access_token?realm=%2Fpartenaire', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  ftToken = { value: data.access_token, exp: Date.now() + (data.expires_in - 60) * 1000 };
  return ftToken.value;
}

export const francetravail = {
  id: 'francetravail',
  name: 'France Travail',
  website: 'https://francetravail.io',
  needsKey: 'FRANCETRAVAIL_CLIENT_ID + FRANCETRAVAIL_CLIENT_SECRET',
  keywordBased: true,
  enabled: () => Boolean(env.keys.franceId && env.keys.franceSecret),
  async fetch({ keywords }) {
    const token = await franceToken();
    const out = [];
    for (const kw of keywords.slice(0, 5)) {
      try {
        const data = await request(`https://api.francetravail.io/partenaire/offresdemploi/v2/offres/search?motsCles=${encodeURIComponent(kw)}&range=0-149&publieeDepuis=3`, { headers: { Authorization: `Bearer ${token}` } });
        out.push(
          ...arr(data.resultats).map((j) => ({
            sourceId: j.id,
            title: j.intitule,
            company: j.entreprise?.nom,
            location: j.lieuTravail?.libelle,
            country: 'FR',
            description: j.description,
            url: j.origineOffre?.urlOrigine || `https://candidat.francetravail.fr/offres/recherche/detail/${j.id}`,
            postedAt: j.dateCreation,
            jobType: j.typeContratLibelle,
            salaryText: j.salaire?.libelle,
            eligibility: ['europe'],
          }))
        );
      } catch {
        /* keep going */
      }
    }
    return out;
  },
};

export const nav = {
  id: 'nav',
  name: 'NAV (Norway)',
  website: 'https://arbeidsplassen.nav.no',
  needsKey: 'NAV_FEED_TOKEN',
  enabled: () => Boolean(env.keys.navToken),
  async fetch() {
    const feed = await request('https://pam-stilling-feed.nav.no/api/v1/feed', { headers: { Authorization: `Bearer ${env.keys.navToken}` } });
    return arr(feed.items)
      .slice(0, 200)
      .filter((it) => it._feed_entry?.status === 'ACTIVE')
      .map((it) => ({
        sourceId: it.id,
        title: it.title,
        company: it._feed_entry?.businessName,
        location: [it._feed_entry?.municipal, 'Norway'].filter(Boolean).join(', '),
        country: 'NO',
        description: `${it.title}. Full details on arbeidsplassen.nav.no.`,
        url: `https://arbeidsplassen.nav.no/stillinger/stilling/${it.id}`,
        postedAt: it.date_modified,
        eligibility: ['europe'],
      }));
  },
};

export const GOVERNMENT_SOURCES = [usajobs, jobtech, bundesagentur, francetravail, nav];
