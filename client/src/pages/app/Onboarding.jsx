import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import clsx from 'clsx';
import { FileText, Check, Send, Mail, MessageCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api, patch, post, put, get } from '../../lib/api';
import { Logo, ThemeToggle } from '../../components/layout';
import { Button, Field, Input, Select, ChipInput, Pills, Toggle } from '../../components/ui';
import SearchForm from '../../components/SearchForm';
import { COUNTRIES, SENIORITY } from '../../lib/format';

const STEPS = ['Resume', 'About you', 'First search', 'Alerts'];

function Stepper({ step }) {
  return (
    <ol className="flex items-center gap-2" aria-label="Setup progress">
      {STEPS.map((s, i) => (
        <li key={s} className="flex items-center gap-2">
          <span className={clsx('grid h-7 w-7 place-items-center rounded-full text-[13px] font-bold', i < step ? 'bg-match text-white' : i === step ? 'bg-brand text-brand-ink' : 'bg-raised text-faint')}>{i < step ? <Check className="h-4 w-4" /> : i + 1}</span>
          <span className={clsx('hidden text-[14px] font-semibold sm:inline', i === step ? 'text-ink' : 'text-faint')}>{s}</span>
          {i < STEPS.length - 1 && <span className="mx-1 h-px w-6 bg-line sm:w-10" />}
        </li>
      ))}
    </ol>
  );
}

function ResumeStep({ next }) {
  const { user, setUser } = useAuth();
  const [busy, setBusy] = useState(false);
  const [parsed, setParsed] = useState(null);
  const upload = async (file) => {
    if (!file) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('resume', file);
      const { data } = await api.post('/me/resume', fd);
      setUser(data.user);
      setParsed(data.parsed);
      if (!data.parsed.readable) toast.warning("We couldn't read text from that PDF. You can still continue and fill in your skills.");
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div>
      <h1 className="text-[30px] font-bold">Upload your resume</h1>
      <p className="mt-2 text-[15px] text-muted">We read your skills, experience and links to match jobs and write cover letters. Only you can see it.</p>
      <label className="mt-8 flex cursor-pointer flex-col items-center rounded-panel border-2 border-dashed border-line bg-surface px-6 py-12 text-center hover:border-brand">
        {busy ? <Loader2 className="h-10 w-10 animate-spin text-brand" /> : <FileText className="h-10 w-10 text-brand" />}
        <span className="mt-4 text-[16px] font-semibold">{user.profile?.resume?.fileName || 'Choose your resume (PDF)'}</span>
        <span className="mt-1 text-[14px] text-muted">Up to 5 MB</span>
        <input type="file" accept="application/pdf" className="sr-only" onChange={(e) => upload(e.target.files?.[0])} disabled={busy} />
      </label>
      {parsed && (
        <div className="panel mt-6 p-5">
          <div className="text-[15px] font-semibold">Here's what we found</div>
          <dl className="mt-3 grid gap-2 text-[14px] sm:grid-cols-2">
            <div><dt className="text-muted">Skills</dt><dd className="font-medium">{parsed.skills.length ? parsed.skills.slice(0, 10).join(', ') : 'None detected'}</dd></div>
            <div><dt className="text-muted">Experience</dt><dd className="font-medium">{parsed.yearsExperience ? `${parsed.yearsExperience}+ years` : 'Not detected'}</dd></div>
          </dl>
        </div>
      )}
      <div className="mt-8 flex gap-2">
        <Button onClick={next} disabled={busy}>{user.profile?.resume?.fileName ? 'Continue' : 'Skip for now'}</Button>
      </div>
    </div>
  );
}

function AboutStep({ next, back }) {
  const { user, setUser } = useAuth();
  const p = user.profile || {};
  const [f, setF] = useState({ headline: p.headline || '', country: p.country || 'NG', city: p.city || '', experienceLevel: p.experienceLevel || 'mid', yearsExperience: p.yearsExperience || '', skills: p.skills || [], links: { portfolio: p.links?.portfolio || '', github: p.links?.github || '', linkedin: p.links?.linkedin || '' } });
  const [busy, setBusy] = useState(false);
  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const d = await patch('/me/profile', { profile: { ...f, yearsExperience: f.yearsExperience === '' ? undefined : Number(f.yearsExperience), timezone: Intl.DateTimeFormat().resolvedOptions().timeZone } });
      setUser(d.user);
      next();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <form onSubmit={save}>
      <h1 className="text-[30px] font-bold">A bit about you</h1>
      <p className="mt-2 text-[15px] text-muted">Your country decides which remote jobs you can apply to. Skills and level shape your match score.</p>
      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        <Field label="Headline" className="sm:col-span-2" hint="e.g. Full-stack MERN developer"><Input value={f.headline} onChange={(e) => setF({ ...f, headline: e.target.value })} maxLength={140} /></Field>
        <Field label="Country you live in">
          <Select value={f.country} onChange={(e) => setF({ ...f, country: e.target.value })}>{COUNTRIES.map(([c, n]) => <option key={c} value={c}>{n}</option>)}</Select>
        </Field>
        <Field label="City"><Input value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} /></Field>
        <Field label="Level" className="sm:col-span-2"><Pills options={SENIORITY} value={f.experienceLevel} onChange={(v) => setF({ ...f, experienceLevel: v })} multiple={false} /></Field>
        <Field label="Years of experience"><Input type="number" min="0" max="50" value={f.yearsExperience} onChange={(e) => setF({ ...f, yearsExperience: e.target.value })} /></Field>
        <div className="hidden sm:block" />
        <Field label="Skills" className="sm:col-span-2" hint="Press Enter after each skill."><ChipInput value={f.skills} onChange={(v) => setF({ ...f, skills: v })} placeholder="e.g. react, node.js, mongodb" /></Field>
        <Field label="Portfolio or website"><Input value={f.links.portfolio} onChange={(e) => setF({ ...f, links: { ...f.links, portfolio: e.target.value } })} placeholder="https://" /></Field>
        <Field label="GitHub"><Input value={f.links.github} onChange={(e) => setF({ ...f, links: { ...f.links, github: e.target.value } })} placeholder="https://github.com/…" /></Field>
      </div>
      <div className="mt-8 flex gap-2">
        <Button type="submit" loading={busy}>Continue</Button>
        <Button type="button" variant="ghost" onClick={back}>Back</Button>
      </div>
    </form>
  );
}

