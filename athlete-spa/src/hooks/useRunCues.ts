import { useEffect, useRef, useState } from 'react';
import { haptic } from '@/lib/haptics';
import { resolveMediaUrl } from '@/lib/api-client';
import type { RunningProgram } from '@/lib/types';
import type { RunStatus } from './useRunTracker';

export interface ActiveCue {
  label: string;
  firedAt: number;
}

/**
 * Fires a training's audio cues as the run crosses each cue's threshold —
 * either moving-time elapsed or distance covered. Pausing the run pauses
 * time-based cues too, since `durationSeconds` already excludes paused time;
 * distance-based cues simply wait for the athlete to keep moving.
 *
 * Audio elements are preloaded up front (keyed by cue index) so playback
 * isn't delayed by a network fetch at the exact moment a cue is due.
 */
export function useRunCues(
  program: RunningProgram | null,
  durationSeconds: number,
  distanceMeters: number,
  status: RunStatus
) {
  const audioByIndexRef = useRef<Map<number, HTMLAudioElement>>(new Map());
  const firedRef = useRef<Set<number>>(new Set());
  const [activeCue, setActiveCue] = useState<ActiveCue | null>(null);

  useEffect(() => {
    firedRef.current = new Set();
    setActiveCue(null);

    const map = new Map<number, HTMLAudioElement>();
    program?.cues.forEach((cue, index) => {
      const audio = new Audio(resolveMediaUrl(cue.audioUrl));
      audio.preload = 'auto';
      map.set(index, audio);
    });
    audioByIndexRef.current = map;

    return () => {
      map.forEach(audio => audio.pause());
    };
  }, [program]);

  // A fresh run (duration reset to 0 while running) clears which cues already fired.
  useEffect(() => {
    if (status === 'running' && durationSeconds === 0) {
      firedRef.current = new Set();
      setActiveCue(null);
    }
  }, [status, durationSeconds]);

  useEffect(() => {
    if (!program || status !== 'running') return;

    program.cues.forEach((cue, index) => {
      if (firedRef.current.has(index)) return;
      const progress = cue.triggerType === 'distance' ? distanceMeters : durationSeconds;
      if (cue.value > progress) return;
      firedRef.current.add(index);

      const audio = audioByIndexRef.current.get(index);
      if (audio) {
        audio.currentTime = 0;
        void audio.play().catch(() => {
          // Autoplay blocked or the file hasn't finished loading — haptic still lands.
        });
      }
      haptic('success');
      if (cue.label) setActiveCue({ label: cue.label, firedAt: Date.now() });
    });
  }, [program, status, durationSeconds, distanceMeters]);

  useEffect(() => {
    if (!activeCue) return;
    const timeout = setTimeout(() => setActiveCue(null), 6000);
    return () => clearTimeout(timeout);
  }, [activeCue]);

  return { activeCue };
}
