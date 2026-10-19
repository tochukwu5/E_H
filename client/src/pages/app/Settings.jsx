import { useState } from 'react';
import { NavLink, useParams, Navigate, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import clsx from 'clsx';
import { FileText, Send, MessageCircle, Mail, Check, Copy, Download, Lock } from 'lucide-react';
import { api, get, patch, post, del, API_BASE } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { Button, Field, Input, Textarea, Select, ChipInput, Pills, Toggle, PageHeader, Badge } from '../../components/ui';
import PlanGrid from '../../components/PlanGrid';
import { COUNTRIES, SENIORITY } from '../../lib/format';

const TABS = [
  ['profile', 'Profile and resume'],
  ['alerts', 'Alerts'],
  ['apply', 'Applications'],
  ['companies', 'Companies'],
  ['billing', 'Plan and billing'],
  ['referrals', 'Invite friends'],
  ['account', 'Account'],
];

const Section = ({ title, children, description }) => (
  <section className="panel p-6">
    <h2 className="font-sans text-[17px] font-semibold">{title}</h2>
    {description && <p className="mt-1 text-[14px] text-muted">{description}</p>}
    <div className="mt-5 space-y-5">{children}</div>
  </section>
);

const Locked = ({ children }) => <span className="ml-2 inline-flex items-center gap-1 text-[12px] font-semibold text-warn"><Lock className="h-3 w-3" />{children}</span>;

function useSave(url, msg = 'Saved') {
  const { setUser } = useAuth();
  return useMutation({ mutationFn: (body) => patch(url, body), onSuccess: (d) => { setUser(d.user); toast.success(msg); }, onError: (e) => toast.error(e.message) });
}

function ProfileTab() {
  const { user, setUser } = useAuth();
  const p = user.profile || {};
  const [f, setF] = useState({ name: user.name, headline: p.headline || '', summary: p.summary || '', country: p.country || 'NG', city: p.city || '', timezone: p.timezone || 'UTC', experienceLevel: p.experienceLevel || 'mid', yearsExperience: p.yearsExperience ?? '', skills: p.skills || [], phone: p.phone || '', links: { portfolio: p.links?.portfolio || '', github: p.links?.github || '', linkedin: p.links?.linkedin || '', website: p.links?.website || '' } });
  const save = useSave('/me/profile', 'Profile saved');
  const [uploading, setUploading] = useState(false);
  const upload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('resume', file);
      const { data } = await api.post('/me/resume', fd);
      setUser(data.user);
      setF((x) => ({ ...x, skills: data.user.profile.skills }));
      toast.success(`Resume updated. ${data.parsed.skills.length} skills found.`);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setUploading(false);
    }
  };
  const L = (k) => (e) => setF({ ...f, links: { ...f.links, [k]: e.target.value } });
  return (
    <div className="space-y-6">
      <Section title="Resume" description="Used to match jobs and write cover letters. Only you can see it.">
        <div className="flex flex-wrap items-center gap-4">
          <FileText className="h-8 w-8 text-brand" />
          <div className="flex-1">
            <div className="text-[15px] font-semibold">{p.resume?.fileName || 'No resume uploaded'}</div>
            {p.resume?.uploadedAt && <div className="text-[13px] text-muted">Uploaded {new Date(p.resume.uploadedAt).toLocaleDateString()}</div>}
          </div>
          {p.resume?.fileName && <Button variant="ghost" size="sm" href={`${API_BASE}/me/resume/file`}>View</Button>}
          <label className="inline-flex h-10 cursor-pointer items-center rounded-ctl border border-line bg-surface px-4 text-[14px] font-semibold hover:bg-raised">
            {uploading ? 'Uploading…' : p.resume?.fileName ? 'Replace PDF' : 'Upload PDF'}
            <input type="file" accept="application/pdf" className="sr-only" onChange={(e) => upload(e.target.files?.[0])} />
          </label>
        </div>
      </Section>
      <form onSubmit={(e) => { e.preventDefault(); save.mutate({ name: f.name, profile: { ...f, name: undefined, yearsExperience: f.yearsExperience === '' ? undefined : Number(f.yearsExperience) } }); }}>
        <Section title="About you">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Full name"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
            <Field label="Headline"><Input value={f.headline} onChange={(e) => setF({ ...f, headline: e.target.value })} placeholder="Full-stack MERN developer" /></Field>
            <Field label="Short summary" className="sm:col-span-2" hint="Two or three sentences. The AI uses this in cover letters."><Textarea value={f.summary} onChange={(e) => setF({ ...f, summary: e.target.value })} rows={3} /></Field>
            <Field label="Country"><Select value={f.country} onChange={(e) => setF({ ...f, country: e.target.value })}>{COUNTRIES.map(([c, n]) => <option key={c} value={c}>{n}</option>)}</Select></Field>
            <Field label="City"><Input value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} /></Field>
            <Field label="Time zone" hint="Used for quiet hours and digest time."><Input value={f.timezone} onChange={(e) => setF({ ...f, timezone: e.target.value })} /></Field>
            <Field label="Years of experience"><Input type="number" min="0" value={f.yearsExperience} onChange={(e) => setF({ ...f, yearsExperience: e.target.value })} /></Field>
            <Field label="Level" className="sm:col-span-2"><Pills options={SENIORITY} value={f.experienceLevel} onChange={(v) => setF({ ...f, experienceLevel: v })} multiple={false} /></Field>
            <Field label="Skills" className="sm:col-span-2"><ChipInput value={f.skills} onChange={(v) => setF({ ...f, skills: v })} /></Field>
            <Field label="Portfolio"><Input value={f.links.portfolio} onChange={L('portfolio')} placeholder="https://" /></Field>
            <Field label="GitHub"><Input value={f.links.github} onChange={L('github')} /></Field>
            <Field label="LinkedIn"><Input value={f.links.linkedin} onChange={L('linkedin')} /></Field>
            <Field label="Phone"><Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
          </div>
          <Button type="submit" loading={save.isPending}>Save profile</Button>
        </Section>
      </form>
    </div>
  );
}

