import mongoose from 'mongoose';

const { Schema } = mongoose;

const SourceRunSchema = new Schema(
  {
    source: { type: String, required: true, index: true },
    startedAt: { type: Date, default: Date.now },
    finishedAt: Date,
    durationMs: Number,
    ok: Boolean,
    skipped: { type: Boolean, default: false },
    fetched: { type: Number, default: 0 },
    inserted: { type: Number, default: 0 },
    updated: { type: Number, default: 0 },
    error: String,
  },
  { timestamps: false }
);

SourceRunSchema.index({ startedAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 14 });

export default mongoose.model('SourceRun', SourceRunSchema);
