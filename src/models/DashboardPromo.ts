import mongoose, { Schema, Model, Document } from 'mongoose';
import { cacheKeys, invalidateOnWrite } from '../lib/server-cache';
import { PROMO_AUDIENCES, PROMO_TONES, PROMO_TYPES } from '../lib/dashboard-promos';
import type { PromoAudience, PromoTone, PromoType } from '../lib/dashboard-promos';

/** Admin-defined content shown above the week strip on the athlete's home screen. */
export interface IDashboardPromo extends Document {
  type: PromoType;
  title: string;
  text?: string;
  /** Local upload path (`/upload-data/...`) or an external address. */
  imageUrl?: string;
  ctaLabel?: string;
  /** In-app path (`/athlete/...`) or an external `https://` address. */
  link?: string;
  /** Id from the app's shop catalogue (type `product`). */
  productId?: string;
  /** Article to recommend (type `article`). */
  articleId?: string;
  tone: PromoTone;
  audience: PromoAudience;
  dismissible: boolean;
  /** Master switch; the date window below narrows it further. */
  active: boolean;
  startsAt?: Date | null;
  endsAt?: Date | null;
  /** Lower shows first. */
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const DashboardPromoSchema = new Schema<IDashboardPromo>(
  {
    type: { type: String, enum: PROMO_TYPES, required: true },
    title: { type: String, default: '' },
    text: { type: String },
    imageUrl: { type: String },
    ctaLabel: { type: String },
    link: { type: String },
    productId: { type: String },
    articleId: { type: String },
    tone: { type: String, enum: PROMO_TONES, default: 'neutral' },
    audience: { type: String, enum: PROMO_AUDIENCES, default: 'all' },
    dismissible: { type: Boolean, default: true },
    active: { type: Boolean, default: true },
    startsAt: { type: Date, default: null },
    endsAt: { type: Date, default: null },
    order: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_, ret: Record<string, any>) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

DashboardPromoSchema.index({ active: 1, order: 1 });

// The list every athlete reads on the home screen is cached (lib/server-cache)
// and dropped on every write.
invalidateOnWrite(DashboardPromoSchema, cacheKeys.dashboardPromos);

export const DashboardPromo: Model<IDashboardPromo> =
  mongoose.models.DashboardPromo || mongoose.model<IDashboardPromo>('DashboardPromo', DashboardPromoSchema);
