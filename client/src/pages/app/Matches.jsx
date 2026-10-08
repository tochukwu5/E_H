import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { toast } from 'sonner';
import clsx from 'clsx';
import { Star, X, PenLine, ExternalLink, Target, Sparkles, Undo2 } from 'lucide-react';
import { get, patch, post } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { Button, ScoreRing, Skeleton, Empty, PageHeader, Select, Badge } from '../../components/ui';
import { JobMeta, JobBadges } from '../../components/JobCard';

const TABS = [
  ['new', 'To review'],
  ['saved', 'Saved'],
  ['applied', 'Applied'],
  ['skipped', 'Skipped'],
  ['all', 'All'],
];

function MatchItem({ m, onStatus, onDraft, drafting }) {
  const j = m.job;
  return (
    <article className="panel p-5">
      <div className="flex gap-4">
        <ScoreRing score={m.score} size={56} stroke={5} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <Link to={`/jobs/${j.slug}`} className="text-[16px] font-semibold leading-snug hover:text-brand">{j.title}</Link>
              <div className="text-[14px] text-muted">{j.company} <span className="text-faint">via {j.sourceName}</span></div>
            </div>
            <div className="flex gap-1.5">
              {m.watchlisted && <Badge tone="warn">Watchlist</Badge>}
              {m.searchName && <Badge>{m.searchName}</Badge>}
            </div>
          </div>
          <div className="mt-2.5"><JobMeta job={j} /></div>
          <div className="mt-2.5"><JobBadges job={j} /></div>
          {(m.aiReason || m.reasons?.length > 0) && (
            <div className="mt-3 rounded-ctl bg-raised px-3.5 py-2.5 text-[14px]">
              {m.aiReason ? <span className="flex gap-2"><Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-brand" />{m.aiReason}</span> : m.reasons.join(' · ')}
              {m.gaps?.length > 0 && !m.aiReason && <span className="mt-1 block text-[13px] text-muted">Missing: {m.gaps.join(', ')}</span>}
            </div>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button href={j.applyUrl || j.url} size="sm" icon={ExternalLink} onClick={() => m.status !== 'applied' && setTimeout(() => toast('Did you apply?', { action: { label: 'Mark applied', onClick: () => onStatus('applied') } }), 1200)}>Open and apply</Button>
            <Button size="sm" variant="soft" icon={PenLine} loading={drafting} onClick={onDraft}>Draft application</Button>
            {m.status === 'saved' || m.status === 'skipped' ? (
              <Button size="sm" variant="ghost" icon={Undo2} onClick={() => onStatus('new')}>Move to review</Button>
            ) : (
              <Button size="sm" variant="secondary" icon={Star} onClick={() => onStatus('saved')}>Save</Button>
            )}
            {m.status !== 'skipped' && <Button size="sm" variant="ghost" icon={X} onClick={() => onStatus('skipped')}>Skip</Button>}
          </div>
        </div>
      </div>
    </article>
  );
}

export default function Matches() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const nav = useNavigate();
  const [status, setStatus] = useState('new');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('recent');
  const [minScore, setMinScore] = useState(0);
  const [page, setPage] = useState(1);
  const params = { status, search: search || undefined, sort, minScore, page };
  const { data, isLoading } = useQuery({ queryKey: ['matches', params], queryFn: () => get('/matches', params), placeholderData: keepPreviousData });

  const setMatch = useMutation({
    mutationFn: ({ id, s }) => patch(`/matches/${id}`, { status: s }),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['matches'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
      toast.success({ saved: 'Saved', skipped: 'Skipped', applied: 'Marked as applied', new: 'Moved to review' }[v.s]);
    },
    onError: (e) => toast.error(e.message),
  });
  const draft = useMutation({
    mutationFn: (jobId) => post('/applications/draft', { jobId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['matches'] });
      toast.success('Draft ready', { action: { label: 'Review', onClick: () => nav('/app/applications') } });
    },
    onError: (e) => toast.error(e.message, e.status === 402 ? { action: { label: 'See plans', onClick: () => nav('/app/settings/billing') } } : undefined),
  });

  return (
    <div>
      <PageHeader title="Matches">Jobs that cleared your match score. Newest first.</PageHeader>
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex gap-1 overflow-x-auto rounded-ctl border border-line bg-surface p-1" role="tablist">
          {TABS.map(([k, label]) => (
            <button key={k} role="tab" aria-selected={status === k} onClick={() => { setStatus(k); setPage(1); }} className={clsx('whitespace-nowrap rounded-[8px] px-3.5 py-1.5 text-[14px] font-semibold', status === k ? 'bg-brand-soft text-brand' : 'text-muted hover:text-ink')}>
              {label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="h-10 w-auto py-0 text-[14px]" aria-label="Filter by search">
            <option value="">All searches</option>
            {user.searches.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
          </Select>
          <Select value={minScore} onChange={(e) => { setMinScore(Number(e.target.value)); setPage(1); }} className="h-10 w-auto py-0 text-[14px]" aria-label="Minimum score">
            <option value={0}>Any score</option><option value={70}>70+</option><option value={80}>80+</option><option value={90}>90+</option>
          </Select>
          <Select value={sort} onChange={(e) => setSort(e.target.value)} className="h-10 w-auto py-0 text-[14px]" aria-label="Sort">
            <option value="recent">Newest</option><option value="score">Best match</option>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-[190px]" />)}</div>
      ) : data?.items?.length ? (
        <>
          <div className="space-y-3">
            {data.items.map((m) => (
              <MatchItem key={m._id} m={m} onStatus={(s) => setMatch.mutate({ id: m._id, s })} onDraft={() => draft.mutate(m.job._id)} drafting={draft.isPending && draft.variables === m.job._id} />
            ))}
          </div>
          {data.pages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-3">
              <Button variant="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
              <span className="tnum text-[14px] text-muted">Page {page} of {data.pages}</span>
              <Button variant="secondary" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>Next</Button>
            </div>
          )}
        </>
      ) : (
        <Empty icon={Target} title={status === 'new' ? 'You’re all caught up' : 'Nothing here yet'} action={<Button variant="secondary" to="/app/searches">Adjust your searches</Button>}>
          {status === 'new' ? 'New matches arrive as jobs are posted. Lower your match strictness or add job titles to see more.' : 'Matches you move here will show up in this list.'}
        </Empty>
      )}
    </div>
  );
}
