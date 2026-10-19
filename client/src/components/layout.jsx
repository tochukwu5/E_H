import { useState, useEffect, useRef } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { Moon, Sun, Menu, X, LayoutGrid, Target, Send, SlidersHorizontal, Settings, Bell, LogOut, Shield, Search, Sparkles, ChevronDown } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { Button, Badge } from './ui';
import ErrorBoundary from './ErrorBoundary';
import { get, post } from '../lib/api';
import { timeAgo } from '../lib/format';

export function Logo({ className }) {
  return (
    <Link to="/" className={clsx('flex items-center gap-0 font-display text-[19px] font-bold tracking-tight text-ink', className)} aria-label="EmployHunt home">
      <img src="/favicon.svg" alt="" className="h-8 w-8 object-contain mr-2" />
      Employ<span className="text-blue-500 p-0 m-0">Hunt</span> 
    </Link>
  );
}

export function ThemeToggle({ className }) {
  const { theme, toggle } = useTheme();
  const dark = theme === 'dark';
  return (
    <button
      onClick={toggle}
      className={clsx('relative flex h-9 w-[68px] items-center rounded-full border border-line bg-raised p-1 transition-colors', className)}
      aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={dark ? 'Light theme' : 'Dark theme'}
    >
      <span className={clsx('absolute h-7 w-7 rounded-full bg-surface shadow transition-transform duration-300', dark ? 'translate-x-[30px]' : 'translate-x-0')} />
      <Sun className={clsx('relative z-10 mx-1.5 h-4 w-4 transition-colors', dark ? 'text-faint' : 'text-warn')} />
      <Moon className={clsx('relative z-10 mx-1.5 ml-auto h-4 w-4 transition-colors', dark ? 'text-brand' : 'text-faint')} />
    </button>
  );
}

/* ── Public site ─────────────────────────────────────── */
const PUBLIC_LINKS = [
  ['/jobs', 'Browse jobs'],
  ['/pricing', 'Pricing'],
  ['/tools/ats-checker', 'Resume checker'],
  ['/sources', 'Sources'],
];

