import { useCallback, useEffect, useMemo, useState } from 'react';
import { useCollection, useUser } from '@/lib/db-hooks';
import type { RunningSession, StravaActivity } from '@/lib/types';

/** Only runs at least this long say anything about sustainable pace. */
const MIN_RUN_KM = 3;
/** The fastest 3 km+ run is a bit quicker than ~60-minute (threshold) effort. */
const BEST_RUN_TO_THRESHOLD = 1.03;
/** Faster than this is a GPS glitch, not a human threshold pace (s/km). */
const MIN_PLAUSIBLE_THRESHOLD = 165;

/**
 * Threshold pace (s/km) that pace zones are measured against.
 *
 * A value the athlete entered wins; otherwise it is estimated from their
 * fastest run of 3 km+, fetched as one document per source (sorted
 * server-side) so the GPS point arrays of the whole history never load.
 * `fallbackSecPerKm` covers athletes with no qualifying run yet.
 */
export function useThresholdPace(fallbackSecPerKm: number) {
  const { user } = useUser();
  const storageKey = user?.uid ? `athlete-spa:threshold-pace:${user.uid}` : null;
  const [override, setOverride] = useState<number | null>(null);

  useEffect(() => {
    if (!storageKey) return;
    try {
      const stored = Number(localStorage.getItem(storageKey));
      setOverride(stored > 0 ? stored : null);
    } catch {
      setOverride(null);
    }
  }, [storageKey]);

  const { data: fastestSession } = useCollection<RunningSession>(
    user ? 'runningSessions' : null,
    { ownerId: user?.uid, distance: { $gte: MIN_RUN_KM }, avgPace: { $gt: 0 } },
    { sort: { avgPace: 1 }, limit: 1 }
  );

  const { data: fastestStrava } = useCollection<StravaActivity>(
    user ? 'stravaActivities' : null,
    { ownerId: user?.uid, distance: { $gte: MIN_RUN_KM * 1000 }, averageSpeed: { $gt: 0 } },
    { sort: { averageSpeed: -1 }, limit: 1 }
  );

  const estimated = useMemo(() => {
    const candidates: number[] = [];
    const session = fastestSession?.[0];
    if (session?.avgPace) candidates.push(session.avgPace * 60);
    const strava = fastestStrava?.[0];
    if (strava?.averageSpeed) candidates.push(1000 / strava.averageSpeed);
    if (candidates.length === 0) return null;
    return Math.max(MIN_PLAUSIBLE_THRESHOLD, Math.min(...candidates) * BEST_RUN_TO_THRESHOLD);
  }, [fastestSession, fastestStrava]);

  const setThresholdPace = useCallback(
    (secPerKm: number | null) => {
      setOverride(secPerKm);
      if (!storageKey) return;
      try {
        if (secPerKm) localStorage.setItem(storageKey, String(secPerKm));
        else localStorage.removeItem(storageKey);
      } catch {
        // Storage blocked — keep the value for this session only.
      }
    },
    [storageKey]
  );

  return {
    thresholdSecPerKm: override ?? estimated ?? fallbackSecPerKm,
    source: override ? ('custom' as const) : estimated ? ('estimated' as const) : ('fallback' as const),
    setThresholdPace,
  };
}
