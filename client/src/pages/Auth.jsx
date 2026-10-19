import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Eye, EyeOff, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { post } from '../lib/api';
import { Button, Field, Input } from '../components/ui';

const COPY = {
  login: { title: 'Sign in', sub: 'Welcome back. Your matches are waiting.', cta: 'Sign in' },
  register: { title: 'Create your free account', sub: 'Set up your first job search in about two minutes.', cta: 'Create account' },
  forgot: { title: 'Reset your password', sub: "Enter your email and we'll send you a reset link.", cta: 'Send reset link' },
  reset: { title: 'Choose a new password', sub: 'Use at least 8 characters.', cta: 'Save new password' },
};

export default function Auth({ mode }) {
  const { login, register, setUser } = useAuth();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [form, setForm] = useState({ name: '', email: '', password: '', referralCode: params.get('ref') || '' });
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState({});
  const [sent, setSent] = useState(false);
  const c = COPY[mode];

  useEffect(() => {
    document.title = `${c.title} — EmployHunt`;
    if (params.get('plan')) {
      try {
        localStorage.setItem('eh-plan-intent', params.get('plan'));
      } catch {
        /* ignore */
      }
    }
  }, [c.title, params]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      if (mode === 'login') {
        const u = await login({ email: form.email, password: form.password });
        nav(params.get('next') || (u.onboarded ? '/app' : '/app/onboarding'));
      } else if (mode === 'register') {
        await register({ name: form.name, email: form.email, password: form.password, referralCode: form.referralCode || undefined });
        nav('/app/onboarding');
      } else if (mode === 'forgot') {
        await post('/auth/forgot-password', { email: form.email });
        setSent(true);
      } else {
        const d = await post('/auth/reset-password', { token: params.get('token'), password: form.password });
        setUser(d.user);
        toast.success('Password updated');
        nav('/app');
      }
    } catch (err) {
      setErrors(err.fields || {});
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page grid min-h-[calc(100vh-64px)] items-center gap-12 py-12 lg:grid-cols-2">
      <div className="mx-auto w-full max-w-[420px] lg:mx-0">
        <h1 className="text-[32px] font-bold">{c.title}</h1>
        <p className="mt-2 text-[15px] text-muted">{c.sub}</p>

        {sent ? (
          <div className="panel mt-8 p-5 text-[15px]">If that email has an account, a reset link is on its way. It works for one hour. Check your spam folder too.</div>
        ) : (
          <form onSubmit={submit} className="mt-8 space-y-5" noValidate>
            {mode === 'register' && (
              <Field label="Full name" htmlFor="name" error={errors.name}>
                <Input id="name" autoComplete="name" value={form.name} onChange={set('name')} required />
              </Field>
            )}
            {mode !== 'reset' && (
              <Field label="Email" htmlFor="email" error={errors.email}>
                <Input id="email" type="email" autoComplete="email" value={form.email} onChange={set('email')} required />
              </Field>
            )}
            {mode !== 'forgot' && (
              <Field
                label={mode === 'reset' ? 'New password' : 'Password'}
                htmlFor="password"
                error={errors.password}
                hint={mode === 'register' ? 'At least 8 characters.' : undefined}
              >
                <div className="relative">
                  <Input id="password" type={show ? 'text' : 'password'} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={form.password} onChange={set('password')} required className="pr-11" />
                  <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-faint hover:text-ink" aria-label={show ? 'Hide password' : 'Show password'}>
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </Field>
            )}
            {mode === 'login' && <div className="-mt-2 text-right"><Link to="/forgot-password" className="text-[14px] font-semibold text-brand hover:underline">Forgot password?</Link></div>}
            {mode === 'register' && form.referralCode && <p className="rounded-ctl bg-match-soft px-3 py-2 text-[14px] text-match">Invite code applied: you'll get 7 days of Pro free.</p>}
            <Button type="submit" size="lg" className="w-full" loading={busy}>{c.cta}</Button>
          </form>
        )}

        <p className="mt-6 text-[14px] text-muted">
          {mode === 'login' && <>New here? <Link to="/register" className="font-semibold text-brand hover:underline">Create a free account</Link></>}
          {mode === 'register' && <>Already have an account? <Link to="/login" className="font-semibold text-brand hover:underline">Sign in</Link></>}
          {(mode === 'forgot' || mode === 'reset') && <Link to="/login" className="font-semibold text-brand hover:underline">Back to sign in</Link>}
        </p>
        {mode === 'register' && <p className="mt-4 text-[13px] text-faint">By creating an account you agree to the <Link to="/terms" className="underline">terms</Link> and <Link to="/privacy" className="underline">privacy policy</Link>.</p>}
      </div>

      <div className="hidden rounded-panel border border-line bg-surface p-10 lg:block">
        <h2 className="text-[26px] font-bold">What you get on day one</h2>
        <ul className="mt-6 space-y-4 text-[15px]">
          {[
            'Your resume read automatically: skills, level and links filled in',
            'Ready-made searches like "Remote React developer" you can edit',
            'Matches from the last 7 days waiting for you the moment you finish',
            'A free ATS check on any job you open',
            'Alerts on Telegram or email (WhatsApp coming soon)',
          ].map((t) => (
            <li key={t} className="flex gap-3"><Check className="mt-0.5 h-5 w-5 shrink-0 text-match" />{t}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
