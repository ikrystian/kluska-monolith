'use client';

import { useState } from 'react';
import { Minus, Plus, Dumbbell, Repeat, Timer, AlertCircle, Lightbulb, Check } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { SetType, type Exercise } from '@/lib/types';
import { type ExerciseType, getSetTypeConfig } from '@/lib/set-type-config';
import { SetTypeBadge } from '@/components/workout/SetTypeModal';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SetInfoSlideProps {
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
  tempo?: string;
  tip?: string;
  onRepsChange: (value: number) => void;
  onWeightChange: (value: number) => void;
  onDurationChange?: (value: number) => void;
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

// Large, thumb-friendly +/- stepper used for every numeric input in the slide.
// Tapping the number itself opens a native numeric keyboard for fast manual entry.
function Stepper({
  label,
  unit,
  value,
  target,
  step,
  min = 0,
  hasError,
  isCompleted,
  onChange,
  onFocus,
}: {
  label: string;
  unit: string;
  value: number | undefined;
  target?: number;
  step: number;
  min?: number;
  hasError?: boolean;
  isCompleted?: boolean;
  onChange: (value: number) => void;
  onFocus?: () => void;
}) {
  const current = value ?? 0;

  const clamp = (n: number) => Math.max(min, Math.round(n * 100) / 100);

  return (
    <div
      className={cn(
        'rounded-2xl border p-2.5 transition-colors',
        isCompleted
          ? 'bg-green-500/10 border-green-500/30'
          : hasError
            ? 'bg-destructive/5 border-destructive/40'
            : 'bg-secondary/40 border-transparent'
      )}
    >
      <div className="flex items-center justify-between px-1 mb-1.5">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        {target !== undefined && (
          <span className="text-xs text-muted-foreground">cel: {target}{unit}</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-12 w-12 shrink-0 rounded-xl text-lg active:scale-95 transition-transform"
          onClick={() => { onFocus?.(); onChange(clamp(current - step)); }}
          aria-label={`Zmniejsz ${label.toLowerCase()}`}
        >
          <Minus className="h-5 w-5" />
        </Button>

        <div className="relative flex-1">
          <input
            type="number"
            inputMode="decimal"
            value={value ?? ''}
            onFocus={onFocus}
            onChange={(e) => onChange(clamp(parseFloat(e.target.value) || 0))}
            placeholder="0"
            className={cn(
              'w-full bg-transparent text-center text-3xl font-bold tabular-nums outline-none',
              'placeholder:text-muted-foreground/40'
            )}
          />
          {unit && (
            <span className="pointer-events-none absolute right-0 bottom-1 text-xs text-muted-foreground">{unit}</span>
          )}
        </div>

        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-12 w-12 shrink-0 rounded-xl text-lg active:scale-95 transition-transform"
          onClick={() => { onFocus?.(); onChange(clamp(current + step)); }}
          aria-label={`Zwiększ ${label.toLowerCase()}`}
        >
          <Plus className="h-5 w-5" />
        </Button>
      </div>
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
  tempo,
  tip,
  onRepsChange,
  onWeightChange,
  onDurationChange,
  isCompleted,
  validationError,
  onStartEditing,
  onConfirm,
}: SetInfoSlideProps) {
  const [tipExpanded, setTipExpanded] = useState(false);
  const exerciseType: ExerciseType = exerciseDetails?.type || 'weight';
  const setTypeConfig = getSetTypeConfig(setType);

  const repsError = !!validationError && (actualReps === undefined || actualReps <= 0);
  const weightError = !!validationError && (actualWeight === undefined || actualWeight === null || (actualWeight as any) === '');
  const durationError = !!validationError && (actualDuration === undefined || actualDuration <= 0);

  const handleFocus = () => {
    if (isCompleted) onStartEditing?.();
  };

  return (
    <div className="flex h-full items-center justify-center px-1">
      <Card
        className={cn(
          'w-full max-w-sm border-l-4 transition-opacity',
          setTypeConfig.borderColorClass,
          isCompleted && 'opacity-70'
        )}
      >
        <CardContent className="p-4 space-y-4">
          {/* Header: exercise identity */}
          <div className="flex items-start gap-3">
            <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-full', setTypeConfig.bgColorClass, setTypeConfig.colorClass)}>
              {isCompleted ? <Check className="h-5 w-5" /> : exerciseTypeIcons[exerciseType]}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-base font-bold leading-tight">{exerciseName}</h3>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <SetTypeBadge type={setType} showLabel />
                <span className="text-xs text-muted-foreground">Seria {setIndex + 1}/{totalSets}</span>
                {tempo && <span className="text-xs text-muted-foreground">· tempo {tempo}</span>}
              </div>
            </div>
          </div>

          {/* Tip - collapsed by default to keep the card focused */}
          {tip && (
            <button
              type="button"
              onClick={() => setTipExpanded((v) => !v)}
              className="flex w-full items-start gap-2 rounded-lg bg-yellow-500/10 px-2.5 py-1.5 text-left text-xs text-yellow-700 dark:text-yellow-500"
            >
              <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span className={cn(!tipExpanded && 'line-clamp-1')}>{tip}</span>
            </button>
          )}

          {/* Validation error */}
          {validationError && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Steppers - the only inputs the athlete needs to touch */}
          <div className="space-y-2">
            {exerciseType === 'weight' && (
              <>
                <Stepper
                  label="Ciężar"
                  unit="kg"
                  value={actualWeight}
                  target={targetWeight}
                  step={2.5}
                  hasError={weightError}
                  isCompleted={isCompleted}
                  onChange={onWeightChange}
                  onFocus={handleFocus}
                />
                <Stepper
                  label="Powtórzenia"
                  unit=""
                  value={actualReps}
                  target={targetReps}
                  step={1}
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
                hasError={durationError}
                isCompleted={isCompleted}
                onChange={(v) => onDurationChange?.(v)}
                onFocus={handleFocus}
              />
            )}
          </div>

          {/* Primary action - no need to rely on swipe alone */}
          <Button
            type="button"
            size="lg"
            className="w-full h-12 text-base font-semibold"
            onClick={onConfirm}
          >
            {isCompleted ? 'Seria zaliczona ✓' : 'Zakończ serię'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
