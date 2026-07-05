'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { type ExerciseType, getExerciseTypeConfig } from '@/lib/set-type-config';

interface SetInputFieldsProps {
  exerciseType: ExerciseType;
  reps?: number;
  weight?: number;
  duration?: number;
  onRepsChange?: (value: number) => void;
  onWeightChange?: (value: number) => void;
  onDurationChange?: (value: number) => void;
  disabled?: boolean;
  isActive?: boolean;
  hasError?: boolean;
  compact?: boolean;
}

export function SetInputFields({
  exerciseType,
  reps,
  weight,
  duration,
  onRepsChange,
  onWeightChange,
  onDurationChange,
  disabled,
  isActive,
  hasError,
  compact = false,
}: SetInputFieldsProps) {
  const config = getExerciseTypeConfig(exerciseType);
  const inputClassName = cn(
    compact ? "h-8 text-xs" : "h-10",
    "text-center",
    isActive && "border-primary font-semibold",
    hasError && "border-destructive ring-destructive/20 ring-1"
  );

  // Weight-based exercise: show weight + reps
  if (exerciseType === 'weight') {
    return (
      <div className="flex gap-2">
        <div className="flex-1">
          {!compact && <Label className="text-xs text-muted-foreground mb-1 block">Ciężar (kg)</Label>}
          <Input
            type="number"
            step="0.5"
            min={0}
            placeholder="0"
            value={weight ?? ''}
            onChange={(e) => onWeightChange?.(parseFloat(e.target.value) || 0)}
            disabled={disabled}
            className={inputClassName}
          />
        </div>
        <div className="flex-1">
          {!compact && <Label className="text-xs text-muted-foreground mb-1 block">Powtórzenia</Label>}
          <Input
            type="number"
            min={0}
            placeholder="0"
            value={reps ?? ''}
            onChange={(e) => onRepsChange?.(parseInt(e.target.value) || 0)}
            disabled={disabled}
            className={inputClassName}
          />
        </div>
      </div>
    );
  }

  // Reps-only exercise (bodyweight): show only reps
  if (exerciseType === 'reps') {
    return (
      <div className="flex gap-2">
        <div className="flex-1">
          {!compact && <Label className="text-xs text-muted-foreground mb-1 block">Powtórzenia</Label>}
          <Input
            type="number"
            min={0}
            placeholder="0"
            value={reps ?? ''}
            onChange={(e) => onRepsChange?.(parseInt(e.target.value) || 0)}
            disabled={disabled}
            className={inputClassName}
          />
        </div>
      </div>
    );
  }

  // Duration-based exercise: show duration in seconds
  if (exerciseType === 'duration') {
    return (
      <div className="flex gap-2">
        <div className="flex-1">
          {!compact && <Label className="text-xs text-muted-foreground mb-1 block">Czas (sek.)</Label>}
          <div className="relative">
            <Input
              type="number"
              min={0}
              placeholder="0"
              value={duration ?? ''}
              onChange={(e) => onDurationChange?.(parseInt(e.target.value) || 0)}
              disabled={disabled}
              className={cn(inputClassName, "pr-8")}
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">s</span>
          </div>
        </div>
      </div>
    );
  }

  // Fallback - should not happen
  return null;
}

// Display component for showing set results (read-only)
interface SetResultDisplayProps {
  exerciseType: ExerciseType;
  reps?: number;
  weight?: number;
  duration?: number;
  className?: string;
}

export function SetResultDisplay({
  exerciseType,
  reps,
  weight,
  duration,
  className,
}: SetResultDisplayProps) {
  if (exerciseType === 'weight') {
    return (
      <span className={className}>
        {reps || 0} × {weight || 0}kg
      </span>
    );
  }

  if (exerciseType === 'reps') {
    return (
      <span className={className}>
        {reps || 0} powt.
      </span>
    );
  }

  if (exerciseType === 'duration') {
    return (
      <span className={className}>
        {duration || 0} sek.
      </span>
    );
  }

  return null;
}

// Header labels for set input columns
interface SetInputHeadersProps {
  exerciseType: ExerciseType;
  compact?: boolean;
}

export function SetInputHeaders({ exerciseType, compact = false }: SetInputHeadersProps) {
  const labelClassName = cn(
    "text-xs text-muted-foreground text-center",
    compact && "text-[10px]"
  );

  if (exerciseType === 'weight') {
    return (
      <>
        <Label className={cn(labelClassName, "col-span-2")}>kg</Label>
        <Label className={cn(labelClassName, "col-span-2")}>Powt.</Label>
      </>
    );
  }

  if (exerciseType === 'reps') {
    return (
      <Label className={cn(labelClassName, "col-span-4")}>Powtórzenia</Label>
    );
  }

  if (exerciseType === 'duration') {
    return (
      <Label className={cn(labelClassName, "col-span-4")}>Czas (sek.)</Label>
    );
  }

  return null;
}

// Grid-based input fields for use in tables
interface SetInputGridFieldsProps {
  exerciseType: ExerciseType;
  reps?: number;
  weight?: number;
  duration?: number;
  onRepsChange?: (value: number) => void;
  onWeightChange?: (value: number) => void;
  onDurationChange?: (value: number) => void;
  disabled?: boolean;
  isActive?: boolean;
  hasWeightError?: boolean;
  hasRepsError?: boolean;
  hasDurationError?: boolean;
}

export function SetInputGridFields({
  exerciseType,
  reps,
  weight,
  duration,
  onRepsChange,
  onWeightChange,
  onDurationChange,
  disabled,
  isActive,
  hasWeightError,
  hasRepsError,
  hasDurationError,
}: SetInputGridFieldsProps) {
  const baseInputClassName = cn(
    "h-8 text-center text-xs",
    isActive && "border-primary font-semibold"
  );

  if (exerciseType === 'weight') {
    return (
      <>
        <div className="col-span-2">
          <Input
            type="number"
            step="0.5"
            min={0}
            placeholder="0"
            value={weight ?? ''}
            onChange={(e) => onWeightChange?.(parseFloat(e.target.value) || 0)}
            disabled={disabled}
            className={cn(
              baseInputClassName,
              hasWeightError && "border-destructive ring-destructive/20 ring-1"
            )}
          />
        </div>
        <div className="col-span-2">
          <Input
            type="number"
            min={0}
            placeholder="0"
            value={reps ?? ''}
            onChange={(e) => onRepsChange?.(parseInt(e.target.value) || 0)}
            disabled={disabled}
            className={cn(
              baseInputClassName,
              hasRepsError && "border-destructive ring-destructive/20 ring-1"
            )}
          />
        </div>
      </>
    );
  }

  if (exerciseType === 'reps') {
    return (
      <div className="col-span-4">
        <Input
          type="number"
          min={0}
          placeholder="0"
          value={reps ?? ''}
          onChange={(e) => onRepsChange?.(parseInt(e.target.value) || 0)}
          disabled={disabled}
          className={cn(
            baseInputClassName,
            hasRepsError && "border-destructive ring-destructive/20 ring-1"
          )}
        />
      </div>
    );
  }

  if (exerciseType === 'duration') {
    return (
      <div className="col-span-4">
        <div className="relative">
          <Input
            type="number"
            min={0}
            placeholder="0"
            value={duration ?? ''}
            onChange={(e) => onDurationChange?.(parseInt(e.target.value) || 0)}
            disabled={disabled}
            className={cn(
              baseInputClassName,
              "pr-6",
              hasDurationError && "border-destructive ring-destructive/20 ring-1"
            )}
          />
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">s</span>
        </div>
      </div>
    );
  }

  return null;
}