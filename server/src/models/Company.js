import mongoose from 'mongoose';

const { Schema } = mongoose;

/** A company career board on one of the green ATS platforms. This list is EmployHunt's moat. */
const CompanySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    ats: { type: String, required: true, enum: ['greenhouse', 'lever', 'ashby', 'recruitee', 'personio', 'teamtailor'] },
    slug: { type: String, required: true, trim: true },
    website: String,
    active: { type: Boolean, default: true },
    lastFetchedAt: Date,
    lastError: String,
    jobCount: { type: Number, default: 0 },
    failures: { type: Number, default: 0 },
  },
  { timestamps: true }
);

CompanySchema.index({ ats: 1, slug: 1 }, { unique: true });

export default mongoose.model('Company', CompanySchema);
