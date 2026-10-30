import type { Gym } from '@/lib/types';

const GEOCODE_STORAGE_KEY = 'athlete-spa:geocode';

export interface Coords {
  lat: number;
  lng: number;
}

/** Gyms come back from the API with a Mongo `_id` next to (or instead of) `id`. */
export function gymId(gym: Gym): string {
  return gym.id ?? (gym as Gym & { _id?: string })._id ?? '';
}

type GeocodeStore = Record<string, Coords>;

/** Address → coordinates remembered from earlier geocoding; an address never moves. */
export function readGeocodeStore(): GeocodeStore {
  try {
    return JSON.parse(localStorage.getItem(GEOCODE_STORAGE_KEY) ?? '{}');
  } catch {
    return {};
  }
}

export function writeGeocode(address: string, coords: Coords) {
  try {
    const all = readGeocodeStore();
    all[address] = coords;
    localStorage.setItem(GEOCODE_STORAGE_KEY, JSON.stringify(all));
  } catch {
    // Storage unavailable — geocoding just isn't remembered.
  }
}

/**
 * Where a gym is, without any network call: the stored `location`, else a
 * previously geocoded address. Pass a `store` when checking many gyms so the
 * cache is parsed once.
 */
export function gymCoords(gym: Gym, store: GeocodeStore = readGeocodeStore()): Coords | undefined {
  const loc = gym.location;
  if (loc?.lat && loc?.lng) return { lat: loc.lat, lng: loc.lng };
  return gym.address ? store[gym.address] : undefined;
}
