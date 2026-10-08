import { ATS_SOURCES } from './ats.js';
import { BOARD_SOURCES } from './boards.js';
import { AGGREGATOR_SOURCES } from './aggregators.js';
import { GOVERNMENT_SOURCES } from './government.js';
import { COMMUNITY_SOURCES } from './community.js';

const tag = (list, group) => list.map((s) => ({ ...s, group }));

/**
 * Only "green" sources: official public APIs/feeds, or official keyed APIs.
 * No LinkedIn, Indeed, Glassdoor, Upwork, SmartRecruiters or other blocked/grey sources.
 */
export const SOURCES = [
  ...tag(ATS_SOURCES, 'ats'),
  ...tag(BOARD_SOURCES, 'remote'),
  ...tag(AGGREGATOR_SOURCES, 'aggregator'),
  ...tag(GOVERNMENT_SOURCES, 'government'),
  ...tag(COMMUNITY_SOURCES, 'community'),
];

/** Green sources that are approved but not wired up yet, shown on the Sources page for transparency. */
export const PLANNED_SOURCES = [
  { id: 'jobbank', name: 'Job Bank Canada', group: 'government', website: 'https://www.jobbank.gc.ca', note: 'Publishes open data as periodic files, not a live API. Import planned.' },
];

export const GROUP_LABELS = {
  ats: 'Company career pages',
  remote: 'Remote job boards',
  aggregator: 'Job search engines',
  government: 'Government job services',
  community: 'Freelance and community',
};

export const isEnabled = (s) => (typeof s.enabled === 'function' ? s.enabled() : true);
export const getSource = (id) => SOURCES.find((s) => s.id === id);

export function publicSourceInfo(s) {
  return {
    id: s.id,
    name: s.name,
    group: s.group,
    groupLabel: GROUP_LABELS[s.group],
    website: s.website,
    enabled: s.group === 'ats' ? true : isEnabled(s),
    needsKey: s.needsKey || null,
    note: s.note || s.terms || null,
  };
}