function Navbar() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  useEffect(() => {
    setOpen(false);
  }, [loc.pathname]);
  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-canvas/85 backdrop-blur-md">
      <div className="page flex h-16 items-center justify-between gap-4">
        <Logo />
        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {PUBLIC_LINKS.map(([to, label]) => (
            <NavLink key={to} to={to} className={({ isActive }) => clsx('rounded-ctl px-3 py-2 text-[14px] font-semibold transition-colors', isActive ? 'text-ink' : 'text-muted hover:text-ink')}>
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <div className="hidden items-center gap-2 sm:flex">
            {user ? (
              <Button to="/app" size="sm">Open dashboard</Button>
            ) : (
              <>
                <Button to="/login" variant="ghost" size="sm">Sign in</Button>
                <Button to="/register" size="sm">Start free</Button>
              </>
            )}
          </div>
          <button className="rounded-ctl p-2 text-ink md:hidden" onClick={() => setOpen((o) => !o)} aria-label="Menu" aria-expanded={open}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
      {open && (
        <div className="border-t border-line bg-surface md:hidden">
          <nav className="page flex flex-col py-3">
            {PUBLIC_LINKS.map(([to, label]) => (
              <NavLink key={to} to={to} className="rounded-ctl px-2 py-2.5 text-[15px] font-semibold text-ink">{label}</NavLink>
            ))}
            <div className="mt-3 flex gap-2 border-t border-line pt-3">
              {user ? <Button to="/app" className="flex-1">Open dashboard</Button> : (
                <>
                  <Button to="/login" variant="secondary" className="flex-1">Sign in</Button>
                  <Button to="/register" className="flex-1">Start free</Button>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

function Footer() {
  return (
    <footer className="mt-24 border-t border-line">
      <div className="page grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-[14px] text-muted">New jobs from company career pages and trusted job boards, sent to your phone within minutes.</p>
        </div>
        {[
          ['Product', [['/jobs', 'Browse jobs'], ['/pricing', 'Pricing'], ['/sources', 'Where jobs come from']]],
          ['Free tools', [['/tools/ats-checker', 'ATS resume checker'], ['/register', 'Job alerts']]],
          ['Company', [['/privacy', 'Privacy'], ['/terms', 'Terms'], ['mailto:hello@employhunt.app', 'Contact']]],
        ].map(([h, links]) => (
          <div key={h}>
            <h3 className="font-sans text-[14px] font-semibold">{h}</h3>
            <ul className="mt-3 space-y-2">
              {links.map(([to, label]) => (
                <li key={label}>{to.startsWith('mailto') ? <a href={to} className="text-[14px] text-muted hover:text-ink">{label}</a> : <Link to={to} className="text-[14px] text-muted hover:text-ink">{label}</Link>}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="page border-t border-line py-5 text-[13px] text-faint">© {new Date().getFullYear()} EmployHunt. Job listings belong to their publishers and link back to the original posting.</div>
    </footer>
  );
}

export function PublicLayout() {
  const loc = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [loc.pathname]);
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-ctl focus:bg-surface focus:px-3 focus:py-2">Skip to content</a>
      <Navbar />
      <main id="main" className="flex-1">
        <ErrorBoundary key={loc.pathname}>
          <Outlet />
        </ErrorBoundary>
      </main>
      <Footer />
    </div>
  );
}

/* ── Signed-in app ───────────────────────────────────── */
const APP_LINKS = [
  ['/app', 'Overview', LayoutGrid, true],
  ['/app/matches', 'Matches', Target],
  ['/app/applications', 'Applications', Send],
  ['/app/searches', 'Job searches', SlidersHorizontal],
  ['/jobs', 'Browse all jobs', Search],
  ['/app/settings', 'Settings', Settings],
];

function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['notifications'], queryFn: () => get('/me/notifications'), refetchInterval: 60_000 });
  const markRead = useMutation({ mutationFn: () => post('/me/notifications/read'), onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }) });
  useEffect(() => {
    const close = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => { setOpen((o) => !o); if (!open && data?.unread) markRead.mutate(); }} className="relative rounded-ctl p-2 text-muted hover:bg-raised hover:text-ink" aria-label={`Notifications${data?.unread ? `, ${data.unread} unread` : ''}`}>
        <Bell className="h-5 w-5" />
        {data?.unread > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-danger" />}
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[min(360px,calc(100vw-32px))] overflow-hidden rounded-panel border border-line bg-surface shadow-pop">
          <div className="border-b border-line px-4 py-3 text-[14px] font-semibold">Notifications</div>
          <ul className="max-h-[380px] overflow-y-auto">
            {data?.items?.length ? data.items.map((n) => (
              <li key={n._id} className="border-b border-line/70 last:border-0">
                <Link to={n.link || '/app'} onClick={() => setOpen(false)} className="block px-4 py-3 hover:bg-raised">
                  <div className="text-[14px] font-semibold">{n.title}</div>
                  {n.body && <div className="mt-0.5 line-clamp-2 whitespace-pre-line text-[13px] text-muted">{n.body}</div>}
                  <div className="mt-1 text-[12px] text-faint">{timeAgo(n.createdAt)}</div>
                </Link>
              </li>
            )) : <li className="px-4 py-8 text-center text-[14px] text-muted">Nothing yet. New matches show up here.</li>}
          </ul>
        </div>
      )}
    </div>
  );
}

function UserMenu() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const close = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2 rounded-ctl py-1 pl-1 pr-2 hover:bg-raised" aria-expanded={open}>
        <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-soft text-[13px] font-bold text-brand">{user?.name?.[0]?.toUpperCase()}</span>
        <ChevronDown className="h-4 w-4 text-muted" />
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-panel border border-line bg-surface p-1.5 shadow-pop">
          <div className="px-3 py-2">
            <div className="truncate text-[14px] font-semibold">{user?.name}</div>
            <div className="truncate text-[13px] text-muted">{user?.email}</div>
          </div>
          <Link to="/app/settings/billing" onClick={() => setOpen(false)} className="block rounded-ctl px-3 py-2 text-[14px] hover:bg-raised">Plan and billing</Link>
          <Link to="/app/settings" onClick={() => setOpen(false)} className="block rounded-ctl px-3 py-2 text-[14px] hover:bg-raised">Settings</Link>
          <button onClick={async () => { await logout(); nav('/'); }} className="flex w-full items-center gap-2 rounded-ctl px-3 py-2 text-left text-[14px] text-danger hover:bg-raised"><LogOut className="h-4 w-4" /> Sign out</button>
        </div>
      )}
    </div>
  );
}

function SideNav({ onNavigate }) {
  const { user } = useAuth();
  return (
    <nav className="flex flex-1 flex-col gap-0.5" aria-label="App">
      {APP_LINKS.map(([to, label, Icon, end]) => (
        <NavLink key={to} to={to} end={end} onClick={onNavigate} className={({ isActive }) => clsx('flex items-center gap-3 rounded-ctl px-3 py-2.5 text-[14px] font-semibold transition-colors', isActive ? 'bg-brand-soft text-brand' : 'text-muted hover:bg-raised hover:text-ink')}>
          <Icon className="h-[18px] w-[18px]" /> {label}
        </NavLink>
      ))}
      {user?.role === 'admin' && (
        <NavLink to="/admin" onClick={onNavigate} className={({ isActive }) => clsx('mt-4 flex items-center gap-3 rounded-ctl px-3 py-2.5 text-[14px] font-semibold', isActive ? 'bg-brand-soft text-brand' : 'text-muted hover:bg-raised hover:text-ink')}>
          <Shield className="h-[18px] w-[18px]" /> Admin
        </NavLink>
      )}
      {user?.plan === 'free' && (
        <Link to="/app/settings/billing" onClick={onNavigate} className="mt-auto rounded-panel border border-line bg-raised p-4">
          <Sparkles className="h-5 w-5 text-brand" />
          <div className="mt-2 text-[14px] font-semibold">Get alerts instantly</div>
          <div className="mt-0.5 text-[13px] text-muted">Basic sends matches to Telegram the minute we find them. WhatsApp is coming soon.</div>
          <div className="mt-2 text-[13px] font-semibold text-brand">See plans</div>
        </Link>
      )}
    </nav>
  );
}

export function AppLayout() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  useEffect(() => {
    setOpen(false);
  }, [loc.pathname]);
  const planTone = { free: 'neutral', basic: 'brand', pro: 'brand', premium: 'match' }[user?.plan];
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[256px_1fr]">
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-line bg-surface px-4 py-5 lg:flex">
        <Logo className="mb-8 px-2" />
        <SideNav />
      </aside>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} aria-label="Close menu" />
          <aside className="relative flex h-full w-72 flex-col bg-surface px-4 py-5">
            <Logo className="mb-8 px-2" />
            <SideNav onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}
      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-line bg-canvas/85 px-4 backdrop-blur-md sm:px-6">
          <div className="flex items-center gap-3">
            <button className="rounded-ctl p-2 lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu"><Menu className="h-5 w-5" /></button>
            <Badge tone={planTone}>{user?.plan ? `${user.plan[0].toUpperCase()}${user.plan.slice(1)} plan` : ''}</Badge>
          </div>
          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            <NotificationsBell />
            <UserMenu />
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1100px] px-4 py-8 sm:px-6">
          <ErrorBoundary key={loc.pathname}>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
