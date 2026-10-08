import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Check, Circle, Gift, Target } from 'lucide-react';
import { get } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { Button, Skeleton, ScoreRing, Empty } from '../../components/ui';
import { timeAgo } from '../../lib/format';

function Meter({ label, used, limit }) {
  const pct = limit ? Math.min(100, (used / limit) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-[13px]"><span className="text-muted">{label}</span><span className="tnum font-semibold">{used} / {limit}</span></div>
      <div className="mt-1.5 h-1.5 rounded-full bg-raised"><div className={`h-1.5 rounded-full ${pct > 85 ? 'bg-warn' : 'bg-brand'}`} style={{ width: `${pct}%` }} /></div>
    </div>
  );
}

function Activity({ daily = [] }) {
  const days = [...Array(14)].map((_, i) => {
    const d = new Date(Date.now() - (13 - i) * 864e5).toISOString().slice(0, 10);
    return { d, n: daily.find((x) => x._id === d)?.n || 0 };
  });
  const max = Math.max(1, ...days.map((x) => x.n));
  return (
    <div className="flex h-28 gap-1.5" role="img" aria-label="Matches per day over the last 14 days">
      {days.map((x) => (
        <div key={x.d} className="group relative flex flex-1 flex-col items-center justify-end">
          <div className="w-full rounded-t-[4px] bg-brand/80 transition-colors group-hover:bg-brand" style={{ height: `${Math.max(4, (x.n / max) * 100)}%` }} />
          <span className="pointer-events-none absolute -top-7 hidden rounded bg-ink px-1.5 py-0.5 text-[11px] text-canvas group-hover:block">{x.n}</span>
        </div>
      ))}
    </div>
  );
}

export default function Overview() {
  const { user } = useAuth();
  const { data: stats, isLoading } = useQuery({ queryKey: ['stats'], queryFn: () => get('/me/stats') });
  const { data: top } = useQuery({ queryKey: ['matches', { status: 'new', sort: 'score' }], queryFn: () => get('/matches', { status: 'new', sort: 'score' }) });

  const checklist = [
    ['Upload your resume', Boolean(user.profile?.resume?.fileName), '/app/settings/profile'],
    ['Add a job search', user.searches?.length > 0, '/app/searches'],
    ['Connect Telegram or WhatsApp', Boolean(user.alerts?.telegram?.chatId || user.alerts?.whatsapp?.optIn), '/app/settings/alerts'],
    ['Save your screening answers', Boolean(user.apply?.answers?.workAuthorization || user.apply?.answers?.noticePeriod), '/app/settings/apply'],
  ];
  const done = checklist.filter((c) => c[1]).length;
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const a = stats?.applications || {};

  return (
    <div>
      <h1 className="text-[28px] font-bold">{greet}, {user.name.split(' ')[0]}</h1>
      <p className="mt-1 text-[15px] text-muted">{stats?.newMatches ? `${stats.newMatches} new matches are waiting for you.` : 'We’re watching for new jobs that fit you.'}</p>

      <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-panel border border-line bg-line lg:grid-cols-5">
        {[
          ['Matches this week', stats?.matchesWeek],
          ['To review', stats?.newMatches],
          ['Saved', stats?.saved],
          ['Applied', (a.applied || 0) + (a.interview || 0) + (a.offer || 0) + (a.rejected || 0)],
          ['Interviews', (a.interview || 0) + (a.offer || 0)],
        ].map(([k, v]) => (
          <div key={k} className="bg-surface px-5 py-4">
            <div className="text-[13px] text-muted">{k}</div>
            {isLoading ? <Skeleton className="mt-2 h-8 w-12" /> : <div className="tnum mt-1 font-display text-[28px] font-bold">{v ?? 0}</div>}
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <section className="panel p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-sans text-[16px] font-semibold">Best new matches</h2>
            <Link to="/app/matches" className="text-[14px] font-semibold text-brand hover:underline">See all</Link>
          </div>
          {top?.items?.length ? (
            <ul className="mt-3 divide-y divide-line">
              {top.items.slice(0, 5).map((m) => (
                <li key={m._id} className="flex items-center gap-3 py-3">
                  <ScoreRing score={m.score} size={40} stroke={4} />
                  <div className="min-w-0 flex-1">
                    <Link to={`/jobs/${m.job.slug}`} className="block truncate text-[15px] font-semibold hover:text-brand">{m.job.title}</Link>
                    <div className="truncate text-[13px] text-muted">{m.job.company} · {m.job.location || 'Not specified'} · {timeAgo(m.createdAt)}</div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="py-10 text-center text-[14px] text-muted"><Target className="mx-auto mb-2 h-6 w-6 text-faint" />No new matches right now. New jobs are checked every few minutes.</div>
          )}
        </section>

        <div className="space-y-6">
          {done < checklist.length && (
            <section className="panel p-5">
              <h2 className="font-sans text-[16px] font-semibold">Finish setting up</h2>
              <p className="text-[13px] text-muted">{done} of {checklist.length} done</p>
              <ul className="mt-3 space-y-1">
                {checklist.map(([label, ok, to]) => (
                  <li key={label}>
                    <Link to={to} className="flex items-center gap-2.5 rounded-ctl px-2 py-2 text-[14px] hover:bg-raised">
                      {ok ? <Check className="h-4 w-4 text-match" /> : <Circle className="h-4 w-4 text-faint" />}
                      <span className={ok ? 'text-muted line-through' : 'font-medium'}>{label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <section className="panel p-5">
            <h2 className="font-sans text-[16px] font-semibold">Matches in the last 14 days</h2>
            <div className="mt-4"><Activity daily={stats?.daily} /></div>
          </section>
          {stats?.usage && (
            <section className="panel space-y-4 p-5">
              <h2 className="font-sans text-[16px] font-semibold">This month's usage</h2>
              <Meter label="AI cover letters" used={stats.usage.coverLetters || 0} limit={stats.usage.limits.coverLetters} />
              {stats.usage.limits.autoApplyPerMonth > 0 && <Meter label="Prepared applications" used={stats.usage.autoApplies || 0} limit={stats.usage.limits.autoApplyPerMonth} />}
              <Meter label="Alerts today" used={stats.usage.alertsToday || 0} limit={Math.min(user.alerts?.maxPerDay || 20, stats.usage.limits.maxAlertsPerDay)} />
            </section>
          )}
          <section className="panel flex gap-4 p-5">
            <Gift className="h-6 w-6 shrink-0 text-brand" />
            <div>
              <h2 className="font-sans text-[15px] font-semibold">Give a week of Pro, get a week</h2>
              <p className="mt-1 text-[13px] text-muted">Friends who join with your link get 7 days of Pro, and so do you.</p>
              <Button to="/app/settings/referrals" variant="soft" size="sm" className="mt-3">Get your invite link</Button>
            </div>
          </section>
        </div>
      </div>
      {!user.searches?.length && (
        <div className="mt-6"><Empty icon={Target} title="Add your first job search" action={<Button to="/app/searches">Add a search</Button>}>Tell us what you're looking for and we'll start matching.</Empty></div>
      )}
    </div>
  );
}
