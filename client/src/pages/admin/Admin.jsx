import { useState } from 'react';
import { NavLink, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import clsx from 'clsx';
import { RefreshCw, Plus, Trash2, Play } from 'lucide-react';
import { get, post, patch, del } from '../../lib/api';
import { Button, Badge, Input, Select, Textarea, Field, Skeleton, PageHeader, Modal, Toggle } from '../../components/ui';
import { timeAgo } from '../../lib/format';

const TABS = [['', 'Overview'], ['sources', 'Sources'], ['companies', 'Companies'], ['users', 'Users']];

function Overview() {
  const { data, isLoading } = useQuery({ queryKey: ['admin-overview'], queryFn: () => get('/admin/overview'), refetchInterval: 30_000 });
  if (isLoading) return <Skeleton className="h-48" />;
  if (!data) return <p className="text-[15px] text-muted">Couldn't load the overview. Check that the server is running.</p>;
  const cells = [
    ['Users', data.users], ['New today', data.usersToday], ['Monthly revenue', `$${data.mrr}`], ['Active jobs', data.jobs],
    ['Jobs found today', data.jobsToday], ['Matches today', data.matchesToday], ['Applications', data.apps], ['Company boards', data.companies],
  ];
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-panel border border-line bg-line lg:grid-cols-4">
        {cells.map(([k, v]) => (
          <div key={k} className="bg-surface px-5 py-4"><div className="text-[13px] text-muted">{k}</div><div className="tnum mt-1 font-display text-[26px] font-bold">{typeof v === 'number' ? v.toLocaleString() : v}</div></div>
        ))}
      </div>
      <div className="panel p-5">
        <h2 className="font-sans text-[16px] font-semibold">Users by plan</h2>
        <div className="mt-3 flex flex-wrap gap-2">{['free', 'basic', 'pro', 'premium'].map((p) => <Badge key={p} tone={p === 'free' ? 'neutral' : 'brand'} className="capitalize">{p}: {data.plans[p] || 0}</Badge>)}</div>
      </div>
    </div>
  );
}

