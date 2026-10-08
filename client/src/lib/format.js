export function timeAgo(date) {
  if (!date) return '';
  const s = Math.max(1, Math.round((Date.now() - new Date(date).getTime()) / 1000));
  if (s < 60) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d} day${d > 1 ? 's' : ''} ago`;
  return new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

const SYM = { USD: '$', EUR: '€', GBP: '£', NGN: '₦', CAD: 'CA$', AUD: 'A$', ZAR: 'R', INR: '₹' };
const short = (n) => (n >= 1000 ? `${Math.round(n / 100) / 10}k`.replace('.0k', 'k') : String(Math.round(n)));

export function salary(job) {
  if (!job?.salaryMin && !job?.salaryMax) return null;
  const c = SYM[job.salaryCurrency] ?? (job.salaryCurrency ? `${job.salaryCurrency} ` : '');
  const per = { year: '/yr', month: '/mo', hour: '/hr', project: ' per project' }[job.salaryPeriod] || '';
  const range = job.salaryMax && job.salaryMax !== job.salaryMin ? `${c}${short(job.salaryMin || job.salaryMax)}–${c}${short(job.salaryMax)}` : `${c}${short(job.salaryMin || job.salaryMax)}`;
  return `${range}${per}`;
}

export const JOB_TYPES = { full_time: 'Full-time', part_time: 'Part-time', contract: 'Contract', freelance: 'Freelance', internship: 'Internship' };
export const WORK_MODES = { remote: 'Remote', hybrid: 'Hybrid', onsite: 'On-site' };
export const SENIORITY = { intern: 'Intern', junior: 'Junior', mid: 'Mid-level', senior: 'Senior', lead: 'Lead / Manager' };
export const APP_STATUS = {
  draft: { label: 'Draft', tone: 'neutral' },
  ready: { label: 'Ready to submit', tone: 'brand' },
  applied: { label: 'Applied', tone: 'brand' },
  interview: { label: 'Interview', tone: 'warn' },
  offer: { label: 'Offer', tone: 'match' },
  rejected: { label: 'Rejected', tone: 'danger' },
  withdrawn: { label: 'Withdrawn', tone: 'neutral' },
};

export const COUNTRIES = [
  ['NG', 'Nigeria'], ['GH', 'Ghana'], ['KE', 'Kenya'], ['ZA', 'South Africa'], ['EG', 'Egypt'], ['RW', 'Rwanda'], ['UG', 'Uganda'], ['TZ', 'Tanzania'], ['ET', 'Ethiopia'], ['MA', 'Morocco'], ['CM', 'Cameroon'], ['SN', 'Senegal'],
  ['US', 'United States'], ['CA', 'Canada'], ['GB', 'United Kingdom'], ['IE', 'Ireland'], ['DE', 'Germany'], ['FR', 'France'], ['NL', 'Netherlands'], ['ES', 'Spain'], ['PT', 'Portugal'], ['IT', 'Italy'], ['PL', 'Poland'], ['SE', 'Sweden'], ['NO', 'Norway'],
  ['IN', 'India'], ['PK', 'Pakistan'], ['PH', 'Philippines'], ['ID', 'Indonesia'], ['AE', 'United Arab Emirates'], ['SG', 'Singapore'], ['BR', 'Brazil'], ['MX', 'Mexico'], ['AR', 'Argentina'], ['AU', 'Australia'], ['NZ', 'New Zealand'],
];
export const countryName = (code) => COUNTRIES.find((c) => c[0] === code)?.[1] || code;

/** Ready-made searches users can start from and edit. */
export const PRESETS = [
  { name: 'Remote React developer', titles: ['React developer', 'Frontend developer', 'Frontend engineer'], keywords: ['react', 'javascript'], workModes: ['remote'], jobTypes: ['full_time', 'contract'], eligibility: 'my_country' },
  { name: 'MERN / full-stack', titles: ['Full stack developer', 'Full stack engineer', 'Node.js developer'], keywords: ['node', 'react', 'mongodb'], workModes: ['remote'], eligibility: 'my_country' },
  { name: 'Freelance web projects', titles: ['Web developer', 'WordPress developer', 'Website'], keywords: [], jobTypes: ['freelance', 'contract'], workModes: ['remote'] },
  { name: 'Product designer', titles: ['Product designer', 'UI/UX designer', 'UX designer'], keywords: ['figma'], workModes: ['remote', 'hybrid'] },
  { name: 'Customer support (remote)', titles: ['Customer support', 'Customer success', 'Support specialist'], keywords: [], workModes: ['remote'], eligibility: 'my_country' },
  { name: 'Data analyst', titles: ['Data analyst', 'Business analyst', 'BI analyst'], keywords: ['sql'], workModes: ['remote', 'hybrid'] },
  { name: 'Fresh graduate / entry level', titles: ['Graduate', 'Junior', 'Entry level', 'Intern'], seniority: ['intern', 'junior'], jobTypes: ['full_time', 'internship'] },
  { name: 'Digital marketing', titles: ['Digital marketing', 'Growth marketer', 'Social media manager', 'SEO specialist'], keywords: [], workModes: ['remote'] },
];
