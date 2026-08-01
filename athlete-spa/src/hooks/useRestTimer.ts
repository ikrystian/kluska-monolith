'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { haptic } from '@/lib/haptics';

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
 */
export function useRestTimer(onComplete?: () => void): UseRestTimerReturn {
  const [state, setState] = useState<TimerState>(IDLE);
  const [timeRemaining, setTimeRemaining] = useState(0);

  const onCompleteRef = useRef(onComplete);
  const completedRef = useRef(false);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const playCompletionSound = useCallback(() => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;

      const audioContext = new AudioContext();
      const beep = (frequency: number, at: number) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';
        gainNode.gain.value = 0.3;

        oscillator.start(audioContext.currentTime + at);
        oscillator.stop(audioContext.currentTime + at + 0.15);
      };

      beep(800, 0);
      beep(1000, 0.2);
    } catch (error) {
      console.warn('Could not play completion sound:', error);
    }
  }, []);

  /** Fires the completion side effects exactly once per countdown. */
  const complete = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    setState(prev => ({ ...prev, deadline: null, pausedRemaining: null, isComplete: true }));
    setTimeRemaining(0);
    playCompletionSound();
    // The beep is inaudible in a gym and won't play at all on a locked screen,
    // so vibration is the signal that actually reaches the athlete.
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
