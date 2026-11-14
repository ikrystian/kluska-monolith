import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/mongodb';
import { cached, cacheKeys } from '@/lib/server-cache';
import { Ad, AdStat } from '@/models/Ad';
import { User } from '@/models/User';
import { AD_PLACEMENTS, adDayKey } from '@/lib/ads';
import type { AdAudience, AdGender, AdLevel, AdPlacement, LiveAd } from '@/lib/ads';

/** Short, so an ad switched on or off in the panel reaches the app within a minute. */
const ADS_TTL_MS = 60_000;

interface SwitchedOnAd extends LiveAd {
  audience: AdAudience;
  genders: AdGender[];
  trainingLevels: AdLevel[];
  startsAt: string | null;
  maxImpressions: number;
  maxClicks: number;
  impressions: number;
  clicks: number;
}

/** Every switched-on ad; the date window, caps and audience are applied per request. */
async function loadSwitchedOnAds(): Promise<SwitchedOnAd[]> {
  await connectToDatabase();
  const docs = await Ad.find({ active: true }).sort({ weight: -1, createdAt: -1 }).lean();

  return docs.map((doc) => ({
    id: String(doc._id),
    format: doc.format,
    title: doc.title || undefined,
    text: doc.text || undefined,
    imageUrl: doc.imageUrl || undefined,
    ctaLabel: doc.ctaLabel || undefined,
    link: doc.link || undefined,
    badge: doc.badge ?? 'Reklama',
    tone: doc.tone ?? 'neutral',
    placements: (doc.placements ?? []) as AdPlacement[],
    dismissible: doc.dismissible ?? true,
    weight: doc.weight ?? 1,
    dailyCapPerUser: doc.dailyCapPerUser ?? 0,
    audience: doc.audience ?? 'all',
    genders: (doc.genders ?? []) as AdGender[],
    trainingLevels: (doc.trainingLevels ?? []) as AdLevel[],
    startsAt: doc.startsAt ? new Date(doc.startsAt).toISOString() : null,
    endsAt: doc.endsAt ? new Date(doc.endsAt).toISOString() : null,
    maxImpressions: doc.maxImpressions ?? 0,
    maxClicks: doc.maxClicks ?? 0,
    impressions: doc.impressions ?? 0,
    clicks: doc.clicks ?? 0,
  }));
}

/** Ads this user should see right now, across every placement. */
export async function getLiveAds(user: { id: string; isGuest?: boolean }): Promise<LiveAd[]> {
  const ads = await cached(cacheKeys.ads + 'live', { ttlMs: ADS_TTL_MS }, loadSwitchedOnAds);
  const now = Date.now();

  const running = ads.filter((ad) => {
    if (ad.placements.length === 0) return false;
    if (ad.startsAt && new Date(ad.startsAt).getTime() > now) return false;
    if (ad.endsAt && new Date(ad.endsAt).getTime() <= now) return false;
    if (ad.maxImpressions && ad.impressions >= ad.maxImpressions) return false;
    if (ad.maxClicks && ad.clicks >= ad.maxClicks) return false;
    if (ad.audience === 'guests') return Boolean(user.isGuest);
    if (ad.audience === 'accounts') return !user.isGuest;
    return true;
  });

  // The profile is only read when some running ad actually targets by it.
  const targeted = running.some((ad) => ad.genders.length > 0 || ad.trainingLevels.length > 0);
  let profile: { gender?: string; trainingLevel?: string } | null = null;
  if (targeted && mongoose.isValidObjectId(user.id)) {
    profile = await User.findById(user.id).select('gender trainingLevel').lean();
  }

  return running
    .filter((ad) => {
      // An ad narrowed to a group is not shown to someone whose profile lacks that detail.
      if (ad.genders.length > 0 && !ad.genders.includes((profile?.gender ?? '') as AdGender)) return false;
      if (ad.trainingLevels.length > 0 && !ad.trainingLevels.includes((profile?.trainingLevel ?? '') as AdLevel)) {
        return false;
      }
      return true;
    })
    .map(
      ({
        audience: _audience,
        genders: _genders,
        trainingLevels: _levels,
        startsAt: _startsAt,
        maxImpressions: _maxImpressions,
        maxClicks: _maxClicks,
        impressions: _impressions,
        clicks: _clicks,
        ...ad
      }) => ad
    );
}

export interface AdEvent {
  id: string;
  type: 'impression' | 'click';
  placement: string;
}

const MAX_EVENTS_PER_REQUEST = 50;

