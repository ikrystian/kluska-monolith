import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useSWR from 'swr';
import { Geolocation } from '@capacitor/geolocation';
import { jsonFetcher } from '@/lib/db-hooks';
import { isLocationSharingEnabled } from '@/lib/app-permissions';
import { findGymAt, type GymMatch } from '@/lib/gym-match';
import type { Gym } from '@/lib/types';

interface Fix {
  lat: number;
  lng: number;
  accuracy: number;
}

/** How long saving a workout waits for a position before giving up on the gym. */
const SAVE_WAIT_MS = 4000;

const timeout = <T,>(promise: Promise<T>, ms: number): Promise<T | null> =>
  Promise.race([promise, new Promise<null>(resolve => setTimeout(() => resolve(null), ms))]);

/** One GPS fix, or null if there's no permission, no signal or the user turned location off. */
async function locate(): Promise<Fix | null> {
  try {
    const permission = await Geolocation.checkPermissions().catch(() => null);
    if (permission?.location === 'denied') return null;
    const { coords } = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 8000, maximumAge: 60_000 });
    return { lat: coords.latitude, lng: coords.longitude, accuracy: coords.accuracy };
  } catch {
    return null;
  }
}

export type WorkoutGymStatus = 'idle' | 'locating' | 'found' | 'none';

/**
 * Works out which gym the athlete is training at.
 *
 * While `active` (the finish screen is open) it takes one GPS fix and matches
 * it against the gym list on the device — the coordinates are never sent
 * anywhere; only the matched gym is saved with the workout. Every failure
 * (no permission, no signal, no gym nearby) resolves to "no gym" so saving a
 * workout is never held up by it.
 */
export function useWorkoutGym(active: boolean) {
  const enabled = active && isLocationSharingEnabled();
  const { data: gyms, error: gymsError } = useSWR<Gym[]>(enabled ? '/api/gyms' : null, jsonFetcher);

  const [fix, setFix] = useState<Fix | null | undefined>(undefined); // undefined = still locating
  const [dismissed, setDismissed] = useState(false);
  const fixPromise = useRef<Promise<Fix | null>>(Promise.resolve(null));
  const gymsRef = useRef<Gym[] | undefined>(undefined);
  const dismissedRef = useRef(false);

  gymsRef.current = gyms;
  dismissedRef.current = dismissed;

  useEffect(() => {
    setDismissed(false);
    if (!enabled) {
      setFix(active ? null : undefined);
      fixPromise.current = Promise.resolve(null);
      return;
    }
    let cancelled = false;
    setFix(undefined);
    const promise = locate();
    fixPromise.current = promise;
    void promise.then(result => !cancelled && setFix(result));
    return () => {
      cancelled = true;
    };
  }, [enabled, active]);

  const match = useMemo(() => (fix && gyms ? findGymAt(fix, gyms) : null), [fix, gyms]);

  const status: WorkoutGymStatus = !active
    ? 'idle'
    : fix === undefined || (fix !== null && !gyms && !gymsError)
      ? 'locating'
      : match && !dismissed
        ? 'found'
        : 'none';

  /** The gym to save with the workout; waits briefly for a fix that is still on its way. */
  const resolve = useCallback(async (): Promise<GymMatch | null> => {
    if (dismissedRef.current) return null;
    const position = await timeout(fixPromise.current, SAVE_WAIT_MS);
    if (!position) return null;
    const list = gymsRef.current ?? (await timeout(jsonFetcher<Gym[]>('/api/gyms').catch(() => null), SAVE_WAIT_MS));
    return list ? findGymAt(position, list) : null;
  }, []);

  return { status, match: dismissed ? null : match, dismiss: () => setDismissed(true), resolve };
}
