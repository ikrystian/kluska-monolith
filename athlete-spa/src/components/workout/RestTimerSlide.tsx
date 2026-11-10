'use client';

import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Pause, Play, Timer, ArrowRight, Trophy, Flame, Dumbbell } from 'lucide-react';
import { useRestTimer } from '@/hooks/useRestTimer';
import { cn } from '@/lib/utils';
import { haptic } from '@/lib/haptics';

export interface RestTimerSlideProps {
  restTimeSeconds: number;
  nextSetInfo: {
    exerciseName: string;
    setNumber: number;
    totalSetsInExercise?: number;
    isNewExercise: boolean;
    targetWeight?: number;
    targetReps?: number;
    targetDuration?: number;
  } | null; // null means this was the last set of the workout
  isActive: boolean;
  onComplete: () => void;
  onSkip: () => void;
  onFinishWorkout?: () => void;
}

export function RestTimerSlide({
  restTimeSeconds,
  nextSetInfo,
  isActive,
  onComplete,
  onSkip,
  onFinishWorkout,
}: RestTimerSlideProps) {
  const hasStartedRef = useRef(false);

  const {
    timeRemaining,
    isRunning,
    isComplete,
    progress,
    start,
    pause,
    resume,
    skip,
    addTime,
  } = useRestTimer(onComplete);

  // Auto-start timer when slide becomes active
  useEffect(() => {
    if (isActive && !hasStartedRef.current && !isComplete) {
      hasStartedRef.current = true;
      start(restTimeSeconds);
    }

    if (!isActive) {
      hasStartedRef.current = false;
    }
  }, [isActive, restTimeSeconds, start, isComplete]);

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSkip = () => {
    haptic('tap');
    skip();
    onSkip();
  };

  const handlePauseResume = () => {
    haptic('tap');
    if (isRunning) {
      pause();
    } else {
      resume();
    }
  };

  const handleAddTime = (seconds: number) => {
    haptic('tap');
    if (seconds < 0 && timeRemaining <= Math.abs(seconds)) {
      handleSkip();
      return;
    }
    addTime(seconds);
  };

  const radius = 78;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - Math.min(1, Math.max(0, progress)));

  const isWorkoutEnd = nextSetInfo === null;

  return (
    <div className="flex h-full flex-col justify-between overflow-hidden rounded-3xl border border-border/70 bg-card p-4 sm:p-5 shadow-lg shadow-black/5">
      {/* Header */}
      <div className="text-center pt-1">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary/80 text-xs font-semibold text-muted-foreground">
          <Timer className="h-3.5 w-3.5 text-primary" />
          <span>{isWorkoutEnd ? 'Trening zakończony!' : 'Przerwa między seriami'}</span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {isWorkoutEnd
            ? 'Zaliczyłeś wszystkie serie dzisiejszego treningu!'
            : 'Zregeneruj siły, napij się wody i przygotuj do kolejnej serii'}
        </p>
      </div>

      {/* Radial Glowing Timer */}
      <div className="relative flex flex-col items-center justify-center my-auto py-2">
        <div className="relative flex items-center justify-center">
          <svg className="w-52 h-52 sm:w-56 sm:h-56 -rotate-90">
            {/* Background ring */}
            <circle
              cx="104"
              cy="104"
              r={radius}
              stroke="currentColor"
              strokeWidth="9"
              fill="none"
              className="text-secondary/50"
            />
            {/* Active animated countdown ring with neon glow */}
            <circle
              cx="104"
              cy="104"
              r={radius}
              stroke="currentColor"
              strokeWidth="9"
              fill="none"
              strokeLinecap="round"
              className={cn(
                'transition-all duration-1000 ease-linear',
                isComplete
                  ? 'text-volt drop-shadow-[0_0_12px_rgba(200,255,0,0.6)]'
                  : 'text-primary drop-shadow-[0_0_12px_rgba(235,90,30,0.4)]'
              )}
              style={{
                strokeDasharray: circumference,
                strokeDashoffset,
              }}
            />
          </svg>

          {/* Time & status inside ring */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {isWorkoutEnd ? (
              <div className="flex flex-col items-center">
                <Trophy className="h-12 w-12 text-volt animate-bounce mb-1" />
                <span className="font-display text-4xl font-bold uppercase tracking-wide text-foreground">
                  Gotowe!
                </span>
                <span className="text-xs font-semibold text-volt mt-1">100% zrobione</span>
              </div>
            ) : (
              <>
                <span className="font-display text-6xl font-bold tabular-nums text-foreground tracking-tight">
                  {formatTime(timeRemaining)}
                </span>
                <span className="text-xs font-semibold mt-1">
                  {isComplete ? (
                    <span className="text-volt font-bold flex items-center gap-1">
                      <Flame className="h-3.5 w-3.5" /> Gotowy do serii!
                    </span>
                  ) : isRunning ? (
                    <span className="text-muted-foreground">Odpoczynek</span>
                  ) : (
                    <span className="text-amber-500 font-bold">Pauza</span>
                  )}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Quick timer adjustment controls */}
        {!isWorkoutEnd && (
          <div className="flex items-center justify-center gap-2 mt-4">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-9 px-3 rounded-xl text-xs font-semibold tabular-nums active:scale-95"
              onClick={() => handleAddTime(-15)}
              disabled={isComplete}
            >
              -15s
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-11 w-11 rounded-2xl shrink-0 shadow-xs active:scale-90"
              onClick={handlePauseResume}
              disabled={isComplete}
              aria-label={isRunning ? 'Pauza' : 'Wznów'}
            >
              {isRunning ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 fill-current ml-0.5" />}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-9 px-3 rounded-xl text-xs font-semibold tabular-nums active:scale-95"
              onClick={() => handleAddTime(15)}
              disabled={isComplete}
            >
              +15s
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-9 px-3 rounded-xl text-xs font-semibold tabular-nums active:scale-95"
              onClick={() => handleAddTime(30)}
              disabled={isComplete}
            >
              +30s
            </Button>
          </div>
        )}
      </div>

      {/* Next Set Preview Card */}
      <div className="pt-2">
        {nextSetInfo ? (
          <div className="rounded-2xl border border-border/60 bg-secondary/30 p-3.5 transition-all">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-[11px] font-bold tracking-wider uppercase text-muted-foreground flex items-center gap-1">
                <Dumbbell className="h-3.5 w-3.5 text-primary" />
                {nextSetInfo.isNewExercise ? 'Następne ćwiczenie' : 'Następna seria'}
              </span>
              <span className="text-xs font-semibold text-primary tabular-nums">
                Seria {nextSetInfo.setNumber}
                {nextSetInfo.totalSetsInExercise ? `/${nextSetInfo.totalSetsInExercise}` : ''}
              </span>
            </div>
            <p className="font-display text-base font-bold uppercase tracking-tight text-foreground truncate">
              {nextSetInfo.exerciseName}
            </p>
            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
              {nextSetInfo.targetWeight !== undefined && nextSetInfo.targetWeight > 0 && (
                <span className="font-semibold text-foreground tabular-nums">
                  {nextSetInfo.targetWeight} kg
                </span>
              )}
              {nextSetInfo.targetWeight !== undefined && nextSetInfo.targetWeight > 0 && nextSetInfo.targetReps !== undefined && (
                <span>×</span>
              )}
              {nextSetInfo.targetReps !== undefined && nextSetInfo.targetReps > 0 && (
                <span className="font-semibold text-foreground tabular-nums">
                  {nextSetInfo.targetReps} powt.
                </span>
              )}
              {nextSetInfo.targetDuration !== undefined && nextSetInfo.targetDuration > 0 && (
                <span className="font-semibold text-foreground tabular-nums">
                  {nextSetInfo.targetDuration} s
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-volt/30 bg-volt/10 p-3.5 text-center">
            <p className="font-semibold text-sm text-volt">
              Wszystkie zaplanowane ćwiczenia ukończone!
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Możesz teraz przejść do podsumowania i zapisać sesję.
            </p>
          </div>
        )}
      </div>

      {/* Primary Action Button */}
      <div className="pt-3 border-t border-border/50">
        {isWorkoutEnd ? (
          <Button
            type="button"
            size="lg"
            variant="volt"
            className="w-full h-13 text-base font-bold shadow-md shadow-lime/20"
            onClick={onFinishWorkout || handleSkip}
          >
            <span className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Zakończ i podsumuj trening
            </span>
          </Button>
        ) : (
          <Button
            type="button"
            size="lg"
            variant="volt"
            className="w-full h-13 text-base font-bold shadow-md shadow-lime/20"
            onClick={handleSkip}
          >
            <span className="flex items-center gap-2">
              Zacznij kolejną serię
              <ArrowRight className="h-5 w-5" />
            </span>
          </Button>
        )}
      </div>
    </div>
  );
}
