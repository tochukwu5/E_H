import mongoose from 'mongoose';

const { Schema } = mongoose;

const JobSchema = new Schema(
  {
    source: { type: String, required: true, index: true }, // e.g. "greenhouse", "remotive"
    sourceName: String,
    externalKey: { type: String, required: true, unique: true }, // `${source}:${sourceId}`
    dedupeKey: { type: String, index: true }, // same job seen on several sources
    slug: { type: String, required: true, unique: true },

    title: { type: String, required: true },
    company: { type: String, default: 'Unknown company' },
    companyKey: { type: String, index: true },
    companyLogo: String,

    location: String,
    country: String,
    remote: { type: Boolean, default: false, index: true },
    workMode: { type: String, enum: ['remote', 'hybrid', 'onsite', 'unknown'], default: 'unknown' },
    eligibility: [{ type: String }], // "worldwide", "africa", "europe", "us", "uk", country codes…
    jobType: { type: String, enum: ['full_time', 'part_time', 'contract', 'freelance', 'internship', 'unknown'], default: 'unknown' },
    seniority: { type: String, enum: ['intern', 'junior', 'mid', 'senior', 'lead', 'unknown'], default: 'unknown' },

    salaryMin: Number,
    salaryMax: Number,
    salaryCurrency: String,
    salaryPeriod: { type: String, enum: ['year', 'month', 'hour', 'project', 'unknown'], default: 'unknown' },

    category: String,
    tags: [String],
    skills: [String],
    description: String,
    excerpt: String,

    url: { type: String, required: true },
    applyUrl: String,
    ats: String, // which ATS hosts the application form

    postedAt: { type: Date, index: true },
    firstSeenAt: { type: Date, default: Date.now, index: true },
    lastSeenAt: { type: Date, default: Date.now },
    active: { type: Boolean, default: true, index: true },

    flags: [{ type: String }], // "possible_scam", "thin_description", "stale", "duplicate"
    quality: { type: Number, default: 50 },
    isDuplicate: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

JobSchema.index({ title: 'text', company: 'text', tags: 'text', description: 'text' }, { weights: { title: 10, company: 5, tags: 4, description: 1 } });
JobSchema.index({ active: 1, isDuplicate: 1, postedAt: -1 });

export default mongoose.model('Job', JobSchema);
