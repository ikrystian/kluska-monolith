import { useCallback, useEffect, useRef, useState } from 'react';
import { Geolocation, type Position } from '@capacitor/geolocation';
import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import { haversine, type GeoPoint } from '@/lib/geo';
import {
  RunTracking,
  isNativeRunTrackingAvailable,
  promptBatteryExemptionOnce,
  type NativeRunSnapshot,
} from '@/lib/run-tracking';

export type TrackPoint = GeoPoint;

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

interface InternalState extends RunTrackerState {
  /** The next accepted fix starts a new segment: distance walked while paused doesn't count. */
  segmentStart: boolean;
}

const STORAGE_KEY = 'athlete-spa:run-in-progress';

// The fix filter is mirrored in the native recorder (RunSession.java) — keep in sync.
/** Fixes worse than this are noise — GPS drift alone would inflate distance. */
const MAX_ACCEPTABLE_ACCURACY_M = 40;
/** Faster than any runner; a step implying more is a relocation glitch. */
const MAX_PLAUSIBLE_SPEED_MPS = 12;
/** Steps up to this are always plausible, so closely spaced fixes aren't over-filtered. */
const MIN_PLAUSIBLE_STEP_M = 25;
/** Below this, movement is indistinguishable from standing still and jittering. */
const MIN_STEP_M = 2;
/** Twice a second; browsers ignore it, Android's provider honours it. */
const LOCATION_INTERVAL_MS = 500;

/**
 * On Android a native foreground service records the run (see
 * lib/run-tracking.ts): a WebView geolocation watch gets throttled once the
 * app is backgrounded or the screen locks.
 */
const USE_NATIVE = isNativeRunTrackingAvailable();

function computePace(durationS: number, distanceM: number): number {
  const km = distanceM / 1000;
  return km > 0.05 ? durationS / 60 / km : 0;
}

const IDLE_STATE: InternalState = {
  status: 'idle',
  distance: 0,
  duration: 0,
  pace: 0,
  points: [],
  accuracy: null,
  error: null,
  segmentStart: false,
};

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
 *
 * On Android the native recorder owns the route and distance; this hook
 * mirrors its live updates and re-syncs from it when the app returns to the
 * foreground or the screen remounts mid-run.
 */
