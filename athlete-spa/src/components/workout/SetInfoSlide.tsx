'use client';

import { useState } from 'react';
import {
  Minus,
  Plus,
  Dumbbell,
  Repeat,
  Timer,
  AlertCircle,
  Lightbulb,
  Check,
  Info,
  Sparkles,
  History,
  PlusCircle,
} from 'lucide-react';
import { SetType, type Exercise } from '@/lib/types';
import { type ExerciseType, getSetTypeConfig } from '@/lib/set-type-config';
import { SetTypeModal } from '@/components/workout/SetTypeModal';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { haptic } from '@/lib/haptics';
import { PlateCalculator } from '@/components/workout/PlateCalculator';
import { RpeSelector } from '@/components/workout/RpeSelector';
import { ExerciseDetailDialog } from '@/components/shared/exercises/ExerciseDetailDialog';
import { useExerciseHistory } from '@/hooks/useExerciseHistory';
import { ExerciseHistoryBadge } from '@/components/workout/ExerciseProgressIndicator';

export interface SetInfoSlideProps {
  exerciseName: string;
  exerciseDetails?: Exercise;
  setIndex: number;
  totalSets: number;
  setType: SetType;
  targetReps?: number;
  targetWeight?: number;
  targetDuration?: number;
  actualReps?: number;
  actualWeight?: number;
  actualDuration?: number;
  rpe?: number;
  tempo?: string;
  tip?: string;
  onRepsChange: (value: number) => void;
  onWeightChange: (value: number) => void;
  onDurationChange?: (value: number) => void;
  onRpeChange?: (value: number | undefined) => void;
  onSetTypeChange?: (value: SetType) => void;
  onDeleteSet?: () => void;
  onAddSet?: () => void;
  userId?: string | null;
  isCompleted?: boolean;
  validationError?: string | null;
  onStartEditing?: () => void;
  onConfirm?: () => void;
}

const exerciseTypeIcons: Record<ExerciseType, React.ReactNode> = {
  weight: <Dumbbell className="h-4 w-4" />,
  reps: <Repeat className="h-4 w-4" />,
  duration: <Timer className="h-4 w-4" />,
};

