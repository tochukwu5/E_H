import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const { Schema } = mongoose;

const SearchSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    titles: [{ type: String, trim: true }], // e.g. "Frontend developer"
    keywords: [{ type: String, trim: true }], // must-have skills
    excludeKeywords: [{ type: String, trim: true }],
    jobTypes: [{ type: String, enum: ['full_time', 'part_time', 'contract', 'freelance', 'internship'] }],
    workModes: [{ type: String, enum: ['remote', 'hybrid', 'onsite'] }],
    locations: [{ type: String, trim: true }],
    eligibility: { type: String, enum: ['anywhere', 'my_country'], default: 'anywhere' },
    seniority: [{ type: String, enum: ['intern', 'junior', 'mid', 'senior', 'lead'] }],
    minSalary: { type: Number, default: 0 },
    currency: { type: String, default: 'USD' },
    strictness: { type: Number, min: 0, max: 100, default: 60 }, // min match score
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const UserSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },

    plan: { type: String, enum: ['free', 'basic', 'pro', 'premium'], default: 'free' },
    planRenewsAt: Date,
    trialEndsAt: Date,

    referralCode: { type: String, unique: true, sparse: true },
    referredBy: { type: Schema.Types.ObjectId, ref: 'User' },
    referralCount: { type: Number, default: 0 },

    onboarded: { type: Boolean, default: false },

    profile: {
      headline: String,
      summary: String,
      country: String,
      city: String,
      timezone: { type: String, default: 'UTC' },
      experienceLevel: { type: String, enum: ['intern', 'junior', 'mid', 'senior', 'lead'], default: 'mid' },
      yearsExperience: Number,
      skills: [String],
      phone: String,
      links: { portfolio: String, github: String, linkedin: String, website: String },
      resume: { fileName: String, text: { type: String, select: false }, path: String, uploadedAt: Date },
    },

    searches: [SearchSchema],
    watchlist: [{ type: String, trim: true }], // company names to always alert on
    blockedCompanies: [{ type: String, trim: true }],

    alerts: {
      email: { enabled: { type: Boolean, default: true } },
      telegram: { enabled: { type: Boolean, default: false }, chatId: String, linkCode: String, username: String },
      whatsapp: { enabled: { type: Boolean, default: false }, phone: String, optIn: { type: Boolean, default: false } },
      delivery: { type: String, enum: ['instant', 'digest'], default: 'instant' },
      digestHour: { type: Number, min: 0, max: 23, default: 8 },
      quietHours: { enabled: { type: Boolean, default: true }, start: { type: Number, default: 22 }, end: { type: Number, default: 7 } },
      maxPerDay: { type: Number, default: 20 },
    },

    apply: {
      mode: { type: String, enum: ['off', 'approve', 'auto'], default: 'off' },
      dailyLimit: { type: Number, default: 10 },
      minScore: { type: Number, default: 75 },
      tone: { type: String, enum: ['professional', 'friendly', 'confident', 'concise'], default: 'professional' },
      length: { type: String, enum: ['short', 'medium', 'long'], default: 'short' },
      answers: {
        workAuthorization: String,
        needsSponsorship: { type: Boolean, default: false },
        noticePeriod: String,
        salaryExpectation: String,
        willingToRelocate: { type: Boolean, default: false },
      },
    },

    usage: {
      month: String, // "2026-10"
      coverLetters: { type: Number, default: 0 },
      autoApplies: { type: Number, default: 0 },
      day: String, // "2026-10-03"
      alertsToday: { type: Number, default: 0 },
      appliesToday: { type: Number, default: 0 },
    },

    resetToken: { type: String, select: false },
    resetExpires: { type: Date, select: false },
    lastLoginAt: Date,
    lastDigestAt: Date,
  },
  { timestamps: true }
);

UserSchema.methods.setPassword = async function (pw) {
  this.passwordHash = await bcrypt.hash(pw, 12);
};
UserSchema.methods.checkPassword = function (pw) {
  return bcrypt.compare(pw, this.passwordHash);
};

/** Roll monthly/daily usage counters over when the period changes. */
UserSchema.methods.rollUsage = function () {
  const now = new Date();
  const month = now.toISOString().slice(0, 7);
  const day = now.toISOString().slice(0, 10);
  if (this.usage.month !== month) Object.assign(this.usage, { month, coverLetters: 0, autoApplies: 0 });
  if (this.usage.day !== day) Object.assign(this.usage, { day, alertsToday: 0, appliesToday: 0 });
};

UserSchema.pre('save', function (next) {
  if (!this.referralCode) this.referralCode = crypto.randomBytes(4).toString('hex');
  if (!this.alerts?.telegram?.linkCode) this.set('alerts.telegram.linkCode', crypto.randomBytes(6).toString('hex'));
  next();
});

UserSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.passwordHash;
    delete ret.resetToken;
    delete ret.resetExpires;
    delete ret.__v;
    if (ret.profile?.resume) delete ret.profile.resume.text;
    return ret;
  },
});

export default mongoose.model('User', UserSchema);
