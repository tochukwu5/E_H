import { Link } from 'react-router-dom';
import { MapPin, Globe2, Clock, Banknote, AlertTriangle } from 'lucide-react';
import { Badge, ScoreRing } from './ui';
import { timeAgo, salary, JOB_TYPES } from '../lib/format';

export function CompanyMark({ job, size = 44 }) {
  const initial = (job.company || '?').trim()[0]?.toUpperCase();
  return job.companyLogo ? (
    <img src={job.companyLogo} alt="" loading="lazy" className="shrink-0 rounded-ctl border border-line bg-white object-contain p-1" style={{ width: size, height: size }} onError={(e) => (e.currentTarget.style.display = 'none')} />
  ) : (
    <span className="grid shrink-0 place-items-center rounded-ctl bg-raised font-display font-bold text-muted" style={{ width: size, height: size, fontSize: size * 0.4 }}>{initial}</span>
  );
}

export function JobMeta({ job }) {
  const pay = salary(job);
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-muted">
      <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{job.location || 'Not specified'}</span>
      {pay && <span className="inline-flex items-center gap-1.5"><Banknote className="h-3.5 w-3.5" />{pay}</span>}
      <span className="inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />{timeAgo(job.postedAt)}</span>
    </div>
  );
}

export function JobBadges({ job }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {job.remote && <Badge tone="brand">Remote</Badge>}
      {job.eligibility?.includes('worldwide') && <Badge tone="match" icon={Globe2}>Open worldwide</Badge>}
      {JOB_TYPES[job.jobType] && <Badge>{JOB_TYPES[job.jobType]}</Badge>}
      {job.flags?.includes('stale') && <Badge tone="warn" icon={AlertTriangle}>Older post</Badge>}
    </div>
  );
}

/** Public job list item. Pass `score` to show a match ring instead of the logo. */
export default function JobCard({ job, score, right }) {
  return (
    <article className="panel group relative flex gap-4 p-4 transition-colors hover:border-brand/40 sm:p-5">
      {typeof score === 'number' ? <ScoreRing score={score} size={48} /> : <CompanyMark job={job} />}
      <div className="min-w-0 flex-1">
        <h3 className="font-sans text-[16px] font-semibold leading-snug">
          <Link to={`/jobs/${job.slug}`} className="after:absolute after:inset-0 hover:text-brand">{job.title}</Link>
        </h3>
        <div className="mt-0.5 text-[14px] text-muted">{job.company} <span className="text-faint">via {job.sourceName || job.source}</span></div>
        <div className="mt-2.5"><JobMeta job={job} /></div>
        <div className="mt-3"><JobBadges job={job} /></div>
      </div>
      {right && <div className="relative z-10 flex shrink-0 items-start">{right}</div>}
    </article>
  );
}
