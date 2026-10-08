import mongoose from 'mongoose';

const { Schema } = mongoose;

export const APP_STATUSES = ['draft', 'ready', 'applied', 'interview', 'offer', 'rejected', 'withdrawn'];

const ApplicationSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    job: { type: Schema.Types.ObjectId, ref: 'Job' },
    match: { type: Schema.Types.ObjectId, ref: 'Match' },
    // Snapshot so the tracker still works if a job expires or was added by hand
    title: String,
    company: String,
    url: String,
    status: { type: String, enum: APP_STATUSES, default: 'draft', index: true },
    mode: { type: String, enum: ['manual', 'approve', 'auto'], default: 'manual' },
    coverLetter: String,
    answers: [{ question: String, answer: String }],
    notes: String,
    appliedAt: Date,
    followUpAt: Date,
    followUpSent: { type: Boolean, default: false },
    history: [{ status: String, at: { type: Date, default: Date.now } }],
  },
  { timestamps: true }
);

ApplicationSchema.index({ user: 1, job: 1 }, { unique: true, partialFilterExpression: { job: { $exists: true } } });

export default mongoose.model('Application', ApplicationSchema);
