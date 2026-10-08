import mongoose from 'mongoose';

const { Schema } = mongoose;

const NotificationSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['match', 'digest', 'application', 'follow_up', 'system', 'billing'], default: 'system' },
    title: String,
    body: String,
    link: String,
    read: { type: Boolean, default: false, index: true },
    meta: Schema.Types.Mixed,
  },
  { timestamps: true }
);

NotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 }); // keep 90 days

export default mongoose.model('Notification', NotificationSchema);
