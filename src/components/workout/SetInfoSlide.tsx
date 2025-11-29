'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dumbbell, AlertCircle, Repeat, Timer } from 'lucide-react';
import { SetType, type Exercise } from '@/lib/types';
import { type ExerciseType, getExerciseTypeConfig } from '@/lib/set-type-config';
import { SetTypeBadge } from '@/components/workout/SetTypeModal';

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
}

// Exercise type icons
const exerciseTypeIcons: Record<ExerciseType, React.ReactNode> = {
  weight: <Dumbbell className="h-5 w-5" />,
  reps: <Repeat className="h-5 w-5" />,
  duration: <Timer className="h-5 w-5" />,
};

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
}: SetInfoSlideProps) {
  // Get exercise type from exercise details
  const exerciseType: ExerciseType = exerciseDetails?.type || 'weight';
  const typeConfig = getExerciseTypeConfig(exerciseType);

  // Render target values based on exercise type
  const renderTargetValues = () => {
    switch (exerciseType) {
      case 'weight':
        return (
          <div className="grid grid-cols-2 gap-4 p-3 bg-secondary/30 rounded-lg">
            <div className="text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Cel</p>
              <p className="text-lg font-semibold">{targetReps || 0} powt.</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Ciężar</p>
              <p className="text-lg font-semibold">{targetWeight || 0} kg</p>
            </div>
          </div>
        );
      case 'reps':
        return (
          <div className="p-3 bg-secondary/30 rounded-lg">
            <div className="text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Cel powtórzeń</p>
              <p className="text-2xl font-semibold">{targetReps || 0} powt.</p>
            </div>
          </div>
        );
      case 'duration':
        return (
          <div className="p-3 bg-secondary/30 rounded-lg">
            <div className="text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Cel czasowy</p>
              <p className="text-2xl font-semibold">{targetDuration || 0} sek.</p>
            </div>
          </div>
        );
    }
  };

  // Render input fields based on exercise type
  const renderInputFields = () => {
    switch (exerciseType) {
      case 'weight':
        return (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor={`weight-${setIndex}`} className="text-sm font-medium">
                Użyty ciężar (kg)
              </Label>
              <Input
                id={`weight-${setIndex}`}
                type="number"
                min={0}
                step={0.5}
                value={actualWeight || ''}
                onChange={(e) => onWeightChange(parseFloat(e.target.value) || 0)}
                placeholder={String(targetWeight || 0)}
                className={`text-center text-lg font-semibold h-12 ${
                  validationError && (actualWeight === undefined || actualWeight === null) ? 'border-destructive ring-destructive/20 ring-2' : ''
                }`}
                disabled={isCompleted}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`reps-${setIndex}`} className="text-sm font-medium">
                Wykonane powtórzenia
              </Label>
              <Input
                id={`reps-${setIndex}`}
                type="number"
                min={0}
                value={actualReps || ''}
                onChange={(e) => onRepsChange(parseInt(e.target.value) || 0)}
                placeholder={String(targetReps || 0)}
                className={`text-center text-lg font-semibold h-12 ${
                  validationError && (actualReps === undefined || actualReps <= 0) ? 'border-destructive ring-destructive/20 ring-2' : ''
                }`}
                disabled={isCompleted}
              />
            </div>
          </div>
        );
      case 'reps':
        return (
          <div className="space-y-2">
            <Label htmlFor={`reps-${setIndex}`} className="text-sm font-medium">
              Wykonane powtórzenia
            </Label>
            <Input
              id={`reps-${setIndex}`}
              type="number"
              min={0}
              value={actualReps || ''}
              onChange={(e) => onRepsChange(parseInt(e.target.value) || 0)}
              placeholder={String(targetReps || 0)}
              className={`text-center text-2xl font-semibold h-14 ${
                validationError && (actualReps === undefined || actualReps <= 0) ? 'border-destructive ring-destructive/20 ring-2' : ''
              }`}
              disabled={isCompleted}
            />
          </div>
        );
      case 'duration':
        return (
          <div className="space-y-2">
            <Label htmlFor={`duration-${setIndex}`} className="text-sm font-medium">
              Wykonany czas (sekundy)
            </Label>
            <div className="relative">
              <Input
                id={`duration-${setIndex}`}
                type="number"
                min={0}
                value={actualDuration || ''}
                onChange={(e) => onDurationChange?.(parseInt(e.target.value) || 0)}
                placeholder={String(targetDuration || 0)}
                className={`text-center text-2xl font-semibold h-14 pr-10 ${
                  validationError && (actualDuration === undefined || actualDuration <= 0) ? 'border-destructive ring-destructive/20 ring-2' : ''
                }`}
                disabled={isCompleted}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">s</span>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-4">
      <Card className={`w-full max-w-sm ${isCompleted ? 'opacity-60' : ''}`}>
        <CardHeader className="text-center pb-2">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              {exerciseTypeIcons[exerciseType]}
            </div>
          </div>
          <CardTitle className="text-xl font-bold">{exerciseName}</CardTitle>
          <div className="flex items-center justify-center gap-2 mt-2 flex-wrap">
            <SetTypeBadge type={setType} />
            {tempo && (
              <Badge variant="outline" className="text-xs">
                Tempo: {tempo}
              </Badge>
            )}
            <Badge variant="outline" className="text-xs gap-1">
              {exerciseTypeIcons[exerciseType]}
              {typeConfig.name}
            </Badge>
          </div>
          {tip && (
            <p className="text-xs text-muted-foreground mt-2 italic bg-yellow-500/10 p-2 rounded">
              💡 {tip}
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Set Progress Indicator */}
          <div className="text-center">
            <span className="text-4xl font-bold text-primary">{setIndex + 1}</span>
            <span className="text-2xl text-muted-foreground"> / {totalSets}</span>
            <p className="text-sm text-muted-foreground mt-1">Seria</p>
          </div>

          {/* Target Values - Dynamic based on exercise type */}
          {renderTargetValues()}

          {/* Validation Error */}
          {validationError && (
            <div className="flex items-center justify-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Input Fields - Dynamic based on exercise type */}
          {renderInputFields()}

          {/* Swipe hint */}
          <p className="text-center text-xs text-muted-foreground">
            Przesuń w prawo, aby rozpocząć przerwę →
          </p>
        </CardContent>
      </Card>
    </div>
  );
}