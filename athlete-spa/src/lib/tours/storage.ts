import { mutate as globalMutate } from 'swr';
import { apiFetch } from '@/lib/api-client';
import type { TourDef } from './types';

/**
 * Which tours an account has already been through, and whether it wants them
 * at all. Kept on the user's profile (`seenTours`, `toursDisabled`), so the
 * choice follows the account across devices and browsers.
 */
export interface TourPrefs {
  /** Tour id → version that was shown. */
  seenTours?: Record<string, number>;
  toursDisabled?: boolean;
}

/** Old per-device store, migrated into the profile once and then removed. */
const LEGACY_KEY = (uid: string) => `athlete-spa:tours:${uid}`;

export function hasSeenTour(prefs: TourPrefs | null | undefined, tour: TourDef): boolean {
  return ((prefs?.seenTours ?? {})[tour.id] ?? 0) >= tour.version;
}

export function areToursEnabled(prefs: TourPrefs | null | undefined): boolean {
  return prefs?.toursDisabled !== true;
}

export function withTourSeen(prefs: TourPrefs, tour: TourDef): TourPrefs {
  return { ...prefs, seenTours: { ...prefs.seenTours, [tour.id]: tour.version } };
}

/**
 * Applies a change to the profile: the cached profile updates at once (so the
 * settings switch and the tour host react immediately), then the change is
 * saved. A failed save leaves the cache as it is until the next visit.
 */
export async function saveTourPrefs(uid: string, change: (current: TourPrefs) => TourPrefs): Promise<void> {
  const key = `/api/db/users/${uid}`;
  let next: TourPrefs = {};
  await globalMutate(
    key,
    (current: TourPrefs | undefined) => {
      next = change(current ?? {});
      return current ? { ...current, ...next } : current;
    },
    { revalidate: false }
  );
  try {
    await apiFetch(key, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seenTours: next.seenTours ?? {}, toursDisabled: next.toursDisabled === true }),
    });
  } catch {
    // Offline or refused: the tour may show once more, which beats crashing.
  }
}

/** Reads and removes the pre-profile localStorage entry; null when there is none. */
export function takeLegacyTourPrefs(uid: string): TourPrefs | null {
  try {
    const raw = localStorage.getItem(LEGACY_KEY(uid));
    localStorage.removeItem(LEGACY_KEY(uid));
    const parsed = JSON.parse(raw ?? 'null') as { seen?: Record<string, number>; disabled?: boolean } | null;
    if (!parsed || typeof parsed !== 'object') return null;
    return {
      seenTours: parsed.seen && typeof parsed.seen === 'object' ? parsed.seen : {},
      toursDisabled: parsed.disabled === true,
    };
  } catch {
    return null;
  }
}