function AlertsTab() {
  const { user, setUser } = useAuth();
  const a = user.alerts;
  const paid = user.plan !== 'free';
  const save = useSave('/me/alerts', 'Alert settings saved');
  const [phone, setPhone] = useState(a.whatsapp?.phone || '');
  const [link, setLink] = useState(null);
  const test = useMutation({ mutationFn: (channel) => post('/me/alerts/test', { channel }), onSuccess: () => toast.success('Test alert sent'), onError: (e) => toast.error(e.message) });

  const connectTg = async () => {
    const d = await get('/me/alerts/telegram-link');
    if (!d.enabled) return toast.info('Telegram alerts will work once the bot is configured on the server.');
    setLink(d.url);
    window.open(d.url, '_blank', 'noopener');
  };
  const checkTg = async () => {
    const d = await get('/auth/me');
    setUser(d.user);
    toast[d.user.alerts.telegram.chatId ? 'success' : 'info'](d.user.alerts.telegram.chatId ? 'Telegram connected' : 'Not connected yet. Tap Start in the Telegram chat.');
  };
  const disconnect = useMutation({ mutationFn: () => post('/me/alerts/telegram-disconnect'), onSuccess: (d) => { setUser(d.user); setLink(null); toast.success('Telegram disconnected'); } });

  return (
    <div className="space-y-6">
      <Section title="Channels" description="Where matches are sent.">
        <div className="flex flex-wrap items-center gap-4 rounded-ctl border border-line p-4">
          <Send className="h-5 w-5 text-brand" />
          <div className="flex-1">
            <div className="text-[15px] font-semibold">Telegram</div>
            <div className="text-[13px] text-muted">{a.telegram.chatId ? `Connected${a.telegram.username ? ` as @${a.telegram.username}` : ''}` : 'Not connected'}</div>
          </div>
          {a.telegram.chatId ? (
            <>
              <Toggle checked={a.telegram.enabled} onChange={(v) => save.mutate({ telegram: { enabled: v } })} label="" />
              <Button size="sm" variant="ghost" onClick={() => test.mutate('telegram')}>Send test</Button>
              <Button size="sm" variant="ghost" onClick={() => disconnect.mutate()}>Disconnect</Button>
            </>
          ) : link ? <Button size="sm" variant="secondary" onClick={checkTg}>I've tapped Start</Button> : <Button size="sm" onClick={connectTg}>Connect Telegram</Button>}
        </div>
        <div className="flex flex-wrap items-center gap-4 rounded-ctl border border-line p-4 opacity-70">
          <MessageCircle className="h-5 w-5 text-match" />
          <div className="flex-1">
            <div className="text-[15px] font-semibold">WhatsApp <span className="ml-1 rounded-full bg-brand/10 px-2 py-0.5 text-[12px] font-semibold text-brand">Coming soon</span></div>
            <div className="text-[13px] text-muted">WhatsApp alerts are on the way. Use Telegram or email for now.</div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 rounded-ctl border border-line p-4">
          <Mail className="h-5 w-5 text-muted" />
          <div className="flex-1"><div className="text-[15px] font-semibold">Email digest</div><div className="text-[13px] text-muted">{user.email}</div></div>
          <Toggle checked={a.email.enabled} onChange={(v) => save.mutate({ email: { enabled: v } })} label="" />
          <Button size="sm" variant="ghost" onClick={() => test.mutate('email')}>Send test</Button>
        </div>
      </Section>

      <Section title="Timing">
        <Field label={<>How to send matches {!paid && <Locked>Instant needs Basic</Locked>}</>}>
          <Pills options={{ instant: 'Instantly, as they’re found', digest: 'Once a day' }} value={a.delivery} onChange={(v) => save.mutate({ delivery: v })} multiple={false} />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Daily digest time" hint="In your time zone.">
            <Select value={a.digestHour} onChange={(e) => save.mutate({ digestHour: Number(e.target.value) })}>{[...Array(24)].map((_, h) => <option key={h} value={h}>{`${String(h).padStart(2, '0')}:00`}</option>)}</Select>
          </Field>
          <Field label="Most alerts per day">
            <Select value={a.maxPerDay} onChange={(e) => save.mutate({ maxPerDay: Number(e.target.value) })}>{[5, 10, 20, 40, 80, 200].map((n) => <option key={n} value={n}>{n}</option>)}</Select>
          </Field>
        </div>
        <Toggle checked={a.quietHours.enabled} onChange={(v) => save.mutate({ quietHours: { ...a.quietHours, enabled: v } })} label="Quiet hours" description="Matches found during quiet hours wait for your digest." />
        {a.quietHours.enabled && (
          <div className="grid max-w-md grid-cols-2 gap-4">
            <Field label="From"><Select value={a.quietHours.start} onChange={(e) => save.mutate({ quietHours: { ...a.quietHours, start: Number(e.target.value) } })}>{[...Array(24)].map((_, h) => <option key={h} value={h}>{`${String(h).padStart(2, '0')}:00`}</option>)}</Select></Field>
            <Field label="Until"><Select value={a.quietHours.end} onChange={(e) => save.mutate({ quietHours: { ...a.quietHours, end: Number(e.target.value) } })}>{[...Array(24)].map((_, h) => <option key={h} value={h}>{`${String(h).padStart(2, '0')}:00`}</option>)}</Select></Field>
          </div>
        )}
      </Section>
    </div>
  );
}

function ApplyTab() {
  const { user } = useAuth();
  const ap = user.apply;
  const save = useSave('/me/apply', 'Application settings saved');
  const [ans, setAns] = useState({ workAuthorization: ap.answers?.workAuthorization || '', needsSponsorship: ap.answers?.needsSponsorship || false, noticePeriod: ap.answers?.noticePeriod || '', salaryExpectation: ap.answers?.salaryExpectation || '', willingToRelocate: ap.answers?.willingToRelocate || false });
  const modes = {
    off: ['Alerts only', 'You get matches and apply yourself. Draft a cover letter for any job with one tap.'],
    approve: ['Approve first', 'Strong matches arrive with a cover letter and answers prepared. You review and submit.', 'pro'],
    auto: ['Auto mode', 'Prepares applications without asking and submits directly where an employer integration allows. You get a summary.', 'premium'],
  };
  const rank = { free: 0, basic: 0, pro: 1, premium: 2 };
  return (
    <div className="space-y-6">
      <Section title="How applications work">
        <div className="space-y-2.5">
          {Object.entries(modes).map(([k, [t, d, need]]) => {
            const locked = need && rank[user.plan] < rank[need];
            return (
              <button key={k} type="button" disabled={locked} onClick={() => save.mutate({ mode: k })} className={clsx('flex w-full items-start gap-3 rounded-ctl border p-4 text-left transition-colors', ap.mode === k ? 'border-brand bg-brand-soft/60' : 'border-line hover:bg-raised', locked && 'cursor-not-allowed opacity-60')}>
                <span className={clsx('mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2', ap.mode === k ? 'border-brand bg-brand' : 'border-line')}>{ap.mode === k && <Check className="h-3 w-3 text-brand-ink" />}</span>
                <span><span className="block text-[15px] font-semibold">{t}{locked && <Locked>{need === 'pro' ? 'Pro plan' : 'Premium plan'}</Locked>}</span><span className="mt-0.5 block text-[14px] text-muted">{d}</span></span>
              </button>
            );
          })}
        </div>
        {ap.mode !== 'off' && (
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label={`Only prepare for matches scoring ${ap.minScore}+`}><input type="range" min="50" max="95" step="5" defaultValue={ap.minScore} onMouseUp={(e) => save.mutate({ minScore: Number(e.target.value) })} onTouchEnd={(e) => save.mutate({ minScore: Number(e.target.value) })} className="w-full accent-[rgb(var(--brand))]" /></Field>
            <Field label="Most applications per day" hint="Keeps you from spamming companies."><Select value={ap.dailyLimit} onChange={(e) => save.mutate({ dailyLimit: Number(e.target.value) })}>{[3, 5, 10, 15, 25, 40].map((n) => <option key={n}>{n}</option>)}</Select></Field>
          </div>
        )}
      </Section>
      <Section title="Cover letter style">
        <Field label="Tone"><Pills options={{ professional: 'Professional', friendly: 'Friendly', confident: 'Confident', concise: 'Concise' }} value={ap.tone} onChange={(v) => save.mutate({ tone: v })} multiple={false} /></Field>
        <Field label="Length"><Pills options={{ short: 'Short', medium: 'Medium', long: 'Long' }} value={ap.length} onChange={(v) => save.mutate({ length: v })} multiple={false} /></Field>
      </Section>
      <form onSubmit={(e) => { e.preventDefault(); save.mutate({ answers: ans }); }}>
        <Section title="Screening answers" description="Saved once, filled into every application.">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Work authorization" hint="e.g. Nigerian citizen, can work remotely as a contractor"><Input value={ans.workAuthorization} onChange={(e) => setAns({ ...ans, workAuthorization: e.target.value })} /></Field>
            <Field label="Notice period / start date"><Input value={ans.noticePeriod} onChange={(e) => setAns({ ...ans, noticePeriod: e.target.value })} placeholder="2 weeks" /></Field>
            <Field label="Salary expectation"><Input value={ans.salaryExpectation} onChange={(e) => setAns({ ...ans, salaryExpectation: e.target.value })} placeholder="$4,000/month" /></Field>
          </div>
          <Toggle checked={ans.needsSponsorship} onChange={(v) => setAns({ ...ans, needsSponsorship: v })} label="I need visa sponsorship" />
          <Toggle checked={ans.willingToRelocate} onChange={(v) => setAns({ ...ans, willingToRelocate: v })} label="I'm willing to relocate" />
          <Button type="submit" loading={save.isPending}>Save answers</Button>
        </Section>
      </form>
    </div>
  );
}

function CompaniesTab() {
  const { user } = useAuth();
  const [watch, setWatch] = useState(user.watchlist || []);
  const [block, setBlock] = useState(user.blockedCompanies || []);
  const save = useSave('/me/lists', 'Company lists saved');
  return (
    <Section title="Companies" description="Fine-tune which employers reach you.">
      <Field label={<>Watchlist {user.plan === 'free' && <Locked>Basic plan and up</Locked>}</>} hint="You'll hear about every job these companies post that loosely fits you, even below your match score.">
        <ChipInput value={watch} onChange={setWatch} placeholder="e.g. Flutterwave, Stripe" />
      </Field>
      <Field label="Never show me" hint="Jobs from these companies are always hidden.">
        <ChipInput value={block} onChange={setBlock} placeholder="Company name" />
      </Field>
      <Button loading={save.isPending} onClick={() => save.mutate({ watchlist: watch, blockedCompanies: block })}>Save lists</Button>
    </Section>
  );
}

function BillingTab() {
  const { user, setUser } = useAuth();
  const change = useMutation({ mutationFn: (plan) => post('/billing/change-plan', { plan }), onSuccess: (d) => { setUser(d.user); toast.success(`You're on the ${d.user.plan} plan`); }, onError: (e) => toast.error(e.message) });
  return (
    <div className="space-y-6">
      <Section title="Current plan">
        <div className="flex flex-wrap items-center gap-3">
          <Badge tone="brand" className="capitalize">{user.plan}</Badge>
          {user.trialEndsAt && <span className="text-[14px] text-muted">Free trial ends {new Date(user.trialEndsAt).toLocaleDateString()}</span>}
          {user.planRenewsAt && !user.trialEndsAt && <span className="text-[14px] text-muted">Renews {new Date(user.planRenewsAt).toLocaleDateString()}</span>}
        </div>
        <p className="rounded-ctl bg-warn-soft px-4 py-3 text-[14px] text-warn">Payments are in test mode: switching plans takes effect right away without charging. Card, bank transfer and USDC checkout is coming.</p>
      </Section>
      <PlanGrid currentPlan={user.plan} onChoose={(id) => change.mutate(id)} choosing={change.isPending ? change.variables : null} />
    </div>
  );
}

function ReferralsTab() {
  const { user } = useAuth();
  const link = `${window.location.origin}/register?ref=${user.referralCode}`;
  return (
    <Section title="Invite friends, both get a week of Pro" description="When a friend signs up with your link, they get 7 days of Pro and 7 days are added to your plan.">
      <div className="flex flex-wrap gap-2">
        <Input value={link} readOnly className="max-w-lg" onFocus={(e) => e.target.select()} />
        <Button icon={Copy} onClick={() => navigator.clipboard?.writeText(link).then(() => toast.success('Link copied'))}>Copy link</Button>
        <Button variant="secondary" href={`https://wa.me/?text=${encodeURIComponent(`I use EmployHunt to get new jobs on WhatsApp minutes after they're posted. Join with my link and get a week of Pro free: ${link}`)}`}>Share on WhatsApp</Button>
      </div>
      <p className="text-[15px]"><span className="tnum font-display text-[24px] font-bold">{user.referralCount || 0}</span> <span className="text-muted">friends joined</span></p>
    </Section>
  );
}

function AccountTab() {
  const { logout } = useAuth();
  const nav = useNavigate();
  const [pw, setPw] = useState({ current: '', password: '' });
  const [confirmText, setConfirmText] = useState('');
  const change = useMutation({ mutationFn: () => post('/auth/change-password', pw), onSuccess: () => { toast.success('Password changed'); setPw({ current: '', password: '' }); }, onError: (e) => toast.error(e.message) });
  const remove = useMutation({ mutationFn: () => del('/me', { confirm: confirmText }), onSuccess: async () => { await logout(); toast.success('Your account was deleted'); nav('/'); }, onError: (e) => toast.error(e.message) });
  return (
    <div className="space-y-6">
      <form onSubmit={(e) => { e.preventDefault(); change.mutate(); }}>
        <Section title="Change password">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Current password"><Input type="password" autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} /></Field>
            <Field label="New password" hint="At least 8 characters."><Input type="password" autoComplete="new-password" value={pw.password} onChange={(e) => setPw({ ...pw, password: e.target.value })} /></Field>
          </div>
          <Button type="submit" loading={change.isPending}>Change password</Button>
        </Section>
      </form>
      <Section title="Your data" description="Download everything we store about you as a JSON file.">
        <Button variant="secondary" icon={Download} href={`${API_BASE}/me/export`}>Download my data</Button>
      </Section>
      <Section title="Delete account" description="This removes your profile, resume, matches and applications for good.">
        <Field label='Type "DELETE" to confirm'><Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} className="max-w-xs" /></Field>
        <Button variant="danger" disabled={confirmText !== 'DELETE'} loading={remove.isPending} onClick={() => remove.mutate()}>Delete my account</Button>
      </Section>
    </div>
  );
}

const VIEWS = { profile: ProfileTab, alerts: AlertsTab, apply: ApplyTab, companies: CompaniesTab, billing: BillingTab, referrals: ReferralsTab, account: AccountTab };

export default function Settings() {
  const { tab } = useParams();
  const View = VIEWS[tab];
  if (!View) return <Navigate to="/app/settings/profile" replace />;
  return (
    <div>
      <PageHeader title="Settings" />
      <div className="grid gap-6 lg:grid-cols-[210px_1fr]">
        <nav className="flex gap-1 overflow-x-auto lg:flex-col" aria-label="Settings">
          {TABS.map(([k, label]) => (
            <NavLink key={k} to={`/app/settings/${k}`} className={({ isActive }) => clsx('whitespace-nowrap rounded-ctl px-3 py-2 text-[14px] font-semibold', isActive ? 'bg-brand-soft text-brand' : 'text-muted hover:bg-raised hover:text-ink')}>{label}</NavLink>
          ))}
        </nav>
        <div className="min-w-0"><View /></div>
      </div>
    </div>
  );
}