export function useRunTracker() {
  const [state, setState] = useState<InternalState>(() => {
    const persisted = loadPersisted();
    return {
      ...IDLE_STATE,
      status: persisted ? 'paused' : 'idle',
      distance: persisted?.distance ?? 0,
      duration: persisted?.duration ?? 0,
      pace: persisted ? computePace(persisted.duration, persisted.distance) : 0,
      points: persisted?.points ?? [],
      segmentStart: Boolean(persisted),
    };
  });

  const watchIdRef = useRef<string | null>(null);
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

  const handlePosition = useCallback((position: Position) => {
    const { latitude, longitude, accuracy, altitude } = position.coords;
    const point: TrackPoint = { lat: latitude, lng: longitude, at: position.timestamp, alt: altitude };

    setState(prev => {
      if (prev.status !== 'running') return { ...prev, accuracy };

      if (accuracy > MAX_ACCEPTABLE_ACCURACY_M) {
        // Keep showing the poor accuracy so the UI can warn, but don't let the
        // fix contribute distance.
        return { ...prev, accuracy, error: null };
      }

      const previous = prev.points[prev.points.length - 1];
      if (!previous || prev.segmentStart) {
        return { ...prev, points: [...prev.points, point], segmentStart: false, accuracy, error: null };
      }

      // Speed-based rather than a fixed cap: after a gap in fixes a fixed cap
      // would reject every later point and freeze the route for good.
      const step = haversine(previous, point);
      const elapsedS = Math.max(0, (point.at - previous.at) / 1000);
      const maxStep = Math.max(MIN_PLAUSIBLE_STEP_M, MAX_PLAUSIBLE_SPEED_MPS * elapsedS);
      if (step < MIN_STEP_M || step > maxStep) {
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

  const handleError = useCallback((err: unknown) => {
    const message = err instanceof Error ? err.message : typeof err === 'string' ? err : '';
    setState(prev => ({
      ...prev,
      error: /denied|permission/i.test(message)
        ? 'Brak zgody na dostęp do lokalizacji.'
        : 'Nie udało się ustalić pozycji. Sprawdź GPS.',
    }));
  }, []);

  /**
   * Takes over the native recorder's numbers. With `onlyWhen`, only the data
   * is applied, and only if the JS status still matches (a pause/stop result
   * arriving after the athlete already moved on is dropped). Without it, the
   * native status is adopted too — used when re-syncing after the WebView was
   * hidden, throttled or remounted.
   */
  const applyNativeSnapshot = useCallback((snap: NativeRunSnapshot, onlyWhen?: RunStatus) => {
    if (!onlyWhen) {
      if (snap.status === 'idle') return;
      if (snap.status === 'running') lastTickRef.current = Date.now();
    }
    setState(prev => {
      if (onlyWhen && prev.status !== onlyWhen) return prev;
      const duration = snap.durationMs / 1000;
      return {
        ...prev,
        status: onlyWhen ? prev.status : snap.status,
        distance: snap.distance,
        duration,
        pace: computePace(duration, snap.distance),
        points: snap.points ?? prev.points,
        accuracy: snap.accuracy ?? prev.accuracy,
      };
    });
  }, []);

  const ensureLocationPermission = useCallback(async (): Promise<boolean> => {
    // requestPermissions() is unimplemented on web — there, watchPosition
    // itself triggers the browser's native permission prompt.
    if (!Capacitor.isNativePlatform()) return true;
    const permission = await Geolocation.requestPermissions();
    if (permission.location === 'denied') {
      setState(prev => ({ ...prev, error: 'Brak zgody na dostęp do lokalizacji.' }));
      return false;
    }
    return true;
  }, []);

  const startWatching = useCallback(async () => {
    if (watchIdRef.current !== null) return;
    try {
      if (!(await ensureLocationPermission())) return;
      watchIdRef.current = await Geolocation.watchPosition(
        {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 20_000,
          interval: LOCATION_INTERVAL_MS,
          minimumUpdateInterval: LOCATION_INTERVAL_MS,
        },
        (position, err) => {
          if (err || !position) {
            handleError(err);
            return;
          }
          handlePosition(position);
        }
      );
    } catch (err) {
      handleError(err);
    }
  }, [ensureLocationPermission, handlePosition, handleError]);

  const stopWatching = useCallback(() => {
    const id = watchIdRef.current;
    if (id === null) return;
    watchIdRef.current = null;
    void Geolocation.clearWatch({ id });
  }, []);

  /** Starts (or, for a run recovered from storage, continues) the native recorder. */
  const startNative = useCallback(
    async (mode: 'start' | 'resume') => {
      try {
        if (!(await ensureLocationPermission())) return;
        // Without it the lock-screen notification is hidden; recording works either way.
        await RunTracking.requestNotificationPermission().catch(() => undefined);
        if (mode === 'start') {
          await RunTracking.start();
          void promptBatteryExemptionOnce();
        } else {
          const { points, distance, duration } = stateRef.current;
          await RunTracking.resume({ points, distance, durationMs: Math.round(duration * 1000) });
        }
      } catch (err) {
        handleError(err);
      }
    },
    [ensureLocationPermission, handleError]
  );

  const start = useCallback(() => {
    lastTickRef.current = Date.now();
    setState({ ...IDLE_STATE, status: 'running' });
    if (USE_NATIVE) void startNative('start');
    else void startWatching();
  }, [startNative, startWatching]);

  const pause = useCallback(() => {
    lastTickRef.current = null;
    setState(prev => (prev.status === 'running' ? { ...prev, status: 'paused' } : prev));
    if (USE_NATIVE) {
      RunTracking.pause()
        .then(snap => applyNativeSnapshot(snap, 'paused'))
        .catch(handleError);
    } else {
      stopWatching();
    }
  }, [applyNativeSnapshot, handleError, stopWatching]);

  const resume = useCallback(() => {
    lastTickRef.current = Date.now();
    setState(prev => (prev.status === 'paused' ? { ...prev, status: 'running', segmentStart: true } : prev));
    if (USE_NATIVE) void startNative('resume');
    else void startWatching();
  }, [startNative, startWatching]);

  const finish = useCallback(() => {
    lastTickRef.current = null;
    setState(prev => ({ ...prev, status: 'finished' }));
    if (USE_NATIVE) {
      // The native route is authoritative — it kept recording while the WebView was throttled.
      RunTracking.stop()
        .then(snap => applyNativeSnapshot(snap, 'finished'))
        .catch(handleError);
    } else {
      stopWatching();
    }
  }, [applyNativeSnapshot, handleError, stopWatching]);

  const reset = useCallback(() => {
    lastTickRef.current = null;
    if (USE_NATIVE) void RunTracking.stop().catch(() => undefined);
    else stopWatching();
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Nothing to clear.
    }
    setState(IDLE_STATE);
  }, [stopWatching]);

  // Mirror the native recorder: live updates while visible, plus adopting a
  // run that is still recording natively when this screen mounts (the
  // WebView was reloaded, or the athlete left the screen mid-run).
  useEffect(() => {
    if (!USE_NATIVE) return;
    let cancelled = false;
    let handle: PluginListenerHandle | undefined;

    void RunTracking.addListener('update', update => {
      setState(prev => {
        if (prev.status !== 'running' && prev.status !== 'paused') return prev;
        return {
          ...prev,
          distance: update.distance,
          points: update.point ? [...prev.points, update.point] : prev.points,
          accuracy: update.accuracy ?? prev.accuracy,
          error: null,
        };
      });
    }).then(h => {
      if (cancelled) void h.remove();
      else handle = h;
    });

    RunTracking.getState()
      .then(snap => {
        if (!cancelled) applyNativeSnapshot(snap);
      })
      .catch(() => {
        // Plugin unavailable — nothing to adopt.
      });

    return () => {
      cancelled = true;
      void handle?.remove();
    };
  }, [applyNativeSnapshot]);

  // A hidden WebView may have missed updates or had its clock throttled;
  // catch up with the native recorder as soon as it is visible again.
  useEffect(() => {
    if (!USE_NATIVE) return;
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      const { status } = stateRef.current;
      if (status !== 'running' && status !== 'paused') return;
      RunTracking.getState()
        .then(snap => applyNativeSnapshot(snap))
        .catch(() => undefined);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [applyNativeSnapshot]);

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
        return { ...prev, duration, pace: computePace(duration, prev.distance) };
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

  // The native recorder deliberately outlives this screen: leaving it mid-run
  // keeps recording (with the lock-screen notification) until it's reopened.
  useEffect(() => stopWatching, [stopWatching]);

  const { segmentStart: _segmentStart, ...publicState } = state;
  return { ...publicState, hasRecoverableRun, start, pause, resume, finish, reset };
}
