import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PluginListenerHandle } from '@capacitor/core';
import { haptic } from '@/lib/haptics';
import { resolveMediaUrl } from '@/lib/api-client';
import { playCue, preloadCue } from '@/lib/cue-audio';
import { RunTracking, isNativeRunTrackingAvailable, type NativeRunCue } from '@/lib/run-tracking';
import type { RunningCue, RunningProgram } from '@/lib/types';
import type { RunStatus } from './useRunTracker';

export interface ActiveCue {
  label: string;
  firedAt: number;
}

/** How long a cue's label stays up; a native cue reported later than this is not shown at all. */
const CUE_BANNER_MS = 6000;

const USE_NATIVE = isNativeRunTrackingAvailable();

/**
 * Fires a training's audio cues as the run crosses each cue's threshold —
 * either moving-time elapsed or distance covered. Pausing the run pauses
 * time-based cues too, since `durationSeconds` already excludes paused time;
 * distance-based cues simply wait for the athlete to keep moving.
 *
 * On Android the native recorder plays them (pass `recorderCues` to the
 * tracker's start / resume): with the app minimised or the screen locked the
 * WebView is frozen and would only notice a threshold once reopened. The
 * recorder reports each cue it played, and this hook just shows its label.
 * Elsewhere the hook watches the thresholds and plays through lib/cue-audio.ts.
 */
export function useRunCues(
  program: RunningProgram | null,
  durationSeconds: number,
  distanceMeters: number,
  status: RunStatus
) {
  const firedRef = useRef<Set<number>>(new Set());
  const [activeCue, setActiveCue] = useState<ActiveCue | null>(null);
  const programRef = useRef(program);
  programRef.current = program;

  const recorderCues = useMemo<NativeRunCue[]>(
    () =>
      program?.cues.map(cue => ({
        trigger: cue.triggerType,
        value: cue.value,
        src: resolveMediaUrl(cue.audioUrl),
      })) ?? [],
    [program]
  );

  const showCue = useCallback((cue: RunningCue | undefined, firedAt: number) => {
    haptic('success');
    if (cue?.label) setActiveCue({ label: cue.label, firedAt });
  }, []);

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
    }
  }, [status, durationSeconds]);

  useEffect(() => {
    if (!USE_NATIVE) return;
    let cancelled = false;
    let handle: PluginListenerHandle | undefined;

    void RunTracking.addListener('cue', ({ index, firedAt }) => {
      // Played while the app was in the background; the moment has passed.
      if (Date.now() - firedAt > CUE_BANNER_MS) return;
      showCue(programRef.current?.cues[index], firedAt);
    }).then(h => {
      if (cancelled) void h.remove();
      else handle = h;
    });

    return () => {
      cancelled = true;
      void handle?.remove();
    };
  }, [showCue]);

  useEffect(() => {
    if (USE_NATIVE || !program || status !== 'running') return;

    program.cues.forEach((cue, index) => {
      if (firedRef.current.has(index)) return;
      const progress = cue.triggerType === 'distance' ? distanceMeters : durationSeconds;
      if (cue.value > progress) return;
      firedRef.current.add(index);

      playCue(resolveMediaUrl(cue.audioUrl));
      showCue(cue, Date.now());
    });
  }, [program, status, durationSeconds, distanceMeters, showCue]);

  useEffect(() => {
    if (!activeCue) return;
    const timeout = setTimeout(() => setActiveCue(null), CUE_BANNER_MS);
    return () => clearTimeout(timeout);
  }, [activeCue]);

  return { activeCue, recorderCues };
}
