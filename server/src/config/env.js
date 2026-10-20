import 'dotenv/config';

const bool = (v, d = false) => (v === undefined || v === '' ? d : String(v).toLowerCase() === 'true');
const list = (v, d = []) => (v ? v.split(',').map((s) => s.trim()).filter(Boolean) : d);

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',
  port: Number(process.env.PORT || 5000),
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/employhunt',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  siteUrl: process.env.PUBLIC_SITE_URL || process.env.CLIENT_URL || 'http://localhost:5173',
  adminEmail: process.env.ADMIN_EMAIL,
  adminPassword: process.env.ADMIN_PASSWORD,

  fetchCron: process.env.FETCH_CRON || '*/15 * * * *',
  jobMaxAgeDays: Number(process.env.JOB_MAX_AGE_DAYS || 7), // jobs older than this are deleted
  // Hard cap on stored jobs so the free 512 MB database never fills up. Oldest go first.
  jobMaxCount: Number(process.env.JOB_MAX_COUNT || 15000),
  // If the database grows past this many MB, clean up before fetching more jobs.
  dbSoftLimitMB: Number(process.env.DB_SOFT_LIMIT_MB || 380),
  runScheduler: bool(process.env.RUN_SCHEDULER, true),
  contactEmail: process.env.CONTACT_EMAIL || 'hello@employhunt.app',
  defaultKeywords: list(process.env.DEFAULT_KEYWORDS, ['developer', 'engineer', 'designer', 'marketing']),

  keys: {
    themuse: process.env.THEMUSE_API_KEY,
    findwork: process.env.FINDWORK_API_KEY,
    adzunaId: process.env.ADZUNA_APP_ID,
    adzunaKey: process.env.ADZUNA_APP_KEY,
    adzunaCountries: list(process.env.ADZUNA_COUNTRIES, ['gb', 'us']),
    jooble: process.env.JOOBLE_API_KEY,
    careerjet: process.env.CAREERJET_AFFID,
    reed: process.env.REED_API_KEY,
    usajobs: process.env.USAJOBS_API_KEY,
    franceId: process.env.FRANCETRAVAIL_CLIENT_ID,
    franceSecret: process.env.FRANCETRAVAIL_CLIENT_SECRET,
    navToken: process.env.NAV_FEED_TOKEN,
    redditId: process.env.REDDIT_CLIENT_ID,
    redditSecret: process.env.REDDIT_CLIENT_SECRET,
    redditEnabled: bool(process.env.REDDIT_ENABLED, false),
  },

  anthropicKey: process.env.ANTHROPIC_API_KEY,
  anthropicModel: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5',

  telegram: {
    token: process.env.TELEGRAM_BOT_TOKEN,
    username: process.env.TELEGRAM_BOT_USERNAME || 'EmployHuntBot',
    polling: bool(process.env.TELEGRAM_POLLING, true),
    webhookSecret: process.env.TELEGRAM_WEBHOOK_SECRET || '',
  },
  whatsapp: {
    token: process.env.WHATSAPP_TOKEN,
    phoneId: process.env.WHATSAPP_PHONE_NUMBER_ID,
    template: process.env.WHATSAPP_TEMPLATE_NAME || 'job_alert',
    lang: process.env.WHATSAPP_TEMPLATE_LANG || 'en',
  },
  paystack: {
    secret: process.env.PAYSTACK_SECRET_KEY,
    // USD needs international payments + a USD payout account switched on in Paystack.
    // Until then you can set PAYSTACK_CURRENCY=NGN: prices still show in dollars and the card is charged the naira equivalent.
    currency: (process.env.PAYSTACK_CURRENCY || 'USD').toUpperCase(),
    ngnPerUsd: Number(process.env.USD_TO_NGN || 1500),
  },
  smtp: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.EMAIL_FROM || 'EmployHunt <no-reply@employhunt.app>',
  },
};