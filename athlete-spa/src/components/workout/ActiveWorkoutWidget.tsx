'use client';

import { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useActiveWorkout } from '@/hooks/useActiveWorkout';
import { Button } from '@/components/ui/button';
import { Dumbbell, ChevronUp } from 'lucide-react';
import { haptic } from '@/lib/haptics';
import { cn } from '@/lib/utils';

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
 * pattern — rather than as a floating card in the corner, which overlapped the
 * bottom navigation and any per-page action button underneath it.
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
      className={cn(
        'fixed inset-x-4 z-40 mx-auto max-w-md animate-in slide-in-from-bottom-4 fade-in duration-300',
        // Clears the bottom bar on phones; on desktop there is no bottom bar.
        'bottom-[calc(5.5rem+env(safe-area-inset-bottom))] md:inset-x-auto md:bottom-4 md:right-4 md:mx-0 md:w-80'
      )}
    >
      <div className="overflow-hidden rounded-[1.5rem] border border-primary/25 bg-background/90 shadow-lifted backdrop-blur-2xl">
        <div className="flex items-center gap-3 p-2.5">
          <button
            type="button"
            onClick={returnToWorkout}
            className="flex min-w-0 flex-1 items-center gap-3 text-left"
            aria-label={`Wróć do treningu ${activeWorkout?.workoutName ?? ''}`}
          >
            <span className="hero-ember grid h-11 w-11 shrink-0 place-items-center rounded-xl text-white shadow-glow">
              <Dumbbell className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span className="truncate font-semibold leading-tight">
                  {activeWorkout?.workoutName || 'Trening'}
                </span>
                <span className="shrink-0 font-mono text-sm tabular-nums text-primary">{elapsedTime}</span>
              </span>
              <span className="mt-0.5 block text-[11px] text-muted-foreground">
                {progress.total > 0 ? `${progress.done}/${progress.total} serii` : 'W trakcie'}
              </span>
            </span>
            <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
          </button>

          <Button
            onClick={() => {
              haptic('impact');
              navigate(`/athlete/log?logId=${activeWorkout?.id}&finish=true`);
            }}
            variant="secondary"
            size="sm"
            className="shrink-0 rounded-xl"
          >
            Zakończ
          </Button>
        </div>

        {/* Progress rail — flush to the bottom edge, like a player's scrubber */}
        <div className="h-1 w-full bg-secondary">
          <div
            className="hero-ember h-full transition-[width] duration-500 ease-out"
            style={{ width: `${progress.ratio * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
