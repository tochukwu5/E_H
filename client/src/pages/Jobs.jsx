import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { Search, SlidersHorizontal, SearchX } from 'lucide-react';
import { get } from '../lib/api';
import JobCard from '../components/JobCard';
import { Button, Pills, Toggle, Skeleton, Empty, Select } from '../components/ui';
import { JOB_TYPES, SENIORITY } from '../lib/format';

const POSTED = { '': 'Any time', 24: 'Last 24 hours', 72: 'Last 3 days', 168: 'Last week' };

export default function Jobs() {
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get('q') || '');
  const [showFilters, setShowFilters] = useState(false);
  const p = Object.fromEntries(params);
  const page = Number(p.page || 1);

  useEffect(() => {
    document.title = 'Browse jobs — EmployHunt';
  }, []);

  const set = (patch) => {
    const next = { ...p, ...patch, page: patch.page ?? 1 };
    Object.keys(next).forEach((k) => (next[k] === '' || next[k] == null || next[k] === false || next[k] === 'false') && delete next[k]);
    setParams(next);
  };

  const { data, isLoading, isFetching } = useQuery({ queryKey: ['jobs', p], queryFn: () => get('/jobs', p), placeholderData: keepPreviousData });

  const filters = (
    <div className="space-y-6">
      <div>
        <div className="label">Posted</div>
        <Select value={p.posted || ''} onChange={(e) => set({ posted: e.target.value })}>{Object.entries(POSTED).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
      </div>
      <Toggle checked={p.remote === 'true'} onChange={(v) => set({ remote: v ? 'true' : '' })} label="Remote only" />
      <Toggle checked={p.worldwide === 'true'} onChange={(v) => set({ worldwide: v ? 'true' : '' })} label="Open worldwide" description="Remote jobs with no country limit" />
      <Toggle checked={p.salary === 'true'} onChange={(v) => set({ salary: v ? 'true' : '' })} label="Salary listed" />
      <div>
        <div className="label">Job type</div>
        <Pills options={JOB_TYPES} value={p.type ? p.type.split(',') : []} onChange={(v) => set({ type: v.join(',') })} />
      </div>
      <div>
        <div className="label">Level</div>
        <Pills options={SENIORITY} value={p.seniority ? p.seniority.split(',') : []} onChange={(v) => set({ seniority: v.join(',') })} />
      </div>
      {Object.keys(p).some((k) => k !== 'q' && k !== 'page') && <Button variant="ghost" size="sm" onClick={() => setParams(q ? { q } : {})}>Clear filters</Button>}
    </div>
  );

  return (
    <div className="page py-10">
      <h1 className="text-[34px] font-bold">Browse jobs</h1>
      <p className="mt-1 text-[15px] text-muted">Fresh listings from company career pages and trusted job boards. Create a free account to get matches sent to you.</p>

      <form className="mt-6 flex gap-2" onSubmit={(e) => { e.preventDefault(); set({ q }); }}>
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-faint" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Job title, skill or company" className="input h-12 pl-11" aria-label="Search jobs" />
        </div>
        <Button size="lg" type="submit">Search</Button>
        <Button size="lg" variant="secondary" type="button" className="lg:hidden" onClick={() => setShowFilters((s) => !s)} icon={SlidersHorizontal} aria-label="Filters" />
      </form>

      <div className="mt-8 grid gap-8 lg:grid-cols-[250px_1fr]">
        <aside className={`${showFilters ? 'block' : 'hidden'} panel h-fit p-5 lg:sticky lg:top-24 lg:block`}>{filters}</aside>
        <section aria-live="polite">
          <div className="mb-4 flex items-center justify-between text-[14px] text-muted">
            <span className="tnum">{data ? `${data.total.toLocaleString()} jobs` : 'Loading jobs'}</span>
            {isFetching && !isLoading && <span>Updating…</span>}
          </div>
          {isLoading ? (
            <div className="space-y-3">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-[132px]" />)}</div>
          ) : data?.items?.length ? (
            <>
              <div className="space-y-3">{data.items.map((j) => <JobCard key={j._id} job={j} />)}</div>
              {data.pages > 1 && (
                <div className="mt-8 flex items-center justify-center gap-3">
                  <Button variant="secondary" disabled={page <= 1} onClick={() => set({ page: page - 1 })}>Previous</Button>
                  <span className="tnum text-[14px] text-muted">Page {page} of {data.pages}</span>
                  <Button variant="secondary" disabled={page >= data.pages} onClick={() => set({ page: page + 1 })}>Next</Button>
                </div>
              )}
            </>
          ) : (
            <Empty icon={SearchX} title="No jobs match these filters" action={<Button variant="secondary" onClick={() => { setQ(''); setParams({}); }}>Clear search and filters</Button>}>
              Try a broader title or remove a filter. New jobs arrive every few minutes.
            </Empty>
          )}
        </section>
      </div>
    </div>
  );
}