function Sources() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['admin-sources'], queryFn: () => get('/admin/sources'), refetchInterval: 15_000 });
  const run = useMutation({ mutationFn: (source) => post('/admin/fetch', { source }), onSuccess: () => { toast.success('Fetch started'); setTimeout(() => qc.invalidateQueries({ queryKey: ['admin-sources'] }), 4000); }, onError: (e) => toast.error(e.message) });
  if (isLoading) return <Skeleton className="h-96" />;
  if (!data) return <p className="text-[15px] text-muted">Couldn't load sources. Check that the server is running.</p>;
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-[14px] text-muted">{data.fetching ? 'A fetch is running now…' : 'Health over the last 24 hours.'}</p>
        <Button icon={RefreshCw} loading={run.isPending} disabled={data.fetching} onClick={() => run.mutate(undefined)}>Fetch all now</Button>
      </div>
      <div className="overflow-x-auto rounded-panel border border-line bg-surface">
        <table className="w-full min-w-[760px] text-[14px]">
          <thead><tr className="border-b border-line text-left text-[13px] text-muted">{['Source', 'Status', 'Runs OK', 'New jobs', 'Active jobs', 'Last run', ''].map((h) => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}</tr></thead>
          <tbody>
            {data.sources.map((s) => (
              <tr key={s.id} className="border-b border-line/70 last:border-0">
                <td className="px-4 py-3"><div className="font-semibold">{s.name}</div><div className="text-[12px] text-faint">{s.groupLabel}</div></td>
                <td className="px-4 py-3">
                  {!s.enabled ? <Badge title={s.needsKey}>Needs {s.needsKey}</Badge> : !s.health ? <Badge>No runs yet</Badge> : s.health.lastOk ? <Badge tone="match">Healthy</Badge> : <Badge tone="danger" >Failing</Badge>}
                  {s.health?.lastError && !s.health.lastOk && <div className="mt-1 max-w-[240px] truncate text-[12px] text-danger" title={s.health.lastError}>{s.health.lastError}</div>}
                </td>
                <td className="tnum px-4 py-3">{s.health ? `${s.health.ok}/${s.health.runs}` : '—'}</td>
                <td className="tnum px-4 py-3">{s.health?.inserted ?? '—'}</td>
                <td className="tnum px-4 py-3">{s.activeJobs}</td>
                <td className="px-4 py-3 text-muted">{s.health?.lastAt ? timeAgo(s.health.lastAt) : '—'}</td>
                <td className="px-4 py-3 text-right"><Button size="sm" variant="ghost" icon={Play} disabled={!s.enabled || data.fetching} onClick={() => run.mutate(s.id)}>Run</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Companies() {
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [ats, setAts] = useState('');
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState(false);
  const [bulk, setBulk] = useState('');
  const [one, setOne] = useState({ name: '', ats: 'greenhouse', slug: '' });
  const { data, isLoading } = useQuery({ queryKey: ['admin-companies', q, ats, page], queryFn: () => get('/admin/companies', { q, ats, page }) });
  const refresh = () => qc.invalidateQueries({ queryKey: ['admin-companies'] });
  const addOne = useMutation({ mutationFn: () => post('/admin/companies', one), onSuccess: () => { refresh(); toast.success('Company added'); setOne({ name: '', ats: one.ats, slug: '' }); }, onError: (e) => toast.error(e.message) });
  const addBulk = useMutation({ mutationFn: () => post('/admin/companies/bulk', { text: bulk }), onSuccess: (d) => { refresh(); toast.success(`${d.added} added (${d.parsed} lines read)`); setBulk(''); setAdding(false); }, onError: (e) => toast.error(e.message) });
  const toggle = useMutation({ mutationFn: (c) => patch(`/admin/companies/${c._id}`, { active: !c.active }), onSuccess: refresh });
  const remove = useMutation({ mutationFn: (id) => del(`/admin/companies/${id}`), onSuccess: refresh });

  return (
    <div className="space-y-5">
      <div className="panel p-5">
        <h2 className="font-sans text-[16px] font-semibold">Add a company board</h2>
        <p className="mt-1 text-[14px] text-muted">The slug is the company's name in its board URL, like <b>stripe</b> in boards.greenhouse.io/stripe.</p>
        <form className="mt-4 grid gap-3 sm:grid-cols-[1fr_160px_1fr_auto]" onSubmit={(e) => { e.preventDefault(); addOne.mutate(); }}>
          <Input placeholder="Company name" value={one.name} onChange={(e) => setOne({ ...one, name: e.target.value })} required />
          <Select value={one.ats} onChange={(e) => setOne({ ...one, ats: e.target.value })}>{['greenhouse', 'lever', 'ashby', 'recruitee', 'personio', 'teamtailor'].map((a) => <option key={a}>{a}</option>)}</Select>
          <Input placeholder="Board slug" value={one.slug} onChange={(e) => setOne({ ...one, slug: e.target.value })} required />
          <Button type="submit" icon={Plus} loading={addOne.isPending}>Add</Button>
        </form>
        <button className="mt-3 text-[14px] font-semibold text-brand hover:underline" onClick={() => setAdding(true)}>Bulk add from a list of board URLs</button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Input placeholder="Search companies" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} className="max-w-xs" />
        <Select value={ats} onChange={(e) => { setAts(e.target.value); setPage(1); }} className="w-auto"><option value="">All platforms</option>{['greenhouse', 'lever', 'ashby', 'recruitee', 'personio', 'teamtailor'].map((a) => <option key={a}>{a}</option>)}</Select>
      </div>
      {isLoading ? <Skeleton className="h-80" /> : !data ? <p className="text-[15px] text-muted">Couldn't load this list. Check that the server is running.</p> : (
        <div className="overflow-x-auto rounded-panel border border-line bg-surface">
          <table className="w-full min-w-[700px] text-[14px]">
            <thead><tr className="border-b border-line text-left text-[13px] text-muted">{['Company', 'Platform', 'Jobs', 'Last checked', 'Active', ''].map((h) => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}</tr></thead>
            <tbody>
              {data.items.map((c) => (
                <tr key={c._id} className="border-b border-line/70 last:border-0">
                  <td className="px-4 py-3"><div className="font-semibold">{c.name}</div><div className="text-[12px] text-faint">{c.slug}</div>{c.lastError && <div className="max-w-[260px] truncate text-[12px] text-danger" title={c.lastError}>{c.lastError}</div>}</td>
                  <td className="px-4 py-3 capitalize">{c.ats}</td>
                  <td className="tnum px-4 py-3">{c.jobCount}</td>
                  <td className="px-4 py-3 text-muted">{c.lastFetchedAt ? timeAgo(c.lastFetchedAt) : 'Never'}</td>
                  <td className="px-4 py-3"><Toggle checked={c.active} onChange={() => toggle.mutate(c)} label="" /></td>
                  <td className="px-4 py-3 text-right"><Button size="sm" variant="ghost" icon={Trash2} onClick={() => confirm(`Remove ${c.name}?`) && remove.mutate(c._id)} aria-label={`Remove ${c.name}`} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data?.pages > 1 && <div className="flex justify-center gap-3"><Button variant="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button><Button variant="secondary" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>Next</Button></div>}

      <Modal open={adding} onClose={() => setAdding(false)} title="Bulk add companies" wide>
        <Field label="One per line" hint="Paste board URLs (boards.greenhouse.io/x, jobs.lever.co/x, jobs.ashbyhq.com/x, x.recruitee.com, x.jobs.personio.de, x.teamtailor.com) or lines like greenhouse:stripe:Stripe.">
          <Textarea rows={12} value={bulk} onChange={(e) => setBulk(e.target.value)} placeholder={'https://boards.greenhouse.io/stripe\nhttps://jobs.lever.co/plaid\nashby:openai:OpenAI'} />
        </Field>
        <Button className="mt-4" loading={addBulk.isPending} onClick={() => addBulk.mutate()}>Add companies</Button>
      </Modal>
    </div>
  );
}

function Users() {
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const { data, isLoading } = useQuery({ queryKey: ['admin-users', q], queryFn: () => get('/admin/users', { q }) });
  const update = useMutation({ mutationFn: ({ id, body }) => patch(`/admin/users/${id}`, body), onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); toast.success('User updated'); } });
  return (
    <div className="space-y-4">
      <Input placeholder="Search by name or email" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" />
      {isLoading ? <Skeleton className="h-80" /> : !data ? <p className="text-[15px] text-muted">Couldn't load this list. Check that the server is running.</p> : (
        <div className="overflow-x-auto rounded-panel border border-line bg-surface">
          <table className="w-full min-w-[760px] text-[14px]">
            <thead><tr className="border-b border-line text-left text-[13px] text-muted">{['User', 'Plan', 'Searches', 'Joined', 'Last sign-in', 'Role'].map((h) => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}</tr></thead>
            <tbody>
              {data.items.map((u) => (
                <tr key={u._id} className="border-b border-line/70 last:border-0">
                  <td className="px-4 py-3"><div className="font-semibold">{u.name}</div><div className="text-[12px] text-muted">{u.email}</div></td>
                  <td className="px-4 py-3"><Select value={u.plan} onChange={(e) => update.mutate({ id: u._id, body: { plan: e.target.value } })} className="h-9 w-[120px] py-0 text-[13px]">{['free', 'basic', 'pro', 'premium'].map((p) => <option key={p}>{p}</option>)}</Select></td>
                  <td className="tnum px-4 py-3">{u.searches?.length || 0}</td>
                  <td className="px-4 py-3 text-muted">{timeAgo(u.createdAt)}</td>
                  <td className="px-4 py-3 text-muted">{u.lastLoginAt ? timeAgo(u.lastLoginAt) : '—'}</td>
                  <td className="px-4 py-3"><Select value={u.role} onChange={(e) => update.mutate({ id: u._id, body: { role: e.target.value } })} className="h-9 w-[110px] py-0 text-[13px]"><option>user</option><option>admin</option></Select></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function Admin() {
  const { tab = '' } = useParams();
  const View = { '': Overview, sources: Sources, companies: Companies, users: Users }[tab] || Overview;
  return (
    <div>
      <PageHeader title="Admin">Sources, company boards and users.</PageHeader>
      <nav className="mb-6 flex gap-1 overflow-x-auto rounded-ctl border border-line bg-surface p-1">
        {TABS.map(([k, label]) => (
          <NavLink key={k} end to={`/admin${k ? `/${k}` : ''}`} className={({ isActive }) => clsx('whitespace-nowrap rounded-[8px] px-3.5 py-1.5 text-[14px] font-semibold', isActive ? 'bg-brand-soft text-brand' : 'text-muted hover:text-ink')}>{label}</NavLink>
        ))}
      </nav>
      <View />
    </div>
  );
}
