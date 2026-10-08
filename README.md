# EmployHunt

Job alerts on WhatsApp and Telegram, minutes after a job is posted, with AI-prepared applications.
MERN stack: **MongoDB, Express, React (Vite + Tailwind), Node.js**.

Jobs come **only from green sources**: official, public job feeds and official keyed APIs. No LinkedIn, Indeed, Glassdoor, Upwork or SmartRecruiters.

---

## Run it locally (step by step)

**You need:** Node.js 20+, and MongoDB (local install or a free MongoDB Atlas cluster).

1. **Install packages**
   ```bash
   cd server && npm install
   cd ../client && npm install
   ```
2. **Configure the server**
   ```bash
   cd ../server
   cp .env.example .env
   ```
   Open `.env` and set at least `MONGO_URI` and `JWT_SECRET`. Everything else is optional.
3. **Create the admin account and starter company list**
   ```bash
   npm run seed
   ```
4. **Start the API** (port 5000). It fetches jobs 10 seconds after boot, then every 15 minutes.
   ```bash
   npm run dev
   ```
5. **Start the website** in a second terminal (port 5173)
   ```bash
   cd client && npm run dev
   ```
6. Open http://localhost:5173. Sign in with the admin email and password from `.env` to see **Admin → Sources** and **Admin → Companies**.

Test one source without waiting: `npm run fetch:once remotive` (inside `server/`).

---

## What's in the box

**Public site**
- Landing page, live job browser with filters, SEO job pages (with JobPosting structured data and `/sitemap.xml`)
- Pricing page with a plan comparison table
- Free ATS resume checker (lead magnet)
- "Where jobs come from" transparency page
- Light/dark theme toggle in the navbar (remembers the choice, follows the system by default)

**For users**
- Sign up, sign in, forgot/reset password, invite links (both people get 7 days of Pro)
- 4-step onboarding: resume upload (auto-fills skills, level, links) → profile → first search (with presets) → alerts
- Job searches ("niches"): titles, must-have skills, words to avoid, work mode, job type, level, salary floor, locations, "only jobs open to my country", match strictness
- Matches feed with a 0–100 score, reasons, skill gaps, AI reason (paid plans), save / skip / draft
- Applications tracker (board view): AI cover letter + screening answers, edit, regenerate, copy-and-open, mark applied, notes, follow-up reminder after 6 days, add outside applications, CSV export
- Settings: profile and resume, alerts (Telegram connect, WhatsApp, email, instant vs digest, digest time, quiet hours, daily cap, test buttons), application mode (alerts only / approve first / auto), cover letter tone and length, saved screening answers, company watchlist and block list, plan and billing, invite friends, change password, download my data, delete account
- In-app notifications bell

**For you (admin)**
- Overview: users, plan mix, monthly revenue, jobs and matches today
- Sources health: runs, failures, last error, new jobs, "run now" per source
- Companies: add ATS boards one by one or bulk-paste board URLs, pause/delete, see errors
- Users: change plan or role

**Background work (`server/src/services`)**
- `fetcher.js` pulls every enabled source, normalises jobs, removes cross-source duplicates, closes jobs not seen for 10 days
- `normalize.js` infers remote/hybrid/on-site, country eligibility, job type, level, salary, skills, and flags scams, thin posts and stale posts
- `matcher.js` scores new jobs per user and search, then hands matches to alerts and the apply engine
- `notifier.js` instant alerts (Telegram inline buttons: Open, Save, Skip, Draft; WhatsApp template), daily digests, quiet hours, per-day caps
- `applyEngine.js` approve-first drafts and auto mode, with daily and monthly limits
- `scheduler.js` cron: fetch, digests, follow-up reminders, plan expiry

---

## Sources

