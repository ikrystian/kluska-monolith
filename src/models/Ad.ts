import mongoose, { Schema, Model, Document } from 'mongoose';
import { cacheKeys, invalidateOnWrite } from '../lib/server-cache';
import { AD_AUDIENCES, AD_BADGES, AD_FORMATS, AD_GENDERS, AD_LEVELS, AD_PLACEMENTS, AD_TONES } from '../lib/ads';
import type { AdAudience, AdBadge, AdFormat, AdGender, AdLevel, AdPlacement, AdTone } from '../lib/ads';

/** An advertisement shown in the athlete app's ad slots (see lib/ads). */
export interface IAd extends Document {
  /** Internal name, never shown to athletes. */
  name: string;
  advertiser?: string;
  format: AdFormat;
  title?: string;
  text?: string;
  /** Local upload path (`/upload-data/...`) or an external address. */
  imageUrl?: string;
  ctaLabel?: string;
  /** In-app path (`/athlete/...`) or an external `https://` address. */
  link?: string;
  badge: AdBadge;
  tone: AdTone;
  placements: AdPlacement[];
  audience: AdAudience;
  genders: AdGender[];
  trainingLevels: AdLevel[];
  dismissible: boolean;
  /** Master switch; the date window and the caps below narrow it further. */
  active: boolean;
  startsAt?: Date | null;
  endsAt?: Date | null;
  weight: number;
  dailyCapPerUser: number;
  maxImpressions: number;
  maxClicks: number;
  /** Running totals; the per-day breakdown lives in AdStat. */
  impressions: number;
  clicks: number;
  createdAt: Date;
  updatedAt: Date;
}

const AdSchema = new Schema<IAd>(
  {
    name: { type: String, required: true },
    advertiser: { type: String },
    format: { type: String, enum: AD_FORMATS, required: true, default: 'card' },
    title: { type: String },
    text: { type: String },
    imageUrl: { type: String },
    ctaLabel: { type: String },
    link: { type: String },
    badge: { type: String, enum: AD_BADGES, default: 'Reklama' },
    tone: { type: String, enum: AD_TONES, default: 'neutral' },
    placements: { type: [String], enum: AD_PLACEMENTS, default: [] },
    audience: { type: String, enum: AD_AUDIENCES, default: 'all' },
    genders: { type: [String], enum: AD_GENDERS, default: [] },
    trainingLevels: { type: [String], enum: AD_LEVELS, default: [] },
    dismissible: { type: Boolean, default: true },
    active: { type: Boolean, default: true },
    startsAt: { type: Date, default: null },
    endsAt: { type: Date, default: null },
    weight: { type: Number, default: 1, min: 1 },
    dailyCapPerUser: { type: Number, default: 0, min: 0 },
    maxImpressions: { type: Number, default: 0, min: 0 },
    maxClicks: { type: Number, default: 0, min: 0 },
    impressions: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
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

AdSchema.index({ active: 1, endsAt: 1 });

// The list of live ads every athlete reads is cached (lib/server-cache) and
// dropped on every write through Mongoose. View/click counters are bumped with
// the raw driver (lib/ads-server) precisely so they do not drop it.
invalidateOnWrite(AdSchema, cacheKeys.ads);

export const Ad: Model<IAd> = mongoose.models.Ad || mongoose.model<IAd>('Ad', AdSchema);

/** Views and clicks of one ad on one screen on one (UTC) day. */
export interface IAdStat extends Document {
  adId: string;
  /** `YYYY-MM-DD` (UTC). */
  day: string;
  placement: string;
  impressions: number;
  clicks: number;
}

const AdStatSchema = new Schema<IAdStat>({
  adId: { type: String, required: true },
  day: { type: String, required: true },
  placement: { type: String, required: true },
  impressions: { type: Number, default: 0 },
  clicks: { type: Number, default: 0 },
});

AdStatSchema.index({ adId: 1, day: 1, placement: 1 }, { unique: true });
AdStatSchema.index({ day: 1 });

export const AdStat: Model<IAdStat> = mongoose.models.AdStat || mongoose.model<IAdStat>('AdStat', AdStatSchema);
