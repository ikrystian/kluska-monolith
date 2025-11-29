'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dumbbell, AlertCircle } from 'lucide-react';
import { SetType, type Exercise } from '@/lib/types';

interface SetInfoSlideProps {
  exerciseName: string;
  exerciseDetails?: Exercise;
  setIndex: number;
  totalSets: number;
  setType: SetType;
  targetReps: number;
  targetWeight: number;
  actualReps: number;
  actualWeight: number;
  tempo?: string;
  tip?: string;
  onRepsChange: (value: number) => void;
  onWeightChange: (value: number) => void;
  isCompleted?: boolean;
  validationError?: string | null;
}

const setTypeColors: Record<SetType, string> = {
  [SetType.WarmUpSet]: 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30',
  [SetType.WorkingSet]: 'bg-blue-500/20 text-blue-600 border-blue-500/30',
  [SetType.BackOffSet]: 'bg-purple-500/20 text-purple-600 border-purple-500/30',
  [SetType.DropSet]: 'bg-orange-500/20 text-orange-600 border-orange-500/30',
  [SetType.FailureSet]: 'bg-red-500/20 text-red-600 border-red-500/30',
};

export function SetInfoSlide({
  exerciseName,
  exerciseDetails,
  setIndex,
  totalSets,
  setType,
  targetReps,
  targetWeight,
  actualReps,
  actualWeight,
  tempo,
  tip,
  onRepsChange,
  onWeightChange,
  isCompleted,
  validationError,
}: SetInfoSlideProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-4">
      <Card className={`w-full max-w-sm ${isCompleted ? 'opacity-60' : ''}`}>
        <CardHeader className="text-center pb-2">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Dumbbell className="h-5 w-5 text-primary" />
            </div>
          </div>
          <CardTitle className="text-xl font-bold">{exerciseName}</CardTitle>
          <div className="flex items-center justify-center gap-2 mt-2">
            <Badge variant="outline" className={setTypeColors[setType]}>
              {setType}
            </Badge>
            {tempo && (
              <Badge variant="outline" className="text-xs">
                Tempo: {tempo}
              </Badge>
            )}
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

          {/* Target Values */}
          <div className="grid grid-cols-2 gap-4 p-3 bg-secondary/30 rounded-lg">
            <div className="text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Cel</p>
              <p className="text-lg font-semibold">{targetReps} powt.</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Ciężar</p>
              <p className="text-lg font-semibold">{targetWeight} kg</p>
            </div>
          </div>

          {/* Validation Error */}
          {validationError && (
            <div className="flex items-center justify-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Input Fields */}
          <div className="grid grid-cols-2 gap-4">
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
                placeholder={String(targetReps)}
                className={`text-center text-lg font-semibold h-12 ${
                  validationError && actualReps <= 0 ? 'border-destructive ring-destructive/20 ring-2' : ''
                }`}
                disabled={isCompleted}
              />
            </div>
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
                placeholder={String(targetWeight)}
                className={`text-center text-lg font-semibold h-12 ${
                  validationError && (actualWeight === undefined || actualWeight === null) ? 'border-destructive ring-destructive/20 ring-2' : ''
                }`}
                disabled={isCompleted}
              />
            </div>
          </div>

          {/* Swipe hint */}
          <p className="text-center text-xs text-muted-foreground">
            Przesuń w prawo, aby rozpocząć przerwę →
          </p>
        </CardContent>
      </Card>
    </div>
  );
}