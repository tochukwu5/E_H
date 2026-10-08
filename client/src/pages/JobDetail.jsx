import { useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ExternalLink, ArrowLeft, PenLine, Briefcase, Layers, ShieldAlert } from 'lucide-react';
import { get, post } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Button, ScoreRing, Skeleton, Empty, Badge } from '../components/ui';
import JobCard, { CompanyMark, JobMeta, JobBadges } from '../components/JobCard';
import { JOB_TYPES, SENIORITY } from '../lib/format';

function JsonLd({ job }) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: job.title,
    description: job.description,
    datePosted: job.postedAt,
    hiringOrganization: { '@type': 'Organization', name: job.company },
    jobLocationType: job.remote ? 'TELECOMMUTE' : undefined,
    jobLocation: job.location && !job.remote ? { '@type': 'Place', address: job.location } : undefined,
    employmentType: { full_time: 'FULL_TIME', part_time: 'PART_TIME', contract: 'CONTRACTOR', internship: 'INTERN', freelance: 'CONTRACTOR' }[job.jobType],
    baseSalary: job.salaryMin ? { '@type': 'MonetaryAmount', currency: job.salaryCurrency, value: { '@type': 'QuantitativeValue', minValue: job.salaryMin, maxValue: job.salaryMax, unitText: (job.salaryPeriod || 'year').toUpperCase() } } : undefined,
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}

function YourMatch({ job }) {
  const { user } = useAuth();
  const nav = useNavigate();
  const { data } = useQuery({ queryKey: ['score', job._id], queryFn: () => get(`/matches/score/${job._id}`), enabled: Boolean(user?.searches?.length) });
  const draft = useMutation({
    mutationFn: () => post('/applications/draft', { jobId: job._id }),
    onSuccess: () => {
      toast.success('Draft ready. Review it in Applications.');
      nav('/app/applications');
    },
    onError: (e) => toast.error(e.message),
  });

  if (!user) {
    return (
      <div className="panel p-5">
        <div className="text-[15px] font-semibold">See how well you match</div>
        <p className="mt-1 text-[14px] text-muted">Create a free account to get a match score and alerts for jobs like this.</p>
        <Button to="/register" className="mt-4 w-full">Start free</Button>
      </div>
    );
  }
  return (
    <div className="panel p-5">
      {data?.score != null ? (
        <div className="flex items-center gap-4">
          <ScoreRing score={data.score} size={64} stroke={6} />
          <div>
            <div className="text-[15px] font-semibold">Your match</div>
            <div className="text-[13px] text-muted">{data.reasons[0] || 'Based on your best job search'}</div>
          </div>
        </div>
      ) : (
        <div className="text-[14px] text-muted">Add a job search to see your match score.</div>
      )}
      {data?.gaps?.length > 0 && <p className="mt-4 text-[13px]"><span className="font-semibold">Missing:</span> <span className="text-muted">{data.gaps.join(', ')}</span></p>}
      <Button variant="soft" className="mt-4 w-full" icon={PenLine} loading={draft.isPending} onClick={() => draft.mutate()}>Draft my application</Button>
    </div>
  );
}

export default function JobDetail() {
  const { slug } = useParams();
  const { data, isLoading, error } = useQuery({ queryKey: ['job', slug], queryFn: () => get(`/jobs/${slug}`) });
  const job = data?.job;

  useEffect(() => {
    if (job) document.title = `${job.title} at ${job.company} — EmployHunt`;
  }, [job]);

  if (isLoading) return <div className="page py-10"><Skeleton className="h-10 w-2/3" /><Skeleton className="mt-6 h-[420px]" /></div>;
  if (error) return <div className="page py-16"><Empty icon={Briefcase} title="This job is no longer listed" action={<Button to="/jobs">Browse current jobs</Button>}>It may have been filled or taken down by the employer.</Empty></div>;

  return (
    <div className="page py-8">
      <JsonLd job={job} />
      <Link to="/jobs" className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-muted hover:text-ink"><ArrowLeft className="h-4 w-4" />All jobs</Link>
      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_320px]">
        <article>
          <div className="flex items-start gap-4">
            <CompanyMark job={job} size={56} />
            <div>
              <h1 className="text-[30px] font-bold sm:text-[36px]">{job.title}</h1>
              <div className="mt-1 text-[16px] text-muted">{job.company}</div>
            </div>
          </div>
          <div className="mt-5 space-y-3"><JobMeta job={job} /><JobBadges job={job} /></div>
          {!job.active && <div className="mt-5 rounded-ctl bg-warn-soft px-4 py-3 text-[14px] text-warn">This listing hasn't been seen at the source for a while. It may be closed.</div>}
          {job.flags?.includes('thin_description') && <div className="mt-5 flex gap-2 rounded-ctl bg-raised px-4 py-3 text-[14px] text-muted"><ShieldAlert className="h-4 w-4 shrink-0" />The source only shared a short summary. Open the original posting for full details.</div>}
          <div className="prose-job mt-8 border-t border-line pt-8">{job.description || job.excerpt}</div>
          {job.skills?.length > 0 && (
            <div className="mt-8">
              <h2 className="font-sans text-[15px] font-semibold">Skills mentioned</h2>
              <div className="mt-3 flex flex-wrap gap-1.5">{job.skills.map((s) => <Badge key={s}>{s}</Badge>)}</div>
            </div>
          )}
        </article>
        <aside className="space-y-4 lg:sticky lg:top-24 lg:h-fit">
          <div className="panel p-5">
            <Button href={job.applyUrl || job.url} size="lg" className="w-full" icon={ExternalLink}>Apply on {job.ats ? job.company : job.sourceName}</Button>
            <dl className="mt-5 space-y-2.5 text-[14px]">
              <div className="flex justify-between gap-4"><dt className="text-muted">Type</dt><dd className="font-semibold">{JOB_TYPES[job.jobType] || 'Not stated'}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-muted">Level</dt><dd className="font-semibold">{SENIORITY[job.seniority] || 'Not stated'}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-muted">Work mode</dt><dd className="font-semibold capitalize">{job.workMode === 'unknown' ? 'Not stated' : job.workMode}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-muted">Source</dt><dd className="font-semibold"><a href={job.url} target="_blank" rel="noreferrer" className="hover:text-brand">{job.sourceName}</a></dd></div>
            </dl>
          </div>
          <YourMatch job={job} />
        </aside>
      </div>
      {data.similar?.length > 0 && (
        <section className="mt-16">
          <h2 className="flex items-center gap-2 text-[22px] font-bold"><Layers className="h-5 w-5 text-brand" />Similar jobs</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2">{data.similar.map((j) => <JobCard key={j._id} job={j} />)}</div>
        </section>
      )}
    </div>
  );
}