| Group | Sources | Key needed |
|---|---|---|
| Company career pages | Greenhouse, Lever, Ashby, Recruitee, Personio, Teamtailor | No. Add companies in Admin → Companies |
| Remote job boards | Remotive, RemoteOK, Himalayas, Jobicy, Arbeitnow, We Work Remotely, Working Nomads | No |
| | Findwork, The Muse | Free key |
| Job search engines | Adzuna, Jooble, Careerjet, Reed | Free key |
| Government | USAJobs, France Travail, NAV (Norway) | Free key |
| | JobTech (Sweden), Bundesagentur für Arbeit (Germany) | No |
| Freelance and community | Hacker News "Who is hiring", Freelancer.com | No |
| | Reddit | Off by default (commercial use needs a paid agreement) |

Sources without a key are skipped automatically and shown as "Needs setup". Job Bank Canada is listed as planned (it publishes files, not a live API).

**Before launch:** read each source's terms. Most remote boards ask you to credit them and link back. The UI already shows "via {source}" on every job and links to the original posting. API response shapes change over time, so watch Admin → Sources for failures.

**Growing the company list is your moat.** The more Greenhouse/Lever/Ashby boards you track, the earlier you see jobs. Use bulk add with board URLs.

---

## Turning on the optional parts

- **AI (cover letters, match reasons):** set `ANTHROPIC_API_KEY`. Without it, a decent template is used.
- **Telegram:** create a bot with @BotFather, set `TELEGRAM_BOT_TOKEN` and `TELEGRAM_BOT_USERNAME`. Local dev uses polling. In production set `TELEGRAM_POLLING=false` and register the webhook:
  `https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://your-api.com/api/telegram/webhook&secret_token=<TELEGRAM_WEBHOOK_SECRET>`
- **WhatsApp:** set up the WhatsApp Cloud API in Meta Business, then set `WHATSAPP_TOKEN` and `WHATSAPP_PHONE_NUMBER_ID`. Create an approved template named `job_alert` with 5 body variables: title, company, location, score, link. Meta charges per message, so price plans with that in mind.
- **Email:** set the `SMTP_*` values (Resend, Brevo, Mailgun, etc.). Without them, emails are printed to the server console.

---

## Things to know before going live

1. **Payments are mocked.** `server/src/routes/billing.js` switches plans instantly. Replace it with Paystack, Flutterwave, Stripe or USDC (Paragon) checkout and upgrade users from the provider's webhook.
2. **Auto-submit needs partnerships.** The green sources are read-only feeds. EmployHunt prepares the full application and the user submits with one tap. When you get employer or ATS partner access, add a submitter in `SUBMITTERS` inside `applyEngine.js` and auto mode will submit directly.
3. **Scale.** Matching loops over users × new jobs, which is fine for the first few thousand users. After that, move matching to a queue (BullMQ + Redis) and run `npm run worker` as its own process (`RUN_SCHEDULER=false` on the API).
4. **Legal pages** (`client/src/pages/Legal.jsx`) are starter templates. Have them reviewed.
5. **Resumes** are stored in `server/uploads/resumes`. In production use object storage (S3, Cloudflare R2) and back it up.

## Deploy

- **Simple:** build the client (`cd client && npm run build`), set `NODE_ENV=production` on the server and it serves `client/dist` from the same domain. One service on Render, Railway or a VPS.
- **Split:** host `client/dist` on Vercel/Netlify with `VITE_API_URL=https://your-api.com/api`, and set `CLIENT_URL` on the server to the site's URL (cookies are set `SameSite=None; Secure` in production).

## Project layout

```
server/
  src/config        env, database, plans (prices and limits in one place)
  src/models        User, Job, Match, Application, Company, SourceRun, Notification
  src/sources       one adapter per green source
  src/services      fetcher, normalize, matcher, notifier, applyEngine, ai, resume, scheduler, telegramBot
  src/channels      telegram, whatsapp, email
  src/routes        auth, me, matches, applications, public, billing, admin
client/
  src/pages         public pages, app/ (dashboard), admin/
  src/components    layout (navbar, theme toggle, sidebar), ui kit, JobCard, SearchForm, PlanGrid
```
