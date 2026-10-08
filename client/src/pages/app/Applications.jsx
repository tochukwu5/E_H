import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Copy, ExternalLink, RefreshCw, Trash2, Send, Download, CalendarClock } from 'lucide-react';
import { get, patch, post, del } from '../../lib/api';
import { Button, Badge, Modal, Field, Input, Textarea, Select, Skeleton, Empty, PageHeader } from '../../components/ui';
import { APP_STATUS, timeAgo } from '../../lib/format';

const COLUMNS = [
  ['To submit', ['draft', 'ready']],
  ['Applied', ['applied']],
  ['Interviewing', ['interview']],
  ['Offers', ['offer']],
  ['Closed', ['rejected', 'withdrawn']],
];

function AppCard({ a, onOpen }) {
  const st = APP_STATUS[a.status];
  return (
    <button onClick={onOpen} className="w-full rounded-ctl border border-line bg-surface p-3.5 text-left transition-colors hover:border-brand/50">
      <div className="text-[14px] font-semibold leading-snug">{a.title}</div>
      <div className="mt-0.5 text-[13px] text-muted">{a.company}</div>
      <div className="mt-2.5 flex items-center justify-between gap-2">
        <Badge tone={st.tone}>{st.label}</Badge>
        <span className="text-[12px] text-faint">{timeAgo(a.appliedAt || a.updatedAt)}</span>
      </div>
    </button>
  );
}

function Detail({ app, onClose }) {
  const qc = useQueryClient();
  const [cover, setCover] = useState(app.coverLetter || '');
  const [notes, setNotes] = useState(app.notes || '');
  const [answers, setAnswers] = useState(app.answers || []);
  useEffect(() => {
    setCover(app.coverLetter || '');
    setNotes(app.notes || '');
    setAnswers(app.answers || []);
  }, [app]);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['applications'] });
    qc.invalidateQueries({ queryKey: ['stats'] });
  };
  const save = useMutation({ mutationFn: (body) => patch(`/applications/${app._id}`, body), onSuccess: () => { refresh(); toast.success('Saved'); }, onError: (e) => toast.error(e.message) });
  const regen = useMutation({ mutationFn: () => post('/applications/draft', { jobId: app.job._id, regenerate: true }), onSuccess: (d) => { setCover(d.application.coverLetter); refresh(); toast.success('New version written'); }, onError: (e) => toast.error(e.message) });
  const remove = useMutation({ mutationFn: () => del(`/applications/${app._id}`), onSuccess: () => { refresh(); onClose(); toast.success('Removed from tracker'); } });
  const applyUrl = app.job?.applyUrl || app.url;

  return (
    <div className="space-y-6">
      <div>
        <div className="text-[18px] font-semibold">{app.title}</div>
        <div className="text-[14px] text-muted">{app.company}{app.job?.slug && <> · <Link to={`/jobs/${app.job.slug}`} className="text-brand hover:underline">View job</Link></>}</div>
      </div>

      {['draft', 'ready'].includes(app.status) && (
        <div className="rounded-panel border border-brand/30 bg-brand-soft/60 p-4">
          <div className="text-[14px] font-semibold">Ready to submit</div>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-[14px] text-muted">
            <li>Copy the cover letter below and check it reads like you.</li>
            <li>Open the application page and paste it in.</li>
            <li>Come back and mark it applied, so we can remind you to follow up.</li>
          </ol>
          <div className="mt-3 flex flex-wrap gap-2">
            {applyUrl && <Button href={applyUrl} size="sm" icon={ExternalLink} onClick={() => navigator.clipboard?.writeText(cover).then(() => toast.success('Cover letter copied'))}>Copy letter and open</Button>}
            <Button size="sm" variant="secondary" icon={Send} loading={save.isPending} onClick={() => save.mutate({ status: 'applied', coverLetter: cover })}>Mark applied</Button>
          </div>
        </div>
      )}

      <Field label="Status">
        <Select value={app.status} onChange={(e) => save.mutate({ status: e.target.value })}>
          {Object.entries(APP_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </Select>
      </Field>

      {app.job && (
        <Field label="Cover letter">
          <Textarea value={cover} onChange={(e) => setCover(e.target.value)} rows={12} />
          <div className="mt-2 flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" icon={Copy} onClick={() => navigator.clipboard?.writeText(cover).then(() => toast.success('Copied'))}>Copy</Button>
            <Button size="sm" variant="ghost" icon={RefreshCw} loading={regen.isPending} onClick={() => regen.mutate()}>Write a new version</Button>
          </div>
        </Field>
      )}

      {answers.length > 0 && (
        <div>
          <div className="label">Screening answers</div>
          <div className="space-y-2">
            {answers.map((qa, i) => (
              <div key={qa.question} className="grid gap-1.5 sm:grid-cols-[1fr_1fr] sm:items-center">
                <span className="text-[13px] text-muted">{qa.question}</span>
                <Input value={qa.answer} onChange={(e) => setAnswers(answers.map((x, j) => (j === i ? { ...x, answer: e.target.value } : x)))} className="py-2 text-[14px]" />
              </div>
            ))}
          </div>
        </div>
      )}

      <Field label="Notes" hint="Interview dates, recruiter names, anything to remember.">
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} />
      </Field>

      {app.followUpAt && app.status === 'applied' && (
        <p className="flex items-center gap-2 text-[14px] text-muted"><CalendarClock className="h-4 w-4" />Follow-up reminder {new Date(app.followUpAt) > new Date() ? `on ${new Date(app.followUpAt).toLocaleDateString()}` : 'sent'}</p>
      )}

      <div className="flex flex-wrap justify-between gap-2 border-t border-line pt-5">
        <Button loading={save.isPending} onClick={() => save.mutate({ coverLetter: cover || undefined, notes, answers })}>Save changes</Button>
        <Button variant="ghost" icon={Trash2} className="text-danger" onClick={() => confirm('Remove this application from your tracker?') && remove.mutate()}>Remove</Button>
      </div>
    </div>
  );
}

