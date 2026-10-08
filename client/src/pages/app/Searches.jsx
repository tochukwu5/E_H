import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, SlidersHorizontal } from 'lucide-react';
import { post, put, del } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { Button, Badge, Modal, Empty, PageHeader, Toggle } from '../../components/ui';
import SearchForm from '../../components/SearchForm';
import { JOB_TYPES, WORK_MODES } from '../../lib/format';

const LIMITS = { free: 1, basic: 3, pro: 5, premium: 20 };

export default function Searches() {
  const { user, setUser } = useAuth();
  const [editing, setEditing] = useState(null); // null | 'new' | search
  const limit = LIMITS[user.plan];
  const active = user.searches.filter((s) => s.active).length;

  const save = useMutation({
    mutationFn: (s) => (editing?._id ? put(`/me/searches/${editing._id}`, s) : post('/me/searches', s)),
    onSuccess: (d) => {
      setUser(d.user);
      setEditing(null);
      toast.success('Search saved. Matching recent jobs now.');
    },
    onError: (e) => toast.error(e.message),
  });
  const toggle = useMutation({
    mutationFn: (s) => put(`/me/searches/${s._id}`, { ...s, active: !s.active }),
    onSuccess: (d) => setUser(d.user),
    onError: (e) => toast.error(e.message),
  });
  const remove = useMutation({ mutationFn: (id) => del(`/me/searches/${id}`), onSuccess: (d) => { setUser(d.user); toast.success('Search deleted'); } });

  return (
    <div>
      <PageHeader title="Job searches" actions={<Button icon={Plus} onClick={() => setEditing('new')} disabled={active >= limit && user.searches.length >= limit}>Add search</Button>}>
        <span className="tnum">{active} of {limit}</span> active on the {user.plan} plan. Each search is matched separately.
      </PageHeader>

      {!user.searches.length ? (
        <Empty icon={SlidersHorizontal} title="No job searches yet" action={<Button onClick={() => setEditing('new')}>Add your first search</Button>}>Tell us what you're looking for and we'll start matching new jobs.</Empty>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {user.searches.map((s) => (
            <article key={s._id} className={`panel p-5 ${s.active ? '' : 'opacity-70'}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-sans text-[17px] font-semibold">{s.name}</h2>
                  <p className="mt-0.5 text-[14px] text-muted">{s.titles.join(', ')}</p>
                </div>
                <Toggle checked={s.active} onChange={() => toggle.mutate(s)} label="" />
              </div>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {s.workModes.map((w) => <Badge key={w} tone="brand">{WORK_MODES[w]}</Badge>)}
                {s.jobTypes.map((t) => <Badge key={t}>{JOB_TYPES[t]}</Badge>)}
                {s.eligibility === 'my_country' && <Badge tone="match">Open to my country</Badge>}
                <Badge>Min score {s.strictness}</Badge>
              </div>
              {s.keywords.length > 0 && <p className="mt-3 text-[13px] text-muted">Skills: {s.keywords.join(', ')}</p>}
              {s.excludeKeywords.length > 0 && <p className="mt-1 text-[13px] text-muted">Avoiding: {s.excludeKeywords.join(', ')}</p>}
              <div className="mt-4 flex gap-2 border-t border-line pt-4">
                <Button size="sm" variant="secondary" icon={Pencil} onClick={() => setEditing(s)}>Edit</Button>
                <Button size="sm" variant="ghost" icon={Trash2} onClick={() => confirm(`Delete "${s.name}"?`) && remove.mutate(s._id)}>Delete</Button>
              </div>
            </article>
          ))}
        </div>
      )}
      {active >= limit && <p className="mt-6 text-[14px] text-muted">Need more searches? <a href="/app/settings/billing" className="font-semibold text-brand hover:underline">Upgrade your plan</a> or pause one you use less.</p>}

      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title={editing?._id ? 'Edit search' : 'New job search'} wide>
        {editing && <SearchForm initial={editing === 'new' ? undefined : editing} onSubmit={(s) => save.mutate(s)} submitting={save.isPending} onCancel={() => setEditing(null)} />}
      </Modal>
    </div>
  );
}
