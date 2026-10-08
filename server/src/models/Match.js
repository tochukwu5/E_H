import mongoose from 'mongoose';

const { Schema } = mongoose;

const MatchSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    job: { type: Schema.Types.ObjectId, ref: 'Job', required: true },
    searchId: Schema.Types.ObjectId,
    searchName: String,
    score: { type: Number, min: 0, max: 100, index: true },
    reasons: [String], // short, human reasons ("Title matches Frontend developer")
    gaps: [String], // skills the job wants that the profile lacks
    aiReason: String,
    status: { type: String, enum: ['new', 'saved', 'skipped', 'applied'], default: 'new', index: true },
    watchlisted: { type: Boolean, default: false },
    notifiedAt: Date,
    channels: [String],
    inDigest: { type: Boolean, default: false },
  },
  { timestamps: true }
);

MatchSchema.index({ user: 1, job: 1 }, { unique: true });
MatchSchema.index({ user: 1, createdAt: -1 });

export default mongoose.model('Match', MatchSchema);
