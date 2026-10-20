import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Upload, SlidersHorizontal, BellRing, MousePointerClick, Globe2, Ban, Eye, Moon, Gauge, Filter, PenLine, CalendarClock, Check, MessageCircle, Send, Briefcase, FileText, Code2, MapPin, BadgeCheck, Building2, Laptop } from 'lucide-react';
import { get } from '../lib/api';
import { Button, ScoreRing, Badge } from '../components/ui';
import PlanGrid from '../components/PlanGrid';

const SAMPLE_ALERTS = [
  { title: 'Frontend Engineer, Payments', company: 'Ledgerline', place: 'Remote · Worldwide', score: 92, why: 'Uses React, TypeScript and Node. Senior level matches yours.', ago: '4 min after posting' },
  { title: 'Full-stack Developer (MERN)', company: 'Northwind Health', place: 'Remote · EMEA', score: 84, why: 'Title matches "Full stack developer". Missing: Docker.', ago: '11 min after posting' },
  { title: 'Website rebuild, Next.js', company: 'Freelance client', place: 'Remote · $2,000 project', score: 78, why: 'Freelance gig that fits your Next.js work.', ago: '19 min after posting' },
  { title: 'Product Designer, Mobile', company: 'Brightpath', place: 'Remote · US', score: 88, why: 'Figma and design systems match. Salary above your floor.', ago: '2 min after posting' },
  { title: 'Backend Engineer, Go', company: 'Cloudmesa', place: 'Berlin · Hybrid', score: 81, why: 'Go and Postgres match. Visa sponsorship offered.', ago: '7 min after posting' },
  { title: 'Data Analyst', company: 'Harbor Retail', place: 'Remote · UK', score: 86, why: 'SQL and Python match. Mid level matches yours.', ago: '9 min after posting' },
];

function AlertBubble({ a, delay = 0 }) {
  return (
    <div className="arrive rounded-[14px] rounded-tl-[4px] border border-line bg-surface p-3.5 shadow-panel" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex gap-3">
        <ScoreRing score={a.score} size={44} stroke={4} />
        <div className="min-w-0">
          <div className="text-[14px] font-semibold leading-snug">{a.title}</div>
          <div className="text-[13px] text-muted">{a.company} · {a.place}</div>
        </div>
      </div>
      <p className="mt-2.5 text-[13px] italic text-muted">{a.why}</p>
      <div className="mt-3 grid grid-cols-3 gap-1.5 text-center text-[12px] font-semibold">
        <span className="col-span-3 rounded-[8px] bg-brand-soft py-1.5 text-brand">Open and apply</span>
        <span className="rounded-[8px] bg-raised py-1.5">Save</span>
        <span className="rounded-[8px] bg-raised py-1.5">Skip</span>
        <span className="rounded-[8px] bg-raised py-1.5">Draft</span>
      </div>
      <div className="mt-2 text-right text-[11px] text-faint">{a.ago}</div>
    </div>
  );
}

/** A new example alert slides in at the top every few seconds, like a live Telegram chat. */
function LiveFeed() {
  const [items, setItems] = useState(() => SAMPLE_ALERTS.slice(0, 3).map((a, i) => ({ a, key: i })));
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;
    let next = 3;
    const id = setInterval(() => {
      if (document.hidden) return;
      const k = next++;
      setItems((cur) => [{ a: SAMPLE_ALERTS[k % SAMPLE_ALERTS.length], key: k }, ...cur].slice(0, 3));
    }, 4200);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="feed-fade h-[520px] space-y-3 overflow-hidden px-1 pb-2 pt-4">
      {items.map(({ a, key }) => <AlertBubble key={key} a={a} delay={key < 3 ? 400 + key * 600 : 0} />)}
    </div>
  );
}

/** Job-themed icons floating softly behind the hero. Purely decorative. */
const FLOATERS = [
  [Briefcase, 'left-[2%] top-[8%]', 0, 7],
  [FileText, 'left-[38%] top-[1%]', 1.2, 8],
  [Code2, 'left-[52%] top-[34%]', 2.4, 9],
  [MapPin, 'left-[44%] bottom-[12%]', 0.6, 7.5],
  [BadgeCheck, 'left-[6%] bottom-[4%]', 1.8, 8.5],
  [Building2, 'right-[2%] top-[4%]', 3, 9.5],
  [Laptop, 'right-[4%] bottom-[8%]', 1.4, 8],
];

function HeroBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="hero-grid absolute inset-0" />
      <div className="absolute right-[8%] top-1/2 h-[520px] w-[520px] -translate-y-1/2 rounded-full bg-brand/10 blur-3xl" />
      {FLOATERS.map(([Icon, pos, delay, dur], i) => (
        <span key={i} className={`floater absolute hidden h-11 w-11 place-items-center rounded-[12px] border border-line bg-surface/70 shadow-panel lg:grid ${pos}`} style={{ animationDelay: `${delay}s`, animationDuration: `${dur}s` }}>
          <Icon className="h-5 w-5 text-brand/70" />
        </span>
      ))}
    </div>
  );
}

function Hero() {
  const { data: stats } = useQuery({ queryKey: ['job-stats'], queryFn: () => get('/jobs/stats') });
  return (
    <section className="relative isolate">
      <HeroBackdrop />
      <div className="page grid gap-12 pb-20 pt-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-start lg:pt-12">
        <div className="lg:pt-10">
          {stats?.today > 0 && (
            <Link to="/jobs?posted=24" className="arrive mb-6 inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-[13px] font-semibold text-muted hover:text-ink">
              <span className="live-dot h-2 w-2 rounded-full bg-match" />
              <span className="tnum">{stats.today.toLocaleString()}</span> new jobs found in the last 24 hours
            </Link>
          )}
          <h1 className="arrive max-w-[14ch] text-[44px] font-bold leading-[1.02] sm:text-[60px] lg:text-[68px]" style={{ animationDelay: '80ms' }}>
            Hear about the job before the <span className="hero-shine">crowd</span> does.
          </h1>
          <p className="arrive mt-6 max-w-[54ch] text-[18px] leading-8 text-muted" style={{ animationDelay: '180ms' }}>
            EmployHunt checks company career pages and trusted job boards every few minutes, scores each new job against your resume, and sends the good ones to Telegram or email, with WhatsApp coming soon. On Pro, it drafts your application too.
          </p>
          <div className="arrive mt-8 flex flex-wrap gap-3" style={{ animationDelay: '280ms' }}>
            <Button to="/register" size="lg">Start free</Button>
            <Button to="/jobs" size="lg" variant="secondary">Browse live jobs</Button>
          </div>
          <ul className="arrive mt-8 flex flex-wrap gap-x-6 gap-y-2 text-[14px] text-muted" style={{ animationDelay: '380ms' }}>
            {['No credit card for Free', 'Full-time jobs and freelance gigs', 'Works from any country'].map((t) => (
              <li key={t} className="flex items-center gap-2"><Check className="h-4 w-4 text-match" />{t}</li>
            ))}
          </ul>
        </div>

        <div className="relative mx-auto w-full max-w-[400px]">
          <span aria-hidden="true" className="radar-ring absolute left-1/2 top-1/2 -z-10 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-brand/30" />
          <span aria-hidden="true" className="radar-ring absolute left-1/2 top-1/2 -z-10 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-brand/30" style={{ animationDelay: '1.5s' }} />
          <div className="rounded-[28px] border border-line bg-raised p-3 shadow-pop">
            <div className="flex items-center gap-3 rounded-[18px] bg-surface px-4 py-3">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-brand text-brand-ink"><Send className="h-4 w-4" /></span>
              <div>
                <div className="text-[14px] font-semibold">EmployHunt</div>
                <div className="flex items-center gap-1.5 text-[12px] text-match"><span className="live-dot h-1.5 w-1.5 rounded-full bg-match" />watching 6 job searches</div>
              </div>
            </div>
            <LiveFeed />
          </div>
          <p className="mt-3 text-center text-[12px] text-faint">Example alerts. Yours are matched to your own resume.</p>
        </div>
      </div>
    </section>
  );
}

const SOURCE_NAMES = ['Greenhouse', 'Lever', 'Ashby', 'Recruitee', 'Personio', 'Teamtailor', 'Remotive', 'RemoteOK', 'Himalayas', 'Jobicy', 'We Work Remotely', 'Arbeitnow', 'Adzuna', 'Jooble', 'Reed', 'USAJobs', 'Hacker News', 'Freelancer.com'];

