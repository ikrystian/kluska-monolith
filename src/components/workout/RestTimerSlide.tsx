'use client';

import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SkipForward, Pause, Play, Timer } from 'lucide-react';
import { useRestTimer } from '@/hooks/useRestTimer';

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

  // Calculate circle progress
  const circumference = 2 * Math.PI * 90; // radius = 90
  const strokeDashoffset = circumference * (1 - progress);

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
    <div className="flex flex-col items-center justify-center min-h-[400px] p-4">
      <Card className="w-full max-w-sm">
        <CardContent className="pt-6 space-y-6">
          {/* Timer Header */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Timer className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Przerwa
              </span>
            </div>
          </div>

          {/* Circular Timer */}
          <div className="relative flex items-center justify-center">
            <svg className="w-48 h-48 transform -rotate-90">
              {/* Background circle */}
              <circle
                cx="96"
                cy="96"
                r="90"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className="text-secondary"
              />
              {/* Progress circle */}
              <circle
                cx="96"
                cy="96"
                r="90"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                strokeLinecap="round"
                className="text-primary transition-all duration-1000 ease-linear"
                style={{
                  strokeDasharray: circumference,
                  strokeDashoffset: strokeDashoffset,
                }}
              />
            </svg>
            {/* Time display */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-5xl font-bold font-mono">
                {formatTime(timeRemaining)}
              </span>
              <span className="text-sm text-muted-foreground mt-1">
                {isComplete ? 'Gotowe!' : isRunning ? 'Odpoczywaj' : 'Pauza'}
              </span>
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex items-center justify-center gap-4">
            <Button
              variant="outline"
              size="icon"
              className="h-12 w-12 rounded-full"
              onClick={handlePauseResume}
              disabled={isComplete}
            >
              {isRunning ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5" />
              )}
            </Button>
            <Button
              variant="default"
              size="lg"
              className="px-8"
              onClick={handleSkip}
              disabled={isComplete}
            >
              <SkipForward className="h-4 w-4 mr-2" />
              Pomiń
            </Button>
          </div>

          {/* Next Set Info */}
          <div className="text-center p-4 bg-secondary/30 rounded-lg">
            {nextSetInfo ? (
              <>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                  {nextSetInfo.isNewExercise ? 'Następne ćwiczenie' : 'Następna seria'}
                </p>
                <p className="font-semibold text-lg">
                  {nextSetInfo.isNewExercise ? (
                    nextSetInfo.exerciseName
                  ) : (
                    <>Seria {nextSetInfo.setNumber}</>
                  )}
                </p>
                {nextSetInfo.isNewExercise && (
                  <p className="text-sm text-muted-foreground">
                    Seria {nextSetInfo.setNumber}
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                  Ostatnia seria!
                </p>
                <p className="font-semibold text-lg text-green-600">
                  🎉 Koniec treningu
                </p>
              </>
            )}
          </div>

          {/* Swipe hint */}
          {isComplete && (
            <p className="text-center text-xs text-muted-foreground animate-pulse">
              Przesuń w prawo, aby kontynuować →
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}