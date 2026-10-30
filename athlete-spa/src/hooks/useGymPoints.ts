import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { jsonFetcher } from '@/lib/db-hooks';
import { gymCoords, readGeocodeStore, writeGeocode, type Coords } from '@/lib/gym-geo';
import type { Gym } from '@/lib/types';

export type GymPoint = Gym & Coords;

const EMPTY_GYMS: Gym[] = [];

/** Nominatim allows one request per second. */
const GEOCODE_DELAY_MS = 1000;

/**
 * Every gym that can be put on a map. Gyms with a stored `location` are
 * available immediately; those with only an address are geocoded in the
 * background (once — results are cached) and appear as they resolve.
 */
export function useGymPoints() {
  const { data, isLoading } = useSWR<Gym[]>('/api/gyms', jsonFetcher);
  const gyms = data ?? EMPTY_GYMS;
  const [resolved, setResolved] = useState<Record<string, Coords>>({});

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const store = readGeocodeStore();
      const pending = gyms.filter(g => g.address && !gymCoords(g, store));

      for (const gym of pending) {
        if (cancelled) return;
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(gym.address)}&format=json&limit=1`
          );
          const found = (await response.json())?.[0];
          if (found) {
            const coords = { lat: parseFloat(found.lat), lng: parseFloat(found.lon) };
            writeGeocode(gym.address, coords);
            if (!cancelled) setResolved(prev => ({ ...prev, [gym.address]: coords }));
          }
        } catch (e) {
          console.error(`Geocoding failed for ${gym.address}`, e);
        }
        await new Promise(resolve => setTimeout(resolve, GEOCODE_DELAY_MS));
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [gyms]);

  const points = useMemo<GymPoint[]>(() => {
    const store = readGeocodeStore();
    return gyms.flatMap(gym => {
      const coords = gymCoords(gym, store) ?? resolved[gym.address];
      return coords ? [{ ...gym, ...coords }] : [];
    });
  }, [gyms, resolved]);

  return { gyms, points, isLoading };
}
