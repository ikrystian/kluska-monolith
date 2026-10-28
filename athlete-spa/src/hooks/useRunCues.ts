import { useEffect, useRef, useState } from 'react';
import { haptic } from '@/lib/haptics';
import { resolveMediaUrl } from '@/lib/api-client';
import { cancelCue, playCue, preloadCue, scheduleCue } from '@/lib/cue-audio';
import { isNativeRunTrackingAvailable } from '@/lib/run-tracking';
import type { RunningProgram } from '@/lib/types';
import type { RunStatus } from './useRunTracker';

export interface ActiveCue {
  label: string;
  firedAt: number;
}

/** How far the scheduled time cues may drift from the tracker's clock before they're rescheduled. */
const MAX_SCHEDULE_DRIFT_S = 3;

/**
 * Fires a training's audio cues as the run crosses each cue's threshold —
 * either moving-time elapsed or distance covered. Pausing the run pauses
 * time-based cues too, since `durationSeconds` already excludes paused time;
 * distance-based cues simply wait for the athlete to keep moving.
 *
 * Playback goes through lib/cue-audio.ts, which on Android plays natively and
 * ducks other music. Time-based cues are also scheduled natively while the run
 * is running, so they land on time with the app minimised even if the WebView
 * isn't ticking; distance-based cues fire from the native recorder's updates.
 * A cue is played at most once either way — the ids are shared.
 */
export function useRunCues(
  program: RunningProgram | null,
  durationSeconds: number,
  distanceMeters: number,
  status: RunStatus
) {
  const firedRef = useRef<Set<number>>(new Set());
  const [activeCue, setActiveCue] = useState<ActiveCue | null>(null);
  /** Distinguishes one run's cue ids from the next, so the native "already played" check doesn't carry over. */
  const [runKey, setRunKey] = useState(() => Date.now());
  /** Bumped when the tracker's clock jumps (re-sync from the native recorder) to reschedule. */
  const [scheduleEpoch, setScheduleEpoch] = useState(0);
  const durationRef = useRef(durationSeconds);
  durationRef.current = durationSeconds;
  /** Moving time and wall clock at the moment the time cues were last scheduled. */
  const scheduleBaseRef = useRef<{ wall: number; duration: number } | null>(null);

  useEffect(() => {
    firedRef.current = new Set();
    setActiveCue(null);
    program?.cues.forEach(cue => preloadCue(resolveMediaUrl(cue.audioUrl)));
  }, [program]);

  // A fresh run (duration reset to 0 while running) clears which cues already fired.
  useEffect(() => {
    if (status === 'running' && durationSeconds === 0) {
      firedRef.current = new Set();
      setActiveCue(null);
      setRunKey(Date.now());
    }
  }, [status, durationSeconds]);

  // Schedule the upcoming time cues natively for as long as the run is running.
  useEffect(() => {
    if (!program || status !== 'running') {
      scheduleBaseRef.current = null;
      return;
    }
    const now = Date.now();
    const duration = durationRef.current;
    scheduleBaseRef.current = { wall: now, duration };

    const ids: string[] = [];
    program.cues.forEach((cue, index) => {
      if (cue.triggerType !== 'time' || firedRef.current.has(index) || cue.value <= duration) return;
      const id = `run-${runKey}-${index}`;
      const at = now + (cue.value - duration) * 1000;
      // The run recorder's foreground service already keeps the process alive.
      if (scheduleCue(id, resolveMediaUrl(cue.audioUrl), at, { foreground: !isNativeRunTrackingAvailable() })) {
        ids.push(id);
      }
    });
    return () => ids.forEach(cancelCue);
  }, [program, status, runKey, scheduleEpoch]);

  useEffect(() => {
    if (!program || status !== 'running') return;

    const base = scheduleBaseRef.current;
    if (base) {
      const expected = base.duration + (Date.now() - base.wall) / 1000;
      if (Math.abs(expected - durationSeconds) > MAX_SCHEDULE_DRIFT_S) setScheduleEpoch(n => n + 1);
    }

    program.cues.forEach((cue, index) => {
      if (firedRef.current.has(index)) return;
      const progress = cue.triggerType === 'distance' ? distanceMeters : durationSeconds;
      if (cue.value > progress) return;
      firedRef.current.add(index);

      // Skipped natively if the schedule already played it.
      playCue(resolveMediaUrl(cue.audioUrl), `run-${runKey}-${index}`);
      haptic('success');
      if (cue.label) setActiveCue({ label: cue.label, firedAt: Date.now() });
    });
  }, [program, status, durationSeconds, distanceMeters, runKey]);

  useEffect(() => {
    if (!activeCue) return;
    const timeout = setTimeout(() => setActiveCue(null), 6000);
    return () => clearTimeout(timeout);
  }, [activeCue]);

  return { activeCue };
}
