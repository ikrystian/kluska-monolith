import { useCallback, useEffect, useRef, useState } from 'react';

export interface TrackPoint {
  lat: number;
  lng: number;
  /** Epoch ms when the fix was taken. */
  at: number;
}

export type RunStatus = 'idle' | 'running' | 'paused' | 'finished';

export interface RunTrackerState {
  status: RunStatus;
  /** Metres covered. */
  distance: number;
  /** Seconds of moving time, excluding pauses. */
  duration: number;
  /** Minutes per kilometre, or 0 before enough distance accumulates. */
  pace: number;
  points: TrackPoint[];
  /** Accuracy of the latest fix in metres; large values mean a poor signal. */
  accuracy: number | null;
  error: string | null;
}

const STORAGE_KEY = 'athlete-spa:run-in-progress';

/** Fixes worse than this are noise — GPS drift alone would inflate distance. */
const MAX_ACCEPTABLE_ACCURACY_M = 40;
/** No runner covers this between two fixes; such a jump is a relocation glitch. */
const MAX_PLAUSIBLE_STEP_M = 150;
/** Below this, movement is indistinguishable from standing still and jittering. */
const MIN_STEP_M = 2;

/** Great-circle distance in metres. */
function haversine(a: TrackPoint, b: TrackPoint): number {
  const R = 6_371_000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

interface PersistedRun {
  points: TrackPoint[];
  distance: number;
  duration: number;
  status: RunStatus;
  savedAt: number;
}

function loadPersisted(): PersistedRun | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PersistedRun) : null;
  } catch {
    return null;
  }
}

/**
 * Records a run from the device's GPS.
 *
 * Distance is accumulated from filtered fixes rather than trusting every
 * sample: a stationary phone still reports movement, and an occasional fix
 * lands hundreds of metres away, both of which would otherwise turn a 5 km run
 * into a 7 km one.
 *
 * Elapsed time counts from wall-clock deltas between ticks, so a backgrounded
 * WebView whose timers get throttled still reports the right duration.
 */
export function useRunTracker() {
  const [state, setState] = useState<RunTrackerState>(() => {
    const persisted = loadPersisted();
    return {
      status: persisted ? 'paused' : 'idle',
      distance: persisted?.distance ?? 0,
      duration: persisted?.duration ?? 0,
      pace: 0,
      points: persisted?.points ?? [],
      accuracy: null,
      error: null,
    };
  });

  const watchIdRef = useRef<number | null>(null);
  const lastTickRef = useRef<number | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  /** True when a run was restored from storage and can be resumed or saved. */
  const hasRecoverableRun = state.status === 'paused' && state.points.length > 0;

  const persist = useCallback(() => {
    const { points, distance, duration, status } = stateRef.current;
    try {
      if (status === 'idle' || status === 'finished') {
        localStorage.removeItem(STORAGE_KEY);
        return;
      }
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ points, distance, duration, status, savedAt: Date.now() } satisfies PersistedRun)
      );
    } catch {
      // Out of space — the run still completes, it just won't survive a kill.
    }
  }, []);

  const handlePosition = useCallback((position: GeolocationPosition) => {
    const { latitude, longitude, accuracy } = position.coords;
    const point: TrackPoint = { lat: latitude, lng: longitude, at: position.timestamp };

    setState(prev => {
      if (prev.status !== 'running') return { ...prev, accuracy };

      if (accuracy > MAX_ACCEPTABLE_ACCURACY_M) {
        // Keep showing the poor accuracy so the UI can warn, but don't let the
        // fix contribute distance.
        return { ...prev, accuracy, error: null };
      }

      const previous = prev.points[prev.points.length - 1];
      if (!previous) {
        return { ...prev, points: [point], accuracy, error: null };
      }

      const step = haversine(previous, point);
      if (step < MIN_STEP_M || step > MAX_PLAUSIBLE_STEP_M) {
        return { ...prev, accuracy, error: null };
      }

      const distance = prev.distance + step;
      return {
        ...prev,
        points: [...prev.points, point],
        distance,
        accuracy,
        error: null,
      };
    });
  }, []);

  const handleError = useCallback((error: GeolocationPositionError) => {
    setState(prev => ({
      ...prev,
      error:
        error.code === error.PERMISSION_DENIED
          ? 'Brak zgody na dostęp do lokalizacji.'
          : 'Nie udało się ustalić pozycji. Sprawdź GPS.',
    }));
  }, []);

  const startWatching = useCallback(() => {
    if (watchIdRef.current !== null || !navigator.geolocation) return;
    watchIdRef.current = navigator.geolocation.watchPosition(handlePosition, handleError, {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 20_000,
    });
  }, [handlePosition, handleError]);

  const stopWatching = useCallback(() => {
    if (watchIdRef.current === null) return;
    navigator.geolocation.clearWatch(watchIdRef.current);
    watchIdRef.current = null;
  }, []);

  const start = useCallback(() => {
    if (!navigator.geolocation) {
      setState(prev => ({ ...prev, error: 'To urządzenie nie udostępnia lokalizacji.' }));
      return;
    }
    lastTickRef.current = Date.now();
    setState({
      status: 'running',
      distance: 0,
      duration: 0,
      pace: 0,
      points: [],
      accuracy: null,
      error: null,
    });
    startWatching();
  }, [startWatching]);

  const pause = useCallback(() => {
    lastTickRef.current = null;
    stopWatching();
    setState(prev => (prev.status === 'running' ? { ...prev, status: 'paused' } : prev));
  }, [stopWatching]);

  const resume = useCallback(() => {
    lastTickRef.current = Date.now();
    setState(prev => (prev.status === 'paused' ? { ...prev, status: 'running' } : prev));
    startWatching();
  }, [startWatching]);

  const finish = useCallback(() => {
    lastTickRef.current = null;
    stopWatching();
    setState(prev => ({ ...prev, status: 'finished' }));
  }, [stopWatching]);

  const reset = useCallback(() => {
    lastTickRef.current = null;
    stopWatching();
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Nothing to clear.
    }
    setState({
      status: 'idle',
      distance: 0,
      duration: 0,
      pace: 0,
      points: [],
      accuracy: null,
      error: null,
    });
  }, [stopWatching]);

  // Moving-time clock. Reads wall-clock deltas so throttled ticks in the
  // background don't lose time.
  useEffect(() => {
    if (state.status !== 'running') return;

    const interval = setInterval(() => {
      // Advancing the tick marker has to happen outside the updater: React
      // invokes updaters more than once (StrictMode, replays), and a second
      // pass would measure zero elapsed time and freeze the clock.
      const now = Date.now();
      const elapsed = lastTickRef.current ? (now - lastTickRef.current) / 1000 : 0;
      lastTickRef.current = now;

      setState(prev => {
        if (prev.status !== 'running') return prev;
        const duration = prev.duration + elapsed;
        const km = prev.distance / 1000;
        return { ...prev, duration, pace: km > 0.05 ? duration / 60 / km : 0 };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [state.status]);

  // Snapshot the run so an OS-killed WebView doesn't lose it.
  useEffect(() => {
    persist();
  }, [state.points.length, state.status, persist]);

  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') persist();
    };
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  }, [persist]);

  useEffect(() => stopWatching, [stopWatching]);

  return { ...state, hasRecoverableRun, start, pause, resume, finish, reset };
}
