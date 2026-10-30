import { haversine } from '@/lib/geo';
import { gymCoords, readGeocodeStore } from '@/lib/gym-geo';
import type { Gym } from '@/lib/types';

export interface GymMatch {
  gym: Gym;
  /** Metres between the athlete's position and the gym. */
  distanceM: number;
}

export interface GymSearchOptions {
  /** How close counts as "at the gym". */
  radiusM?: number;
  /** A GPS fix less precise than this is too vague to name a gym from. */
  maxAccuracyM?: number;
}

/**
 * The nearest gym within `radiusM` of a position, or null.
 *
 * Gyms without known coordinates are skipped. A fix that is itself less
 * precise than `maxAccuracyM` is rejected rather than risk naming the wrong
 * gym in a dense street.
 */
export function findGymAt(
  point: { lat: number; lng: number; accuracy?: number },
  gyms: Gym[],
  { radiusM = 150, maxAccuracyM = 150 }: GymSearchOptions = {}
): GymMatch | null {
  if (point.accuracy !== undefined && point.accuracy > maxAccuracyM) return null;

  const store = readGeocodeStore();
  const here = { lat: point.lat, lng: point.lng, at: 0 };
  let best: GymMatch | null = null;

  for (const gym of gyms) {
    const coords = gymCoords(gym, store);
    if (!coords) continue;
    const distanceM = haversine(here, { ...coords, at: 0 });
    if (distanceM <= radiusM && (!best || distanceM < best.distanceM)) best = { gym, distanceM };
  }

  return best;
}
