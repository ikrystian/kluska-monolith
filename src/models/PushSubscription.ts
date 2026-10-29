import mongoose, { Schema, Model, Document } from 'mongoose';

export type PushPlatform = 'web' | 'android' | 'ios';

/**
 * One browser/device registered for push. A user can have several (one per
 * browser/device they enabled notifications on).
 *
 * Two shapes share this collection, discriminated by `platform`:
 *  - 'web': a Web Push subscription (`endpoint` + `keys`), delivered via the
 *    `web-push` library.
 *  - 'android' / 'ios': a native FCM/APNs token from the Capacitor Push
 *    Notifications plugin (`token`). Capturing these is wired up, but
 *    actually sending to them needs the Firebase Admin SDK with a service
 *    account for this app's Firebase project — not configured yet, so
 *    send-test currently only delivers to 'web' subscriptions.
 */
export interface IPushSubscription extends Document {
  _id: string;
  userId: string;
  platform: PushPlatform;
  endpoint?: string;
  keys?: {
    p256dh: string;
    auth: string;
  };
  token?: string;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PushSubscriptionSchema = new Schema<IPushSubscription>(
  {
    userId: { type: String, required: true, index: true },
    platform: { type: String, enum: ['web', 'android', 'ios'], required: true, default: 'web' },
    endpoint: { type: String, unique: true, sparse: true },
    keys: {
      p256dh: { type: String },
      auth: { type: String },
    },
    token: { type: String, unique: true, sparse: true },
    userAgent: { type: String },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_, ret) => {
        ret.id = ret._id.toString();
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const PushSubscription: Model<IPushSubscription> =
  mongoose.models.PushSubscription || mongoose.model<IPushSubscription>('PushSubscription', PushSubscriptionSchema);
