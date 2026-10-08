import he from 'he';
import crypto from 'crypto';

/** Turn HTML (possibly entity-escaped, as Greenhouse returns) into readable plain text. */
export function htmlToText(input = '') {
  if (!input) return '';
  let s = String(input);
  if (/&lt;\w/.test(s)) s = he.decode(s); // double-escaped HTML
  s = s
    .replace(/<\s*(script|style)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\s*\/\s*(p|div|h[1-6]|li|ul|ol|tr)\s*>/gi, '\n')
    .replace(/<\s*li[^>]*>/gi, '• ')
    .replace(/<[^>]+>/g, '');
  s = he.decode(s);
  return s.replace(/\r/g, '').replace(/[ \t]+/g, ' ').replace(/\n\s*\n\s*\n+/g, '\n\n').trim();
}

export const truncate = (s = '', n = 280) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

export function slugify(s = '') {
  return String(s)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export const hash = (s) => crypto.createHash('sha1').update(String(s)).digest('hex');

export const normalizeKey = (s = '') =>
  String(s).toLowerCase().replace(/\b(inc|llc|ltd|gmbh|corp|co|limited|plc)\b\.?/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

const STOP = new Set(
  'a an the and or of to in for on with at by from as is are be this that we you our your will can who what job role team work working experience years year plus strong ability skills skill required requirements responsibilities about using use new including etc must have has not all any more other such well within across'.split(' ')
);

export function tokenize(s = '') {
  return String(s)
    .toLowerCase()
    .replace(/c\+\+/g, 'cplusplus')
    .replace(/c#/g, 'csharp')
    .replace(/\.net/g, 'dotnet')
    .replace(/node\.js/g, 'nodejs')
    .replace(/next\.js/g, 'nextjs')
    .replace(/vue\.js/g, 'vuejs')
    .replace(/react\.js/g, 'react')
    .split(/[^a-z0-9+]+/)
    .filter((w) => w.length > 1 && !STOP.has(w));
}

/** Curated skill vocabulary used for resume parsing, matching and the ATS checker. */
export const SKILLS = [
  'javascript', 'typescript', 'react', 'nextjs', 'vuejs', 'angular', 'svelte', 'nodejs', 'express', 'nestjs', 'mongodb', 'postgresql', 'mysql', 'redis',
  'graphql', 'rest', 'python', 'django', 'flask', 'fastapi', 'java', 'spring', 'kotlin', 'swift', 'ios', 'android', 'flutter', 'dart', 'react native',
  'go', 'golang', 'rust', 'ruby', 'rails', 'php', 'laravel', 'csharp', 'dotnet', 'cplusplus', 'aws', 'gcp', 'azure', 'docker', 'kubernetes', 'terraform',
  'ci/cd', 'linux', 'git', 'html', 'css', 'tailwind', 'sass', 'figma', 'ui', 'ux', 'product design', 'sql', 'excel', 'tableau', 'power bi', 'pandas',
  'machine learning', 'deep learning', 'pytorch', 'tensorflow', 'llm', 'nlp', 'data science', 'analytics', 'seo', 'sem', 'content', 'copywriting',
  'social media', 'marketing', 'growth', 'sales', 'crm', 'hubspot', 'salesforce', 'customer support', 'zendesk', 'project management', 'agile', 'scrum',
  'jira', 'solidity', 'web3', 'blockchain', 'ethereum', 'smart contracts', 'fintech', 'payments', 'stripe', 'security', 'devops', 'sre', 'qa', 'testing',
  'cypress', 'jest', 'playwright', 'selenium', 'accounting', 'finance', 'recruiting', 'hr', 'operations', 'writing', 'video editing', 'photoshop',
];

export function extractSkills(text = '') {
  const lower = ` ${String(text).toLowerCase().replace(/node\.js/g, 'nodejs').replace(/next\.js/g, 'nextjs').replace(/c\+\+/g, 'cplusplus').replace(/c#/g, 'csharp').replace(/\.net/g, 'dotnet')} `;
  return SKILLS.filter((sk) => new RegExp(`[^a-z0-9]${sk.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}[^a-z0-9]`).test(lower));
}
