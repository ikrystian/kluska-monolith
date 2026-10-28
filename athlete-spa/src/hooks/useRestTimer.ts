'use client';

import { useState, useEffect, useCallback, useRef, useId } from 'react';
import { haptic } from '@/lib/haptics';
import { cancelCue, playCue, preloadCue, scheduleCue } from '@/lib/cue-audio';

interface UseRestTimerReturn {
  timeRemaining: number;
  isRunning: boolean;
  isComplete: boolean;
  progress: number; // 0 to 1
  start: (duration: number) => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  skip: () => void;
  addTime: (seconds: number) => void;
}

interface TimerState {
  /** Epoch ms when the countdown ends; null while paused or idle. */
  deadline: number | null;
  /** Seconds left at the moment of pausing; null while running. */
  pausedRemaining: number | null;
  totalDuration: number;
  isComplete: boolean;
}

const COMPLETION_SOUND = '/ronnie_lightweight-baby.mp3';

const IDLE: TimerState = { deadline: null, pausedRemaining: null, totalDuration: 0, isComplete: false };

/** Remaining whole seconds until `deadline`, never negative. */
function secondsUntil(deadline: number): number {
  return Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
}

/**
 * Countdown for the rest period between sets.
 *
 * The countdown is anchored to a wall-clock deadline rather than accumulated
 * from ticks: Android throttles (and eventually stops) timers in a backgrounded
 * WebView, so a tick-counting timer drifts badly the moment the athlete locks
 * the phone during a rest — exactly when the timer matters most. Ticks here
 * only drive re-renders; the value always comes from `Date.now()`, and the
 * timer is re-evaluated as soon as the page becomes visible again.
 *
 * The same goes for the completion sound: on Android it is scheduled natively
 * for the deadline (lib/cue-audio.ts), so it plays — over Spotify, ducking it —
 * with the app minimised, instead of when the athlete next opens the app.
 */
export function useRestTimer(onComplete?: () => void): UseRestTimerReturn {
  const [state, setState] = useState<TimerState>(IDLE);
  const [timeRemaining, setTimeRemaining] = useState(0);

  const onCompleteRef = useRef(onComplete);
  const completedRef = useRef(false);
  const instanceId = useId();
  /** Id of the cue scheduled for the running countdown, so completing it doesn't play twice. */
  const cueIdRef = useRef<string | null>(null);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    preloadCue(COMPLETION_SOUND);
  }, []);

  const playCompletionSound = useCallback(() => {
    // A no-op when the native schedule already played this countdown's cue.
    playCue(COMPLETION_SOUND, cueIdRef.current ?? undefined);
    cueIdRef.current = null;
  }, []);

  /** Fires the completion side effects exactly once per countdown. */
  const complete = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    setState(prev => ({ ...prev, deadline: null, pausedRemaining: null, isComplete: true }));
    setTimeRemaining(0);
    playCompletionSound();
    // The sound is easy to miss in a loud gym, so vibration backs it up.
    haptic('success');
    onCompleteRef.current?.();
  }, [playCompletionSound]);

  const start = useCallback((duration: number) => {
    completedRef.current = false;
    setState({
      deadline: Date.now() + duration * 1000,
      pausedRemaining: null,
      totalDuration: duration,
      isComplete: false,
    });
    setTimeRemaining(duration);
  }, []);

  const pause = useCallback(() => {
    setState(prev =>
      prev.deadline === null
        ? prev
        : { ...prev, deadline: null, pausedRemaining: secondsUntil(prev.deadline) }
    );
  }, []);

  const resume = useCallback(() => {
    setState(prev => {
      if (prev.pausedRemaining === null || prev.pausedRemaining <= 0 || prev.isComplete) return prev;
      return { ...prev, deadline: Date.now() + prev.pausedRemaining * 1000, pausedRemaining: null };
    });
  }, []);

  const reset = useCallback(() => {
    completedRef.current = false;
    setState(prev => ({ ...prev, deadline: null, pausedRemaining: null, isComplete: false }));
    setTimeRemaining(state.totalDuration);
  }, [state.totalDuration]);

  const skip = useCallback(() => {
    complete();
  }, [complete]);

  const addTime = useCallback((seconds: number) => {
    setState(prev => ({
      ...prev,
      totalDuration: prev.totalDuration + seconds,
      deadline: prev.deadline === null ? null : prev.deadline + seconds * 1000,
      pausedRemaining: prev.pausedRemaining === null ? null : prev.pausedRemaining + seconds,
    }));
    setTimeRemaining(prev => prev + seconds);
  }, []);

  // Drive re-renders while running. Sub-second polling keeps the displayed
  // value from lagging when a tick lands just after a second boundary.
  const { deadline } = state;

  // Hand the sound to the native scheduler, which fires even when this
  // WebView is frozen in the background. Every deadline is its own cue, so
  // pausing or adding time cancels the old one and schedules afresh.
  useEffect(() => {
    if (deadline === null) return;
    const id = `rest-${instanceId}-${deadline}`;
    if (!scheduleCue(id, COMPLETION_SOUND, deadline)) return;
    cueIdRef.current = id;
    return () => {
      // Past the deadline the cue is due or already played — leave it alone.
      if (Date.now() >= deadline) return;
      cancelCue(id);
      if (cueIdRef.current === id) cueIdRef.current = null;
    };
  }, [deadline, instanceId]);

  useEffect(() => {
    if (deadline === null) return;

    const sync = () => {
      const remaining = secondsUntil(deadline);
      setTimeRemaining(remaining);
      if (remaining === 0) complete();
    };

    sync();
    const interval = setInterval(sync, 250);

    // Coming back from the background can mean the deadline passed long ago;
    // sync immediately instead of waiting for the next tick.
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') sync();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [deadline, complete]);

  const isRunning = deadline !== null;
  const progress =
    state.totalDuration > 0 ? (state.totalDuration - timeRemaining) / state.totalDuration : 0;

  return {
    timeRemaining,
    isRunning,
    isComplete: state.isComplete,
    progress,
    start,
    pause,
    resume,
    reset,
    skip,
    addTime,
  };
}