function SearchStep({ next, back }) {
  const { user, setUser } = useAuth();
  const [busy, setBusy] = useState(false);
  const existing = user.searches?.[0];
  const save = async (s) => {
    setBusy(true);
    try {
      const d = existing ? await put(`/me/searches/${existing._id}`, s) : await post('/me/searches', s);
      setUser(d.user);
      next();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div>
      <h1 className="text-[30px] font-bold">What job are you looking for?</h1>
      <p className="mt-2 text-[15px] text-muted">You can add more searches later. The Free plan includes one.</p>
      <div className="panel mt-8 p-6"><SearchForm initial={existing} onSubmit={save} submitting={busy} submitLabel="Save and continue" /></div>
      <Button variant="ghost" className="mt-4" onClick={back}>Back</Button>
    </div>
  );
}

function AlertsStep({ back }) {
  const { user, setUser } = useAuth();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState(user.alerts?.email?.enabled ?? true);
  const [tgLink, setTgLink] = useState(null);

  const connectTelegram = async () => {
    const d = await get('/me/alerts/telegram-link');
    if (!d.enabled) return toast.info('Telegram alerts will be available once the bot is set up on the server.');
    setTgLink(d.url);
    window.open(d.url, '_blank', 'noopener');
  };
  const refresh = async () => {
    const d = await get('/auth/me');
    setUser(d.user);
    if (d.user.alerts.telegram.chatId) toast.success('Telegram connected');
    else toast.info("Not connected yet. Tap Start in Telegram, then check again.");
  };

  const finish = async () => {
    setBusy(true);
    try {
      await patch('/me/alerts', { email: { enabled: email } });
      const d = await post('/me/onboarding/complete');
      setUser(d.user);
      toast.success(d.found ? `Found ${d.found} matching jobs from the last week` : "You're all set. We'll alert you as new jobs arrive.");
      let intent = null;
      try {
        intent = localStorage.getItem('eh-plan-intent');
        localStorage.removeItem('eh-plan-intent');
      } catch {
        /* ignore */
      }
      nav(intent && intent !== 'free' ? '/app/settings/billing' : '/app/matches');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };
  const tgConnected = Boolean(user.alerts?.telegram?.chatId);
  return (
    <div>
      <h1 className="text-[30px] font-bold">Where should we send matches?</h1>
      <p className="mt-2 text-[15px] text-muted">On the Free plan you get a daily digest. Paid plans send each match within minutes.</p>
      <div className="mt-8 space-y-3">
        <div className="panel flex items-center gap-4 p-5">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-brand-soft text-brand"><Send className="h-5 w-5" /></span>
          <div className="flex-1">
            <div className="text-[15px] font-semibold">Telegram</div>
            <div className="text-[13px] text-muted">{tgConnected ? `Connected${user.alerts.telegram.username ? ` as @${user.alerts.telegram.username}` : ''}` : 'Free and instant. Tap Save, Skip or Draft right in the chat.'}</div>
          </div>
          {tgConnected ? <span className="inline-flex items-center gap-1 text-[14px] font-semibold text-match"><Check className="h-4 w-4" />Connected</span> : tgLink ? <Button variant="secondary" size="sm" onClick={refresh}>I've tapped Start</Button> : <Button size="sm" onClick={connectTelegram}>Connect</Button>}
        </div>
        <div className="panel flex items-center gap-4 p-5">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-match-soft text-match"><MessageCircle className="h-5 w-5" /></span>
          <div className="flex-1">
            <div className="text-[15px] font-semibold">WhatsApp</div>
            <div className="text-[13px] text-muted">Available from the Basic plan. Add your number in Settings after upgrading.</div>
          </div>
        </div>
        <div className="panel p-5"><Toggle checked={email} onChange={setEmail} label={<span className="inline-flex items-center gap-2"><Mail className="h-4 w-4 text-muted" />Email digest</span>} description={`A daily summary sent to ${user.email}`} /></div>
      </div>
      <div className="mt-8 flex gap-2">
        <Button size="lg" loading={busy} onClick={finish}>Finish and see my matches</Button>
        <Button variant="ghost" size="lg" onClick={back}>Back</Button>
      </div>
    </div>
  );
}

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));
  const Step = [ResumeStep, AboutStep, SearchStep, AlertsStep][step];
  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4"><Logo /><ThemeToggle /></div>
      </header>
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Stepper step={step} />
        <div className="mt-10"><Step next={next} back={back} /></div>
      </div>
    </div>
  );
}