// Ergonomic, thumb-friendly numeric stepper with quick delta adjustment chips
function Stepper({
  label,
  unit,
  value,
  target,
  step,
  min = 0,
  hasError,
  isCompleted,
  quickDeltas,
  onChange,
  onFocus,
  action,
}: {
  label: string;
  unit: string;
  value: number | undefined;
  target?: number;
  step: number;
  min?: number;
  hasError?: boolean;
  isCompleted?: boolean;
  quickDeltas?: number[];
  onChange: (value: number) => void;
  onFocus?: () => void;
  action?: React.ReactNode;
}) {
  const current = value ?? 0;
  const clamp = (n: number) => Math.max(min, Math.round(n * 10) / 10);

  const applyDelta = (delta: number) => {
    onFocus?.();
    haptic('tap');
    onChange(clamp(current + delta));
  };

  return (
    <div
      className={cn(
        'rounded-2xl border p-3 transition-all duration-200',
        isCompleted
          ? 'bg-volt/5 border-volt/30 shadow-xs'
          : hasError
            ? 'bg-destructive/5 border-destructive/40 shadow-xs'
            : 'bg-secondary/40 border-border/50 hover:border-border/80'
      )}
    >
      {/* Label, Target & Optional Action */}
      <div className="flex items-center justify-between gap-2 px-0.5 mb-2">
        <span className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">{label}</span>
        <div className="flex items-center gap-2">
          {target !== undefined && target > 0 && (
            <span className="text-xs font-medium text-muted-foreground/80 tabular-nums">
              cel: {target}{unit ? ` ${unit}` : ''}
            </span>
          )}
          {action}
        </div>
      </div>

      {/* Main +/- Stepper row */}
      <div className="flex items-center gap-2.5">
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="h-12 w-12 shrink-0 rounded-2xl text-xl shadow-xs active:scale-90 transition-transform"
          onClick={() => applyDelta(-step)}
          aria-label={`Zmniejsz ${label.toLowerCase()}`}
        >
          <Minus className="h-5 w-5" />
        </Button>

        <div className="relative flex-1 flex items-center justify-center">
          <input
            type="number"
            inputMode="decimal"
            value={value !== undefined && value !== null ? value : ''}
            onFocus={onFocus}
            onChange={(e) => {
              const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
              onChange(clamp(isNaN(val) ? 0 : val));
            }}
            placeholder="0"
            className={cn(
              'w-full bg-transparent text-center font-display text-4xl font-bold tabular-nums outline-none',
              'placeholder:text-muted-foreground/30 text-foreground'
            )}
          />
          {unit && (
            <span className="pointer-events-none absolute right-2 bottom-1 text-xs font-bold uppercase text-muted-foreground">
              {unit}
            </span>
          )}
        </div>

        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="h-12 w-12 shrink-0 rounded-2xl text-xl shadow-xs active:scale-90 transition-transform"
          onClick={() => applyDelta(step)}
          aria-label={`Zwiększ ${label.toLowerCase()}`}
        >
          <Plus className="h-5 w-5" />
        </Button>
      </div>

      {/* Quick adjustment chips */}
      {quickDeltas && quickDeltas.length > 0 && (
        <div className="flex items-center justify-center gap-1.5 mt-2.5 pt-2 border-t border-border/40">
          {quickDeltas.map((delta) => (
            <button
              key={delta}
              type="button"
              onClick={() => applyDelta(delta)}
              className={cn(
                'h-7 px-2 rounded-lg text-xs font-semibold tabular-nums transition-all active:scale-90',
                delta > 0
                  ? 'bg-secondary hover:bg-secondary/80 text-foreground'
                  : 'bg-muted/60 hover:bg-muted text-muted-foreground'
              )}
            >
              {delta > 0 ? `+${delta}` : delta}
              {unit ? ` ${unit}` : ''}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function SetInfoSlide({
  exerciseName,
  exerciseDetails,
  setIndex,
  totalSets,
  setType,
  targetReps,
  targetWeight,
  targetDuration,
  actualReps,
  actualWeight,
  actualDuration,
  rpe,
  tempo,
  tip,
  onRepsChange,
  onWeightChange,
  onDurationChange,
  onRpeChange,
  onSetTypeChange,
  onDeleteSet,
  onAddSet,
  userId,
  isCompleted,
  validationError,
  onStartEditing,
  onConfirm,
}: SetInfoSlideProps) {
  const [tipExpanded, setTipExpanded] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const exerciseType: ExerciseType = exerciseDetails?.type || 'weight';
  const setTypeConfig = getSetTypeConfig(setType);

  const repsError = !!validationError && (actualReps === undefined || actualReps <= 0);
  const weightError = !!validationError && (actualWeight === undefined || actualWeight === null || (actualWeight as any) === '');
  const durationError = !!validationError && (actualDuration === undefined || actualDuration <= 0);

  // Exercise history for context comparison & quick fill
  const { data: exerciseHistory } = useExerciseHistory(exerciseDetails?.id || null, userId || null);
  const previousSet = exerciseHistory?.sets[setIndex];
  const hasPrevious =
    !!previousSet &&
    ((previousSet.weight !== undefined && previousSet.weight > 0) ||
      (previousSet.reps !== undefined && previousSet.reps > 0) ||
      (previousSet.duration !== undefined && previousSet.duration > 0));

  const applyPrevious = () => {
    if (!previousSet) return;
    haptic('tap');
    onStartEditing?.();
    if (exerciseType === 'duration' && previousSet.duration) {
      onDurationChange?.(previousSet.duration);
    } else {
      if (previousSet.weight !== undefined) onWeightChange(previousSet.weight);
      if (previousSet.reps !== undefined) onRepsChange(previousSet.reps);
    }
  };

  const handleFocus = () => {
    if (isCompleted) onStartEditing?.();
  };

  return (
    <div className="flex h-full flex-col justify-between overflow-hidden rounded-3xl border border-border/70 bg-card p-4 sm:p-5 shadow-lg shadow-black/5">
      {/* Scrollable Body to prevent any viewport overflow */}
      <div className="min-h-0 flex-1 overflow-y-auto no-scrollbar space-y-3.5 pr-0.5">
        {/* Card Header: Set Type, Info & Exercise Identity */}
        <div>
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Tap-to-change Set Type modal */}
              {onSetTypeChange ? (
                <SetTypeModal
                  value={setType}
                  onChange={(newType) => {
                    onStartEditing?.();
                    onSetTypeChange(newType);
                  }}
                  onDeleteSet={onDeleteSet}
                  compact={false}
                />
              ) : (
                <span className={cn('inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold', setTypeConfig.bgColorClass, setTypeConfig.colorClass)}>
                  {exerciseTypeIcons[exerciseType]}
                  {setTypeConfig.name}
                </span>
              )}

              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold text-muted-foreground bg-secondary/80 tabular-nums">
                Seria {setIndex + 1}/{totalSets}
              </span>

              {tempo && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium text-muted-foreground bg-secondary/50">
                  Tempo {tempo}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {exerciseDetails && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setDetailsOpen(true)}
                  aria-label="Instrukcja i technika ćwiczenia"
                  className="h-8 w-8 rounded-xl text-muted-foreground hover:text-foreground active:scale-95"
                >
                  <Info className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          <h2 className="text-xl sm:text-2xl font-bold font-display uppercase tracking-tight text-foreground line-clamp-2 leading-tight">
            {exerciseName}
          </h2>
        </div>

        {/* Previous session benchmark */}
        {hasPrevious && (
          <div className="flex items-center justify-between gap-2 rounded-2xl bg-secondary/40 border border-border/50 px-3 py-2 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <History className="h-4 w-4 shrink-0 text-primary" />
              <div className="min-w-0 truncate">
                <span className="text-muted-foreground">Poprzednio: </span>
                <span className="font-semibold text-foreground tabular-nums">
                  {exerciseType === 'duration'
                    ? `${previousSet.duration} s`
                    : exerciseType === 'reps'
                      ? `${previousSet.reps} powt.`
                      : `${previousSet.weight} kg × ${previousSet.reps} powt.`}
                </span>
                {exerciseHistory?.lastWorkoutDate && (
                  <span className="ml-1 text-[11px] text-muted-foreground/80">
                    · <ExerciseHistoryBadge lastWorkoutDate={exerciseHistory.lastWorkoutDate} />
                  </span>
                )}
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={applyPrevious}
              className="h-7 px-2.5 text-xs font-bold text-primary hover:bg-primary/10 rounded-lg gap-1 shrink-0"
            >
              <Sparkles className="h-3 w-3" />
              Użyj
            </Button>
          </div>
        )}

        {/* Tip chip */}
        {tip && (
          <button
            type="button"
            onClick={() => setTipExpanded((v) => !v)}
            className="flex w-full items-start gap-2 rounded-xl bg-food/10 px-3 py-2 text-left text-xs text-food transition-all"
          >
            <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span className={cn(!tipExpanded && 'line-clamp-1')}>{tip}</span>
          </button>
        )}

        {/* Validation error banner */}
        {validationError && (
          <div className="flex items-center gap-2 rounded-xl bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive animate-shake">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        {/* Steppers */}
        <div className="space-y-2.5">
          {exerciseType === 'weight' && (
            <>
              <Stepper
                label="Ciężar"
                unit="kg"
                value={actualWeight}
                target={targetWeight}
                step={2.5}
                quickDeltas={[-5, -2.5, 2.5, 5, 10]}
                hasError={weightError}
                isCompleted={isCompleted}
                onChange={onWeightChange}
                onFocus={handleFocus}
                action={<PlateCalculator targetWeight={actualWeight ?? targetWeight} />}
              />
              <Stepper
                label="Powtórzenia"
                unit=""
                value={actualReps}
                target={targetReps}
                step={1}
                quickDeltas={[-2, -1, 1, 2, 5]}
                hasError={repsError}
                isCompleted={isCompleted}
                onChange={onRepsChange}
                onFocus={handleFocus}
              />
            </>
          )}

          {exerciseType === 'reps' && (
            <Stepper
              label="Powtórzenia"
              unit=""
              value={actualReps}
              target={targetReps}
              step={1}
              quickDeltas={[-2, -1, 1, 2, 5]}
              hasError={repsError}
              isCompleted={isCompleted}
              onChange={onRepsChange}
              onFocus={handleFocus}
            />
          )}

          {exerciseType === 'duration' && (
            <Stepper
              label="Czas"
              unit="s"
              value={actualDuration}
              target={targetDuration}
              step={5}
              quickDeltas={[-15, -5, 5, 15, 30]}
              hasError={durationError}
              isCompleted={isCompleted}
              onChange={(v) => onDurationChange?.(v)}
              onFocus={handleFocus}
            />
          )}
        </div>

        {/* RPE Selector */}
        {onRpeChange && (
          <div className="pt-0.5">
            <RpeSelector value={rpe} onChange={onRpeChange} />
          </div>
        )}

        {/* Add extra set button */}
        {onAddSet && (
          <div className="pt-1 flex justify-center">
            <button
              type="button"
              onClick={onAddSet}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors py-1 px-3 rounded-lg hover:bg-secondary/60"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              Dodaj serię do tego ćwiczenia
            </button>
          </div>
        )}
      </div>

      {/* Hero Action Button pinned at bottom of card */}
      <div className="pt-3 border-t border-border/50">
        <Button
          type="button"
          size="lg"
          variant={isCompleted ? 'outline' : 'volt'}
          className={cn(
            'w-full h-13 text-base font-bold shadow-md transition-all',
            isCompleted
              ? 'border-volt/50 bg-volt/10 text-volt hover:bg-volt/20 hover:text-volt'
              : 'shadow-lime/20 active:scale-[0.98]'
          )}
          onClick={onConfirm}
        >
          {isCompleted ? (
            <span className="flex items-center gap-2">
              <Check className="h-5 w-5 stroke-[2.5]" />
              Seria zaliczona · Dalej
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Check className="h-5 w-5 stroke-[2.5]" />
              Zakończ serię → Przerwa
            </span>
          )}
        </Button>
      </div>

      {/* Exercise Detail Dialog */}
      {exerciseDetails && (
        <ExerciseDetailDialog
          exercise={exerciseDetails}
          open={detailsOpen}
          onOpenChange={setDetailsOpen}
        />
      )}
    </div>
  );
}