function SourcesStrip() {
  return (
    <section className="border-y border-line bg-surface">
      <div className="page flex flex-col gap-4 py-7 lg:flex-row lg:items-center lg:gap-10">
        <p className="shrink-0 text-[14px] font-semibold">Jobs come straight from official feeds</p>
        <p className="text-[14px] leading-7 text-muted">
          {SOURCE_NAMES.join('  /  ')} <Link to="/sources" className="ml-1 font-semibold text-brand hover:underline">and more</Link>
        </p>
      </div>
    </section>
  );
}

const STEPS = [
  [Upload, 'Upload your resume', 'We read your skills, experience and links, so setup takes about two minutes.'],
  [SlidersHorizontal, 'Say what you want', 'Job titles, remote or on-site, full-time or freelance, salary floor, and where you can work from.'],
  [BellRing, 'Get matches on your phone', 'New jobs are checked every few minutes. Only the ones that clear your match score reach you.'],
  [MousePointerClick, 'Apply with one tap', 'Open the job, or let the AI draft a tailored cover letter and screening answers for you to review.'],
];

function HowItWorks() {
  return (
    <section className="page py-24">
      <h2 className="max-w-[20ch] text-[36px] font-bold sm:text-[44px]">From posting to your phone in minutes</h2>
      <ol className="mt-12 grid gap-px overflow-hidden rounded-panel border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map(([Icon, t, d], i) => (
          <li key={t} className="bg-surface p-6">
            <div className="flex items-center justify-between">
              <Icon className="h-6 w-6 text-brand" />
              <span className="tnum font-display text-[15px] font-semibold text-faint">Step {i + 1}</span>
            </div>
            <h3 className="mt-6 font-sans text-[17px] font-semibold">{t}</h3>
            <p className="mt-2 text-[14px] leading-6 text-muted">{d}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function ScoreExplainer() {
  const rows = [
    ['Job title', 41, 45],
    ['Your skills', 28, 35],
    ['Seniority', 10, 10],
    ['Freshness and quality', 8, 10],
  ];
  return (
    <section className="page grid items-center gap-12 py-16 lg:grid-cols-2">
      <div>
        <h2 className="text-[34px] font-bold sm:text-[40px]">A match score you can actually read</h2>
        <p className="mt-4 max-w-[52ch] text-[17px] leading-8 text-muted">
          Every job gets a score out of 100 with plain reasons and the skills you're missing. Set how strict it is per search, so a niche search can be picky while a broad one stays open.
        </p>
        <ul className="mt-6 space-y-3 text-[15px]">
          <li className="flex gap-3"><Filter className="mt-0.5 h-5 w-5 shrink-0 text-brand" />Hard filters first: excluded words, blocked companies, job type, work mode, salary floor.</li>
          <li className="flex gap-3"><Ban className="mt-0.5 h-5 w-5 shrink-0 text-brand" />Posts that look like scams, or ask for fees, never reach you.</li>
          <li className="flex gap-3"><Eye className="mt-0.5 h-5 w-5 shrink-0 text-brand" />The same job on three boards shows up once.</li>
        </ul>
      </div>
      <div className="panel p-6 shadow-panel">
        <div className="flex items-start gap-4">
          <ScoreRing score={87} size={72} stroke={6} />
          <div>
            <div className="text-[17px] font-semibold">Senior React Developer</div>
            <div className="text-[14px] text-muted">Ledgerline · Remote, worldwide</div>
            <div className="mt-2 flex flex-wrap gap-1.5"><Badge tone="brand">Remote</Badge><Badge tone="match" icon={Globe2}>Open worldwide</Badge></div>
          </div>
        </div>
        <dl className="mt-6 space-y-3.5">
          {rows.map(([k, v, max]) => (
            <div key={k}>
              <div className="flex justify-between text-[14px]"><dt className="text-muted">{k}</dt><dd className="tnum font-semibold">{v} / {max}</dd></div>
              <div className="mt-1.5 h-2 rounded-full bg-raised"><div className="h-2 rounded-full bg-brand" style={{ width: `${(v / max) * 100}%` }} /></div>
            </div>
          ))}
        </dl>
        <div className="mt-6 rounded-ctl bg-raised p-3.5 text-[14px]">
          <span className="font-semibold">Missing:</span> <span className="text-muted">GraphQL, Docker. Mention them if you have them.</span>
        </div>
      </div>
    </section>
  );
}

function Eligibility() {
  return (
    <section className="page py-16">
      <div className="grid gap-10 rounded-panel border border-line bg-surface p-8 sm:p-12 lg:grid-cols-[1fr_1.1fr] lg:items-center">
        <div>
          <Globe2 className="h-8 w-8 text-match" />
          <h2 className="mt-5 text-[32px] font-bold sm:text-[38px]">Only jobs you can apply to from where you live</h2>
          <p className="mt-4 max-w-[50ch] text-[17px] leading-8 text-muted">
            "Remote" often means "remote, US only". EmployHunt reads each listing's location rules and, if you ask it to, hides jobs that aren't open to your country.
          </p>
        </div>
        <ul className="space-y-2.5">
          {[
            ['Remote, open worldwide', true],
            ['Remote, Europe and Africa time zones', true],
            ['Remote, must be based in the US', false],
            ['Hybrid, London office 3 days a week', false],
          ].map(([t, ok]) => (
            <li key={t} className="flex items-center justify-between rounded-ctl border border-line bg-canvas px-4 py-3 text-[15px]">
              {t}
              {ok ? <Badge tone="match">Sent to you</Badge> : <Badge>Hidden</Badge>}
            </li>
          ))}
          <li className="pt-1 text-[13px] text-faint">Example for someone in Lagos with "only jobs open to my country" turned on.</li>
        </ul>
      </div>
    </section>
  );
}

function Prepared() {
  return (
    <section className="page grid items-center gap-12 py-16 lg:grid-cols-[1.1fr_1fr]">
      <div className="panel order-2 p-6 shadow-panel lg:order-1">
        <div className="flex items-center justify-between">
          <div className="text-[15px] font-semibold">Draft application</div>
          <Badge tone="brand">Ready to review</Badge>
        </div>
        <div className="mt-4 rounded-ctl border border-line bg-canvas p-4 text-[14px] leading-7 text-ink/90">
          Hi Ledgerline team, your note about rebuilding checkout so it works on slow mobile networks caught my eye. I spent the last two years on exactly that for a remittance app: cutting page weight, moving payments to a queued flow, and keeping it fast on 3G…
        </div>
        <div className="mt-4 grid gap-2 text-[14px] sm:grid-cols-2">
          {[['Years of React', '4'], ['Visa sponsorship', 'Not needed'], ['Start date', '2 weeks'], ['Portfolio', 'yoursite.dev']].map(([q, a]) => (
            <div key={q} className="rounded-ctl bg-raised px-3 py-2"><div className="text-[12px] text-muted">{q}</div><div className="font-semibold">{a}</div></div>
          ))}
        </div>
      </div>
      <div className="order-1 lg:order-2">
        <h2 className="text-[34px] font-bold sm:text-[40px]">Applications prepared, you stay in control</h2>
        <p className="mt-4 max-w-[50ch] text-[17px] leading-8 text-muted">
          On Pro, strong matches arrive with a cover letter written from your real experience and answers to the usual screening questions. Read it, tweak it, then open the job and submit.
        </p>
        <ul className="mt-6 space-y-3 text-[15px]">
          <li className="flex gap-3"><PenLine className="mt-0.5 h-5 w-5 shrink-0 text-brand" />Choose the tone and length. Freelance gigs get a proposal, not a cover letter.</li>
          <li className="flex gap-3"><Gauge className="mt-0.5 h-5 w-5 shrink-0 text-brand" />Set a minimum score and a daily limit so you never spam a company.</li>
          <li className="flex gap-3"><CalendarClock className="mt-0.5 h-5 w-5 shrink-0 text-brand" />Track every application and get a nudge to follow up after six days.</li>
        </ul>
      </div>
    </section>
  );
}

const CONTROLS = [
  [SlidersHorizontal, 'Match strictness', 'Per search, from "show me more" to "only near-perfect".'],
  [Moon, 'Quiet hours', 'No alerts while you sleep. They wait for the morning digest.'],
  [BellRing, 'Instant or daily digest', 'Pick per channel. Cap how many alerts you get a day.'],
  [MessageCircle, 'Telegram or email', 'Use one or both. WhatsApp is coming soon.'],
  [Ban, 'Block companies and words', 'Never see a company again, or anything that says "unpaid".'],
  [Eye, 'Company watchlist', 'Always hear when a company you love posts anything.'],
  [Globe2, 'Country eligibility', 'Only jobs open to where you live.'],
  [PenLine, 'Cover letter style', 'Tone, length and your saved screening answers.'],
];

function Controls() {
  return (
    <section className="page py-20">
      <h2 className="max-w-[22ch] text-[34px] font-bold sm:text-[40px]">Set it up the way you job hunt</h2>
      <p className="mt-3 max-w-[56ch] text-[17px] text-muted">Start with a ready-made search like "Remote React developer" or "Fresh graduate", then adjust anything.</p>
      <dl className="mt-10 grid gap-x-10 gap-y-7 sm:grid-cols-2 lg:grid-cols-4">
        {CONTROLS.map(([Icon, t, d]) => (
          <div key={t}>
            <dt className="flex items-center gap-2.5 text-[15px] font-semibold"><Icon className="h-[18px] w-[18px] text-brand" />{t}</dt>
            <dd className="mt-1.5 text-[14px] leading-6 text-muted">{d}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

const FAQ = [
  ['Where do the jobs come from?', 'Only from official, public feeds: company career pages on Greenhouse, Lever, Ashby, Recruitee, Personio and Teamtailor, remote job boards with public APIs, licensed job search engines, government job services, and Hacker News and Freelancer.com for gigs. We don’t scrape LinkedIn or Indeed. Every job links back to the original posting.'],
  ['How fast are alerts?', 'Paid plans check sources every few minutes and send matches straight away. The Free plan sends one digest a day.'],
  ['Does it apply for me automatically?', 'On Pro, EmployHunt prepares each application: a tailored cover letter, screening answers and the exact apply link. You review it and submit with one tap. Premium adds auto mode, which prepares applications without asking first and submits directly wherever an employer integration allows it.'],
  ['Can I use it from Nigeria or anywhere else?', 'Yes. Set your country and turn on "only jobs open to my country" to hide listings that are limited to other regions.'],
  ['Is it for freelancers too?', 'Yes. Choose "Freelance" or "Contract" in a search to get gigs, and the AI writes proposals instead of cover letters.'],
  ['Can I cancel any time?', 'Yes. Switch to Free whenever you like and keep your tracker and history.'],
];

export default function Home() {
  return (
    <>
      <Hero />
      <SourcesStrip />
      <HowItWorks />
      <ScoreExplainer />
      <Eligibility />
      <Prepared />
      <Controls />
      <section className="page py-16" id="pricing">
        <div className="mb-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <h2 className="text-[34px] font-bold sm:text-[40px]">Simple monthly plans</h2>
          <Link to="/pricing" className="text-[15px] font-semibold text-brand hover:underline">Compare plans in detail</Link>
        </div>
        <PlanGrid ctaFor={(p) => <Button to={`/register?plan=${p.id}`} className="w-full" variant={p.popular ? 'primary' : 'secondary'}>{p.price ? `Start with ${p.name}` : 'Start free'}</Button>} />
      </section>
      <section className="page py-16">
        <h2 className="text-[34px] font-bold sm:text-[40px]">Questions</h2>
        <div className="mt-8 divide-y divide-line rounded-panel border border-line bg-surface">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group px-6 py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[16px] font-semibold">
                {q}
                <span className="text-[22px] font-normal text-faint transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 max-w-[70ch] text-[15px] leading-7 text-muted">{a}</p>
            </details>
          ))}
        </div>
      </section>
      <section className="page pt-10">
        <div className="rounded-panel bg-brand px-8 py-14 text-center text-brand-ink sm:px-14">
          <h2 className="mx-auto max-w-[20ch] text-[34px] font-bold text-brand-ink sm:text-[42px]">Your next job is probably being posted right now</h2>
          <p className="mx-auto mt-4 max-w-[48ch] text-[17px] opacity-85">Set up your first search in two minutes. Free forever, upgrade when you want speed.</p>
          <Link to="/register" className="mt-8 inline-flex h-12 items-center rounded-ctl bg-surface px-6 text-[15px] font-semibold text-ink hover:bg-raised">Create your free account</Link>
        </div>
      </section>
    </>
  );
}