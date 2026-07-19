'use client';

import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SkipForward, Pause, Play, Timer, Plus, ArrowRight } from 'lucide-react';
import { useRestTimer } from '@/hooks/useRestTimer';
import { cn } from '@/lib/utils';

interface RestTimerSlideProps {
  restTimeSeconds: number;
  nextSetInfo: {
    exerciseName: string;
    setNumber: number;
    isNewExercise: boolean;
  } | null; // null means this is the last set of the workout
  isActive: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

export function RestTimerSlide({
  restTimeSeconds,
  nextSetInfo,
  isActive,
  onComplete,
  onSkip,
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

    // Reset the ref when slide becomes inactive
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
    skip();
    onSkip();
  };

  const handlePauseResume = () => {
    if (isRunning) {
      pause();
    } else {
      resume();
    }
  };

  return (
    <div className="flex h-full items-center justify-center px-1">
      <Card className="w-full max-w-sm">
        <CardContent className="p-4 space-y-4">
          {/* Timer Header */}
          <div className="flex items-center justify-center gap-2">
            <Timer className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Przerwa
            </span>
          </div>

          {/* Circular Timer */}
          <div className="relative flex items-center justify-center">
            <svg className="w-44 h-44 -rotate-90">
              <circle
                cx="88"
                cy="88"
                r="80"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className="text-secondary"
              />
              <circle
                cx="88"
                cy="88"
                r="80"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                strokeLinecap="round"
                className={cn(
                  'transition-all duration-1000 ease-linear',
                  isComplete ? 'text-green-500' : 'text-primary'
                )}
                style={{
                  strokeDasharray: 2 * Math.PI * 80,
                  strokeDashoffset: (2 * Math.PI * 80) * (1 - progress),
                }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-bold font-mono tabular-nums">
                {formatTime(timeRemaining)}
              </span>
              <span className="text-xs text-muted-foreground mt-1">
                {isComplete ? 'Gotowe! ✓' : isRunning ? 'Odpoczywaj' : 'Pauza'}
              </span>
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex items-center justify-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-11 w-11 rounded-full shrink-0"
              onClick={handlePauseResume}
              disabled={isComplete}
              aria-label={isRunning ? 'Pauza' : 'Wznów'}
            >
              {isRunning ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-full shrink-0 gap-1 px-3"
              onClick={() => addTime(15)}
              disabled={isComplete}
            >
              <Plus className="h-4 w-4" />
              15s
            </Button>
            <Button
              type="button"
              variant="default"
              className="h-11 flex-1"
              onClick={handleSkip}
              disabled={isComplete}
            >
              <SkipForward className="h-4 w-4 mr-2" />
              Pomiń
            </Button>
          </div>

          {/* Next Set Info */}
          <div className="flex items-center gap-3 rounded-xl bg-secondary/40 p-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <ArrowRight className="h-4 w-4" />
            </div>
            {nextSetInfo ? (
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {nextSetInfo.isNewExercise ? 'Następne ćwiczenie' : 'Następna seria'}
                </p>
                <p className="truncate font-semibold text-sm">
                  {nextSetInfo.isNewExercise ? nextSetInfo.exerciseName : `Seria ${nextSetInfo.setNumber}`}
                </p>
              </div>
            ) : (
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Ostatnia seria!</p>
                <p className="font-semibold text-sm text-green-600">🎉 Koniec treningu</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
