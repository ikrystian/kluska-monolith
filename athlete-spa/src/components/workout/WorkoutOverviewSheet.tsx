'use client';

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Check, Dumbbell, Plus, Trash2, ArrowRight } from 'lucide-react';
import { AddExerciseSheet } from '@/components/workout/AddExerciseSheet';
import { cn } from '@/lib/utils';
import { haptic } from '@/lib/haptics';
import { SetType } from '@/lib/types';
import { getSetTypeConfig } from '@/lib/set-type-config';

export interface WorkoutOverviewExercise {
  exerciseId: string;
  name: string;
  sets: {
    number?: number;
    type?: SetType;
    reps?: number;
    weight?: number;
    duration?: number;
    completed?: boolean;
  }[];
}

interface WorkoutOverviewSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exercises: WorkoutOverviewExercise[];
  currentExerciseIndex: number;
  currentSetIndex: number;
  onJumpToSet: (exerciseIndex: number, setIndex: number) => void;
  onAddExercise?: (exerciseId: string) => void;
  onRemoveExercise?: (exerciseIndex: number) => void;
  onFinishWorkout?: () => void;
}

export function WorkoutOverviewSheet({
  open,
  onOpenChange,
  exercises,
  currentExerciseIndex,
  currentSetIndex,
  onJumpToSet,
  onAddExercise,
  onRemoveExercise,
  onFinishWorkout,
}: WorkoutOverviewSheetProps) {
  const totalSets = exercises.reduce((acc, ex) => acc + (ex.sets?.length || 0), 0);
  const completedSets = exercises.reduce(
    (acc, ex) => acc + (ex.sets?.filter((s) => s.completed).length || 0),
    0
  );
  const progressPercent = totalSets > 0 ? (completedSets / totalSets) * 100 : 0;

  const handleSelectSet = (exerciseIndex: number, setIndex: number) => {
    haptic('tap');
    onJumpToSet(exerciseIndex, setIndex);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="flex h-[82dvh] flex-col p-0">
        {/* Header */}
        <div className="p-4 border-b border-border/60">
          <SheetHeader className="text-left space-y-1">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-lg font-bold">Przegląd treningu</SheetTitle>
              <span className="text-xs font-bold text-primary tabular-nums">
                {completedSets}/{totalSets} serii
              </span>
            </div>
            <SheetDescription className="text-xs">
              Wybierz serię, aby natychmiast do niej przejść.
            </SheetDescription>
          </SheetHeader>
          <Progress value={progressPercent} className="h-1.5 mt-3" />
        </div>

        {/* Exercises List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 no-scrollbar">
          {exercises.map((ex, exIndex) => {
            const isCurrentExercise = exIndex === currentExerciseIndex;
            const exCompletedSets = ex.sets.filter((s) => s.completed).length;
            const isAllDone = ex.sets.length > 0 && exCompletedSets === ex.sets.length;

            return (
              <div
                key={ex.exerciseId || exIndex}
                className={cn(
                  'rounded-2xl border p-3.5 transition-all',
                  isCurrentExercise
                    ? 'border-primary/50 bg-secondary/30'
                    : 'border-border/60 bg-card'
                )}
              >
                {/* Exercise Header */}
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={cn(
                        'grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold tabular-nums',
                        isAllDone
                          ? 'bg-volt/20 text-volt'
                          : isCurrentExercise
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-secondary text-muted-foreground'
                      )}
                    >
                      {isAllDone ? <Check className="h-3.5 w-3.5" /> : exIndex + 1}
                    </span>
                    <h3 className="font-display text-base font-bold uppercase tracking-tight truncate text-foreground">
                      {ex.name}
                    </h3>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-xs font-medium text-muted-foreground tabular-nums">
                      {exCompletedSets}/{ex.sets.length}
                    </span>
                    {onRemoveExercise && exercises.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          haptic('tap');
                          onRemoveExercise(exIndex);
                        }}
                        className="ml-1 p-1 text-muted-foreground hover:text-destructive rounded-lg transition-colors"
                        aria-label={`Usuń ${ex.name}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Set Pills */}
                <div className="flex flex-wrap gap-1.5">
                  {ex.sets.map((set, setIdx) => {
                    const isCurrent = isCurrentExercise && setIdx === currentSetIndex;
                    const config = set.type ? getSetTypeConfig(set.type) : null;

                    return (
                      <button
                        key={setIdx}
                        type="button"
                        onClick={() => handleSelectSet(exIndex, setIdx)}
                        className={cn(
                          'flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold tabular-nums transition-all active:scale-95 border',
                          set.completed
                            ? 'border-volt/30 bg-volt/15 text-volt'
                            : isCurrent
                              ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary'
                              : 'border-border/60 bg-secondary/50 text-muted-foreground hover:text-foreground'
                        )}
                      >
                        <span>S{setIdx + 1}</span>
                        {set.completed && <Check className="h-3 w-3" />}
                        {set.weight !== undefined && set.weight > 0 && (
                          <span className="opacity-80">{set.weight}kg</span>
                        )}
                        {set.reps !== undefined && set.reps > 0 && (
                          <span className="opacity-80">×{set.reps}</span>
                        )}
                        {set.duration !== undefined && set.duration > 0 && (
                          <span className="opacity-80">{set.duration}s</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-border/60 bg-background/95 backdrop-blur flex items-center gap-2.5">
          {onAddExercise && (
            <AddExerciseSheet
              onAddExercise={onAddExercise}
              trigger={
                <Button type="button" variant="outline" className="flex-1 h-11 gap-1.5 font-semibold text-xs">
                  <Plus className="h-4 w-4" />
                  Dodaj ćwiczenie
                </Button>
              }
            />
          )}

          {onFinishWorkout && (
            <Button
              type="button"
              variant="volt"
              onClick={() => {
                onOpenChange(false);
                onFinishWorkout();
              }}
              className="flex-1 h-11 font-bold text-xs"
            >
              Zakończ trening
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
