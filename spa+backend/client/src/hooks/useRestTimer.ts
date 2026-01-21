'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

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
}

export function useRestTimer(onComplete?: () => void): UseRestTimerReturn {
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [totalDuration, setTotalDuration] = useState(0);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const onCompleteRef = useRef(onComplete);

  // Keep onComplete ref updated
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const playCompletionSound = useCallback(() => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;

      const audioContext = new AudioContext();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.value = 0.3;

      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.15);

      // Play second beep after short delay
      setTimeout(() => {
        const oscillator2 = audioContext.createOscillator();
        const gainNode2 = audioContext.createGain();

        oscillator2.connect(gainNode2);
        gainNode2.connect(audioContext.destination);

        oscillator2.frequency.value = 1000;
        oscillator2.type = 'sine';
        gainNode2.gain.value = 0.3;

        oscillator2.start();
        oscillator2.stop(audioContext.currentTime + 0.2);
      }, 150);
    } catch (error) {
      console.warn('Could not play completion sound:', error);
    }
  }, []);

  const start = useCallback((duration: number) => {
    clearTimer();
    setTotalDuration(duration);
    setTimeRemaining(duration);
    setIsComplete(false);
    setIsRunning(true);
  }, [clearTimer]);

  const pause = useCallback(() => {
    clearTimer();
    setIsRunning(false);
  }, [clearTimer]);

  const resume = useCallback(() => {
    if (timeRemaining > 0 && !isComplete) {
      setIsRunning(true);
    }
  }, [timeRemaining, isComplete]);

  const reset = useCallback(() => {
    clearTimer();
    setTimeRemaining(totalDuration);
    setIsComplete(false);
    setIsRunning(false);
  }, [clearTimer, totalDuration]);

  const skip = useCallback(() => {
    clearTimer();
    setTimeRemaining(0);
    setIsComplete(true);
    setIsRunning(false);
    playCompletionSound();
    onCompleteRef.current?.();
  }, [clearTimer, playCompletionSound]);

  // Timer effect
  useEffect(() => {
    if (!isRunning) return;

    intervalRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearTimer();
          setIsRunning(false);
          setIsComplete(true);
          playCompletionSound();
          // Use setTimeout to avoid state update during render
          setTimeout(() => {
            onCompleteRef.current?.();
          }, 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearTimer();
    };
  }, [isRunning, clearTimer, playCompletionSound]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, [clearTimer]);

  const progress = totalDuration > 0 ? (totalDuration - timeRemaining) / totalDuration : 0;

  return {
    timeRemaining,
    isRunning,
    isComplete,
    progress,
    start,
    pause,
    resume,
    reset,
    skip,
  };
}