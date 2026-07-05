'use client';

import { useMemo } from 'react';
import { Exercise, WorkoutLog } from '@/lib/types';
import { useCollection } from '@/lib/db-hooks';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Loader2, LineChart as ChartIcon } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { ProgressDialogProps } from './types';

export function ProgressDialog({
  exercise,
  userId,
  open,
  onOpenChange,
}: ProgressDialogProps) {
  const { data: logs, isLoading } = useCollection<WorkoutLog>(
    userId ? 'workoutLogs' : null,
    userId ? { athleteId: userId, status: 'completed' } : undefined
  );

  const chartData = useMemo(() => {
    if (!logs || !exercise) {
      console.log('[ProgressDialog] No logs or exercise:', { logsCount: logs?.length, exerciseId: exercise?.id });
      return [];
    }

    console.log('[ProgressDialog] Processing', logs.length, 'logs for exercise:', exercise.name, 'ID:', exercise.id);

    // Filter logs that contain this exercise
    const relevantLogs = logs.filter(log => {
      if (!log.exercises || !Array.isArray(log.exercises)) {
        console.log('[ProgressDialog] Log has no exercises array:', log.id);
        return false;
      }

      const hasExercise = log.exercises.some(ex => {
        // Check multiple possible ID locations for compatibility
        const exId = ex.exercise?.id || ex.exerciseId;
        return exId === exercise.id;
      });

      if (hasExercise) {
        console.log('[ProgressDialog] Found exercise in log:', log.id, 'at', log.endTime);
      }

      return hasExercise;
    });

    console.log('[ProgressDialog] Found', relevantLogs.length, 'relevant logs');

    const data = relevantLogs
      .map(log => {
        // Find the exercise in this log
        const exLog = log.exercises.find(ex => {
          const exId = ex.exercise?.id || ex.exerciseId;
          return exId === exercise.id;
        });

        if (!exLog || !exLog.sets || !Array.isArray(exLog.sets)) {
          console.log('[ProgressDialog] No valid sets found in log:', log.id);
          return null;
        }

        // Calculate max value based on exercise type
        let value = 0;
        const sets = exLog.sets;

        if (exercise.type === 'weight' || !exercise.type) {
          // For weight exercises, find max weight
          const weights = sets.map(s => s.weight || 0).filter(w => w > 0);
          value = weights.length > 0 ? Math.max(...weights) : 0;
        } else if (exercise.type === 'reps') {
          // For rep-based exercises, find max reps
          const reps = sets.map(s => s.reps || 0).filter(r => r > 0);
          value = reps.length > 0 ? Math.max(...reps) : 0;
        } else if (exercise.type === 'duration') {
          // For duration exercises, find max duration
          const durations = sets.map(s => s.duration || 0).filter(d => d > 0);
          value = durations.length > 0 ? Math.max(...durations) : 0;
        }

        if (value === 0) {
          console.log('[ProgressDialog] No valid values found in log:', log.id);
          return null;
        }

        console.log('[ProgressDialog] Data point:', { date: log.endTime, value, type: exercise.type });

        return {
          rawDate: new Date(log.endTime as unknown as string),
          date: format(new Date(log.endTime as unknown as string), 'd MMM', { locale: pl }),
          value: value
        };
      })
      .filter((item): item is { rawDate: Date; date: string; value: number } => item !== null)
      .sort((a, b) => a.rawDate.getTime() - b.rawDate.getTime());

    console.log('[ProgressDialog] Final chart data points:', data.length);
    return data;
  }, [logs, exercise]);

  if (!exercise) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="font-headline">Postęp: {exercise.name}</DialogTitle>
          <DialogDescription>
            Twoje najlepsze wyniki w czasie.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="h-[300px] flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : chartData.length < 2 ? (
          <div className="h-[300px] flex flex-col items-center justify-center text-center p-4 border-2 border-dashed rounded-lg">
            <ChartIcon className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Za mało danych, aby wyświetlić wykres.</p>
            <p className="text-sm text-muted-foreground">
              {chartData.length === 0
                ? 'Nie znaleziono żadnych ukończonych treningów z tym ćwiczeniem.'
                : 'Wykonaj to ćwiczenie w co najmniej dwóch treningach, aby zobaczyć postęp.'}
            </p>
            {chartData.length === 1 && (
              <p className="text-xs text-muted-foreground mt-2">
                Znaleziono 1 trening. Dodaj jeszcze jeden, aby zobaczyć wykres.
              </p>
            )}
          </div>
        ) : (
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={10} />
                <YAxis tickLine={false} axisLine={false} tickMargin={10} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  formatter={(value: number) => [`${value} ${exercise.type === 'duration' ? 's' : (exercise.type === 'reps' ? 'powt.' : 'kg')}`, 'Wynik']}
                />
                <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 4, fill: "hsl(var(--primary))" }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}