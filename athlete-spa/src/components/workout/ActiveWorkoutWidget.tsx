'use client';

import { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useActiveWorkout } from '@/hooks/useActiveWorkout';
import { Button } from '@/components/ui/button';
import { haptic } from '@/lib/haptics';

function formatElapsed(startTime: Date): string {
  const diffMs = Math.max(0, Date.now() - startTime.getTime());
  const hours = Math.floor(diffMs / 3_600_000);
  const minutes = Math.floor((diffMs % 3_600_000) / 60_000);
  const seconds = Math.floor((diffMs % 60_000) / 1000);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return hours > 0 ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
}

/**
 * Persistent bar for a workout that is still running while the athlete browses
 * elsewhere in the app.
 *
 * Sits directly above the bottom bar as a full-width strip — the mini-player
 * pattern — and shows the running clock, the one thing worth a glance mid-rest.
 */
export function ActiveWorkoutWidget() {
  const { activeWorkout, hasActiveWorkout, isLoading } = useActiveWorkout();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [elapsedTime, setElapsedTime] = useState('00:00');

  const startTime = activeWorkout?.startTime;

  useEffect(() => {
    if (!startTime) return;

    const start = new Date(startTime as unknown as string | number | Date);
    const update = () => setElapsedTime(formatElapsed(start));

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  // Share of sets already checked off, so the bar communicates progress and not
  // just that something is running.
  const progress = useMemo(() => {
    const exercises = activeWorkout?.exercises ?? [];
    let total = 0;
    let done = 0;
    for (const exercise of exercises) {
      for (const set of exercise.sets ?? []) {
        total += 1;
        if (set.completed) done += 1;
      }
    }
    return { total, done, ratio: total > 0 ? done / total : 0 };
  }, [activeWorkout]);

  if (isLoading || !hasActiveWorkout || pathname === '/athlete/log') {
    return null;
  }

  const returnToWorkout = () => {
    haptic('tap');
    navigate(`/athlete/log?logId=${activeWorkout?.id}`);
  };

  return (
    <div
      id="mini-player"
      className="app-column fixed inset-x-0 bottom-[var(--app-bottom)] z-40 animate-in slide-in-from-bottom-4 fade-in duration-300"
    >
      <div className="relative mx-2 mb-2 overflow-hidden rounded-2xl bg-primary text-primary-foreground">
        <div className="flex items-center gap-2 py-2 pl-3 pr-2">
          <button
            type="button"
            onClick={returnToWorkout}
            className="flex min-w-0 flex-1 items-center gap-3 text-left"
            aria-label={`Wróć do treningu ${activeWorkout?.workoutName ?? ''}`}
          >
            <span className="font-display text-[1.75rem] font-bold leading-none tabular-nums">{elapsedTime}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold leading-tight">
                {activeWorkout?.workoutName || 'Trening'}
              </span>
              <span className="block text-xs leading-tight opacity-75">
                {progress.total > 0 ? `${progress.done}/${progress.total} serii` : 'W trakcie'}
              </span>
            </span>
          </button>

          <Button
            onClick={() => {
              haptic('impact');
              navigate(`/athlete/log?logId=${activeWorkout?.id}&finish=true`);
            }}
            size="sm"
            className="h-9 shrink-0 bg-primary-foreground text-primary active:bg-primary-foreground/85"
          >
            Zakończ
          </Button>
        </div>

        {/* Progress rail — flush to the bottom edge, like a player's scrubber */}
        <div className="absolute inset-x-0 bottom-0 h-0.5 bg-primary-foreground/20">
          <div
            className="h-full bg-primary-foreground transition-[width] duration-500 ease-out"
            style={{ width: `${progress.ratio * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