function AddManual({ onClose }) {
  const qc = useQueryClient();
  const [f, setF] = useState({ title: '', company: '', url: '', status: 'applied', notes: '' });
  const add = useMutation({
    mutationFn: () => post('/applications/manual', f),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['applications'] }); toast.success('Added to your tracker'); onClose(); },
    onError: (e) => toast.error(e.message),
  });
  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); add.mutate(); }}>
      <Field label="Job title"><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} required /></Field>
      <Field label="Company"><Input value={f.company} onChange={(e) => setF({ ...f, company: e.target.value })} required /></Field>
      <Field label="Job link"><Input type="url" value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} placeholder="https://" /></Field>
      <Field label="Status"><Select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>{Object.entries(APP_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</Select></Field>
      <Field label="Notes"><Textarea value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} rows={3} /></Field>
      <Button type="submit" loading={add.isPending} className="w-full">Add application</Button>
    </form>
  );
}

function exportCsv(items) {
  const rows = [['Title', 'Company', 'Status', 'Applied', 'Link', 'Notes'], ...items.map((a) => [a.title, a.company, APP_STATUS[a.status].label, a.appliedAt ? new Date(a.appliedAt).toLocaleDateString() : '', a.job?.applyUrl || a.url || '', (a.notes || '').replace(/\n/g, ' ')])];
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'employhunt-applications.csv';
  link.click();
  URL.revokeObjectURL(url);
}

export default function Applications() {
  const { data, isLoading } = useQuery({ queryKey: ['applications'], queryFn: () => get('/applications') });
  const [openId, setOpenId] = useState(null);
  const [adding, setAdding] = useState(false);
  const items = data?.items || [];
  const open = items.find((a) => a._id === openId);

  return (
    <div>
      <PageHeader
        title="Applications"
        actions={
          <>
            {items.length > 0 && <Button variant="secondary" icon={Download} onClick={() => exportCsv(items)}>Export CSV</Button>}
            <Button icon={Plus} onClick={() => setAdding(true)}>Add application</Button>
          </>
        }
      >
        Drafts the AI prepared, and everything you've applied to.
      </PageHeader>

      {isLoading ? (
        <div className="grid gap-4 lg:grid-cols-5">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-60" />)}</div>
      ) : !items.length ? (
        <Empty icon={Send} title="No applications yet" action={<Button to="/app/matches">Go to matches</Button>}>
          Tap "Draft application" on any match and the AI writes a tailored cover letter. You can also add applications you made elsewhere.
        </Empty>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {COLUMNS.map(([label, statuses]) => {
            const col = items.filter((a) => statuses.includes(a.status));
            return (
              <section key={label} className="rounded-panel bg-raised/70 p-3">
                <h2 className="flex items-center justify-between px-1 pb-3 font-sans text-[14px] font-semibold">{label}<span className="tnum text-faint">{col.length}</span></h2>
                <div className="space-y-2">
                  {col.map((a) => <AppCard key={a._id} a={a} onOpen={() => setOpenId(a._id)} />)}
                  {!col.length && <p className="px-1 py-4 text-[13px] text-faint">None</p>}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <Modal open={Boolean(open)} onClose={() => setOpenId(null)} title="Application" side>{open && <Detail app={open} onClose={() => setOpenId(null)} />}</Modal>
      <Modal open={adding} onClose={() => setAdding(false)} title="Track an application">{adding && <AddManual onClose={() => setAdding(false)} />}</Modal>
    </div>
  );
}
