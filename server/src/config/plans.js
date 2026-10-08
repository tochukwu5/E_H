/**
 * Single source of truth for plans. The client reads these through GET /api/billing/plans,
 * so changing a limit here updates the pricing page too.
 */
export const PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    tagline: 'Try it with one search',
    limits: {
      niches: 1,
      channels: ['email', 'telegram'],
      delivery: 'digest', // daily digest only
      maxAlertsPerDay: 10,
      aiMatchReasons: false,
      coverLetters: 3, // per month
      autoApply: 'off',
      autoApplyPerMonth: 0,
      companyWatchlist: 0,
    },
    features: ['1 job search', 'Daily digest on Telegram or email', 'Match scores', '3 AI cover letters a month', 'Application tracker'],
  },
  basic: {
    id: 'basic',
    name: 'Basic',
    price: 15,
    tagline: 'Instant alerts for an active search',
    limits: {
      niches: 3,
      channels: ['email', 'telegram', 'whatsapp'],
      delivery: 'instant',
      maxAlertsPerDay: 40,
      aiMatchReasons: true,
      coverLetters: 30,
      autoApply: 'off',
      autoApplyPerMonth: 0,
      companyWatchlist: 10,
    },
    features: ['3 job searches', 'Instant alerts on WhatsApp and Telegram', 'AI match reasons', '30 AI cover letters a month', 'Watch 10 companies'],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 29,
    tagline: 'Let the AI prepare your applications',
    popular: true,
    limits: {
      niches: 5,
      channels: ['email', 'telegram', 'whatsapp'],
      delivery: 'instant',
      maxAlertsPerDay: 80,
      aiMatchReasons: true,
      coverLetters: 150,
      autoApply: 'approve',
      autoApplyPerMonth: 100,
      companyWatchlist: 50,
    },
    features: ['5 job searches', 'Everything in Basic', 'Approve-first applications (100/mo)', 'Tailored cover letters and screening answers', 'Watch 50 companies'],
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    price: 49,
    tagline: 'Maximum reach, fully hands-off',
    limits: {
      niches: 20,
      channels: ['email', 'telegram', 'whatsapp'],
      delivery: 'instant',
      maxAlertsPerDay: 200,
      aiMatchReasons: true,
      coverLetters: 500,
      autoApply: 'auto',
      autoApplyPerMonth: 300,
      companyWatchlist: 200,
    },
    features: ['20 job searches', 'Everything in Pro', 'Auto mode (300/mo)', 'Priority checks on new jobs', 'Watch 200 companies'],
  },
};

export const planOf = (user) => PLANS[user?.plan] || PLANS.free;
export const APPLY_MODE_RANK = { off: 0, approve: 1, auto: 2 };
