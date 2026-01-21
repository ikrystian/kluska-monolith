'use client';

import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useActiveWorkout } from '@/hooks/useActiveWorkout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dumbbell, Clock, ArrowRight } from 'lucide-react';

/**
 * Floating widget that appears when there's an active workout in progress.
 * Shows workout name, elapsed time, and a button to return to the workout.
 * Hidden when on the /athlete/log page.
 */
export function ActiveWorkoutWidget() {
  const { activeWorkout, hasActiveWorkout, isLoading } = useActiveWorkout();
  const location = useLocation();
  const navigate = useNavigate();
  const [elapsedTime, setElapsedTime] = useState<string>('00:00');

  // Calculate and update elapsed time every second
  useEffect(() => {
    if (!activeWorkout?.startTime) return;

    const calculateElapsed = () => {
      const startTime = new Date(activeWorkout.startTime as unknown as string | number | Date);
      const now = new Date();
      const diffMs = now.getTime() - startTime.getTime();

      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

      if (hours > 0) {
        setElapsedTime(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      } else {
        setElapsedTime(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      }
    };

    // Calculate immediately
    calculateElapsed();

    // Update every second
    const interval = setInterval(calculateElapsed, 1000);

    return () => clearInterval(interval);
  }, [activeWorkout?.startTime]);

  // Don't show widget on the log page or while loading
  if (isLoading || !hasActiveWorkout || location.pathname === '/athlete/log') {
    return null;
  }

  const handleReturnToWorkout = () => {
    navigate(`/athlete/log?logId=${activeWorkout?.id}`);
  };

  const handleFinishWorkout = () => {
    navigate(`/athlete/log?logId=${activeWorkout?.id}&finish=true`);
  };

  return (
    <div className="fixed bottom-20 right-4 z-40 animate-in slide-in-from-right-5 fade-in duration-300 md:bottom-4">
      <Card className="w-72 shadow-lg border-primary/20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Dumbbell className="h-5 w-5 text-primary" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Aktywny Trening
              </p>
              <p className="font-semibold truncate" title={activeWorkout?.workoutName}>
                {activeWorkout?.workoutName || 'Trening'}
              </p>
              <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                <Clock className="h-3 w-3" />
                <span className="font-mono">{elapsedTime}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-2 mt-3">
            <Button
              onClick={handleReturnToWorkout}
              className="flex-1"
              size="sm"
            >
              Wróć
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              onClick={handleFinishWorkout}
              variant="secondary"
              className="flex-1"
              size="sm"
            >
              Zakończ
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}