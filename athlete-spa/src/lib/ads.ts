import { apiFetchRemote } from '@/lib/api-client';

/**
 * Ads defined in the admin panel (panel: „Reklamy”). The backend sends only
 * the ones this user may see right now; which one a screen shows, how often,
 * and reporting views/clicks back is this file's job.
 *
 * Mirrors `LiveAd` in the backend's `src/lib/ads.ts`.
 */

export type AdPlacement =
  | 'knowledge'
  | 'article'
  | 'history'
  | 'running'
  | 'nutrition'
  | 'social'
  | 'exercises'
  | 'gamification'
  | 'menu';

export type AdTone = 'neutral' | 'lime' | 'ember';

export interface LiveAd {
  id: string;
  format: 'banner' | 'card' | 'native';
  title?: string;
  text?: string;
  imageUrl?: string;
  ctaLabel?: string;
  /** In-app path (`/athlete/...`) or an external `https://` address. */
  link?: string;
  badge: string;
  tone: AdTone;
  placements: AdPlacement[];
  dismissible: boolean;
  weight: number;
  /** How many times a day one person may see it (0 = no limit). */
  dailyCapPerUser: number;
  endsAt: string | null;
}

const DISMISSED_KEY = 'athlete-spa:dismissed-ads';
const SEEN_KEY = 'athlete-spa:ad-views';

function readJson<T>(key: string, fallback: T): T {
  try {
    const stored = JSON.parse(localStorage.getItem(key) ?? 'null');
    return stored ?? fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage unavailable: caps and dismissals last until the app restarts.
  }
}

export function readDismissedAds(): string[] {
  const stored = readJson<unknown>(DISMISSED_KEY, []);
  return Array.isArray(stored) ? stored.filter((id): id is string => typeof id === 'string') : [];
}

export function dismissAd(id: string) {
  // Bounded: ids of ads deleted long ago would otherwise pile up forever.
  writeJson(DISMISSED_KEY, [...readDismissedAds().filter(other => other !== id), id].slice(-100));
}

const localDay = () => {
  const now = new Date();
  return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
};

interface SeenToday {
  day: string;
  counts: Record<string, number>;
}

/** Views per ad on this device today — what the per-person daily cap is checked against. */
function readSeenToday(): SeenToday {
  const stored = readJson<SeenToday | null>(SEEN_KEY, null);
  const day = localDay();
  return stored && stored.day === day && stored.counts && typeof stored.counts === 'object'
    ? stored
    : { day, counts: {} };
}

export function viewsToday(id: string): number {
  return readSeenToday().counts[id] ?? 0;
}

/** Ads a screen could show right now, after the device-side rules. */
export function eligibleAds(ads: LiveAd[], placement: AdPlacement, dismissed: string[]): LiveAd[] {
  const now = Date.now();
  const seen = readSeenToday().counts;
  return ads.filter(
    ad =>
      ad.placements.includes(placement) &&
      !dismissed.includes(ad.id) &&
      // The list may come from a snapshot older than an ad's end date.
      (!ad.endsAt || new Date(ad.endsAt).getTime() > now) &&
      (!ad.dailyCapPerUser || (seen[ad.id] ?? 0) < ad.dailyCapPerUser) &&
      // An older build must not draw an empty box for a format it does not know.
      (ad.format === 'banner' ? Boolean(ad.imageUrl) : (ad.format === 'card' || ad.format === 'native') && Boolean(ad.title))
  );
}

/** Picks one ad; an ad with weight 2 comes up twice as often as one with weight 1. */
export function pickWeighted(ads: LiveAd[]): LiveAd | null {
  if (ads.length === 0) return null;
  const total = ads.reduce((sum, ad) => sum + Math.max(ad.weight, 1), 0);
  let roll = Math.random() * total;
  for (const ad of ads) {
    roll -= Math.max(ad.weight, 1);
    if (roll < 0) return ad;
  }
  return ads[ads.length - 1];
}

interface AdEvent {
  id: string;
  type: 'impression' | 'click';
  placement: AdPlacement;
}

const FLUSH_DELAY_MS = 3000;
const MAX_BATCH = 50;

let queue: AdEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function flush() {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  if (queue.length === 0) return;
  const events = queue.slice(0, MAX_BATCH);
  queue = queue.slice(MAX_BATCH);

  // Straight to the server: `apiFetch` would treat this write as a data change
  // and mark every cached screen stale. `keepalive` lets it finish while the
  // app goes to the background. Lost statistics are not worth a retry.
  void apiFetchRemote('/api/ads/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ events }),
    keepalive: true,
  }).catch(() => undefined);

  if (queue.length > 0) flushTimer = setTimeout(flush, FLUSH_DELAY_MS);
}

if (typeof document !== 'undefined') {
  // Leaving the app is the last chance to send what was seen.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });
}

/** An ad was actually on screen: counts toward its daily cap and its statistics. */
export function trackAdImpression(ad: LiveAd, placement: AdPlacement) {
  const seen = readSeenToday();
  seen.counts[ad.id] = (seen.counts[ad.id] ?? 0) + 1;
  writeJson(SEEN_KEY, seen);

  queue.push({ id: ad.id, type: 'impression', placement });
  flushTimer ??= setTimeout(flush, FLUSH_DELAY_MS);
}

/** Sent at once: the tap usually navigates away. */
export function trackAdClick(ad: LiveAd, placement: AdPlacement) {
  queue.push({ id: ad.id, type: 'click', placement });
  flush();
}