/**
 * Counts views and clicks reported by the app. Totals go on the ad itself and
 * into a per-day, per-screen bucket. Uses the raw collection for the ad so the
 * cached list of live ads is not dropped on every view.
 */
export async function recordAdEvents(events: AdEvent[]): Promise<number> {
  const placements = new Set<string>(AD_PLACEMENTS);
  const valid = events
    .slice(0, MAX_EVENTS_PER_REQUEST)
    .filter(
      (event) =>
        event &&
        mongoose.isValidObjectId(event.id) &&
        (event.type === 'impression' || event.type === 'click') &&
        placements.has(event.placement)
    );
  if (valid.length === 0) return 0;

  await connectToDatabase();

  const totals = new Map<string, { impressions: number; clicks: number }>();
  const buckets = new Map<string, { adId: string; placement: string; impressions: number; clicks: number }>();
  for (const event of valid) {
    const field = event.type === 'click' ? 'clicks' : 'impressions';
    const total = totals.get(event.id) ?? { impressions: 0, clicks: 0 };
    total[field]++;
    totals.set(event.id, total);

    const bucketKey = `${event.id}:${event.placement}`;
    const bucket = buckets.get(bucketKey) ?? { adId: event.id, placement: event.placement, impressions: 0, clicks: 0 };
    bucket[field]++;
    buckets.set(bucketKey, bucket);
  }

  const day = adDayKey();
  await Promise.all([
    Ad.collection.bulkWrite(
      Array.from(totals, ([id, inc]) => ({
        updateOne: {
          filter: { _id: new mongoose.Types.ObjectId(id) },
          update: { $inc: { impressions: inc.impressions, clicks: inc.clicks } },
        },
      })),
      { ordered: false }
    ),
    AdStat.bulkWrite(
      Array.from(buckets.values(), (bucket) => ({
        updateOne: {
          filter: { adId: bucket.adId, day, placement: bucket.placement },
          update: { $inc: { impressions: bucket.impressions, clicks: bucket.clicks } },
          upsert: true,
        },
      })),
      { ordered: false }
    ),
  ]);

  return valid.length;
}

export interface AdStatsDay {
  day: string;
  impressions: number;
  clicks: number;
}

export interface AdStatsSummary {
  days: AdStatsDay[];
  byPlacement: { placement: string; impressions: number; clicks: number }[];
  byAd: { adId: string; impressions: number; clicks: number }[];
  totals: { impressions: number; clicks: number };
}

/** Views and clicks of the last `days` days, for one ad or for all of them. */
export async function getAdStats(options: { adId?: string; days: number }): Promise<AdStatsSummary> {
  await connectToDatabase();
  const days = Math.min(Math.max(Math.floor(options.days) || 30, 1), 365);
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - (days - 1));
  const sinceKey = adDayKey(since);

  const match: Record<string, unknown> = { day: { $gte: sinceKey } };
  if (options.adId) match.adId = options.adId;
  const rows = await AdStat.find(match).lean();

  const byDay = new Map<string, AdStatsDay>();
  for (let offset = 0; offset < days; offset++) {
    const date = new Date(since);
    date.setUTCDate(since.getUTCDate() + offset);
    const key = adDayKey(date);
    byDay.set(key, { day: key, impressions: 0, clicks: 0 });
  }
  const byPlacement = new Map<string, { placement: string; impressions: number; clicks: number }>();
  const byAd = new Map<string, { adId: string; impressions: number; clicks: number }>();
  const totals = { impressions: 0, clicks: 0 };

  for (const row of rows) {
    const dayEntry = byDay.get(row.day);
    if (dayEntry) {
      dayEntry.impressions += row.impressions;
      dayEntry.clicks += row.clicks;
    }
    const placement = byPlacement.get(row.placement) ?? { placement: row.placement, impressions: 0, clicks: 0 };
    placement.impressions += row.impressions;
    placement.clicks += row.clicks;
    byPlacement.set(row.placement, placement);

    const ad = byAd.get(row.adId) ?? { adId: row.adId, impressions: 0, clicks: 0 };
    ad.impressions += row.impressions;
    ad.clicks += row.clicks;
    byAd.set(row.adId, ad);

    totals.impressions += row.impressions;
    totals.clicks += row.clicks;
  }

  return {
    days: Array.from(byDay.values()),
    byPlacement: Array.from(byPlacement.values()).sort((a, b) => b.impressions - a.impressions),
    byAd: Array.from(byAd.values()).sort((a, b) => b.impressions - a.impressions),
    totals,
  };
}
