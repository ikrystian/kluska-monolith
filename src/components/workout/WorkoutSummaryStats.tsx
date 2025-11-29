'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Trophy,
  Dumbbell,
  Repeat,
  Timer,
  Activity,
  TrendingUp,
  Flame,
  Target,
  Clock
} from 'lucide-react';
import { type PersonalRecord, type WorkoutSet, type Exercise } from '@/lib/types';
import { type NewRecord } from '@/hooks/usePersonalRecords';
import { type ExerciseType } from '@/lib/set-type-config';
import { cn } from '@/lib/utils';

interface ExerciseData {
  exercise: Exercise;
  sets: WorkoutSet[];
  tempo?: string;
  tip?: string;
}

interface WorkoutSummaryStatsProps {
  exercises: ExerciseData[];
  duration: number; // in minutes
  newRecords?: NewRecord[];
  className?: string;
}

export function WorkoutSummaryStats({
  exercises,
  duration,
  newRecords = [],
  className,
}: WorkoutSummaryStatsProps) {
  // Calculate statistics
  const stats = useMemo(() => {
    let totalVolume = 0;
    let totalReps = 0;
    let totalSets = 0;
    let totalDuration = 0;
    let completedSets = 0;

    exercises.forEach(({ exercise, sets }) => {
      const exerciseType: ExerciseType = exercise.type || 'weight';

      sets.forEach(set => {
        totalSets++;
        if (set.completed) completedSets++;

        if (exerciseType === 'weight') {
          const volume = (set.reps || 0) * (set.weight || 0);
          totalVolume += volume;
          totalReps += set.reps || 0;
        } else if (exerciseType === 'reps') {
          totalReps += set.reps || 0;
        } else if (exerciseType === 'duration') {
          totalDuration += set.duration || 0;
        }
      });
    });

    return {
      totalVolume,
      totalReps,
      totalSets,
      totalDuration,
      completedSets,
      completionRate: totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0,
      exerciseCount: exercises.length,
    };
  }, [exercises]);

  // Find best performances in this workout
  const bestPerformances = useMemo(() => {
    const performances: {
      exerciseName: string;
      type: ExerciseType;
      value: string;
      icon: React.ReactNode;
    }[] = [];

    exercises.forEach(({ exercise, sets }) => {
      const exerciseType: ExerciseType = exercise.type || 'weight';
      const completedSets = sets.filter(s => s.completed);

      if (completedSets.length === 0) return;

      if (exerciseType === 'weight') {
        const maxWeight = Math.max(...completedSets.map(s => s.weight || 0));
        const maxWeightSet = completedSets.find(s => s.weight === maxWeight);
        if (maxWeight > 0 && maxWeightSet) {
          performances.push({
            exerciseName: exercise.name,
            type: exerciseType,
            value: `${maxWeight} kg × ${maxWeightSet.reps || 0}`,
            icon: <Dumbbell className="h-4 w-4" />,
          });
        }
      } else if (exerciseType === 'reps') {
        const maxReps = Math.max(...completedSets.map(s => s.reps || 0));
        if (maxReps > 0) {
          performances.push({
            exerciseName: exercise.name,
            type: exerciseType,
            value: `${maxReps} powtórzeń`,
            icon: <Repeat className="h-4 w-4" />,
          });
        }
      } else if (exerciseType === 'duration') {
        const maxDuration = Math.max(...completedSets.map(s => s.duration || 0));
        if (maxDuration > 0) {
          performances.push({
            exerciseName: exercise.name,
            type: exerciseType,
            value: `${maxDuration} sekund`,
            icon: <Timer className="h-4 w-4" />,
          });
        }
      }
    });

    return performances;
  }, [exercises]);

  return (
    <div className={cn("space-y-4", className)}>
      {/* New Records Section */}
      {newRecords.length > 0 && (
        <Card className="border-yellow-500/50 bg-gradient-to-br from-yellow-500/10 to-orange-500/10">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Nowe Rekordy Osobiste!
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {newRecords.map((record, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded-lg bg-yellow-500/10"
                >
                  <div className="flex items-center gap-2">
                    {record.type === 'max_weight' && <Dumbbell className="h-4 w-4 text-yellow-600" />}
                    {record.type === 'max_reps' && <Repeat className="h-4 w-4 text-yellow-600" />}
                    {record.type === 'max_duration' && <Timer className="h-4 w-4 text-yellow-600" />}
                    <span className="font-medium">{record.exerciseName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-700">
                      {record.type === 'max_weight' && `${record.value} kg`}
                      {record.type === 'max_reps' && `${record.value} powt.`}
                      {record.type === 'max_duration' && `${record.value} sek.`}
                    </Badge>
                    {record.previousValue && (
                      <span className="text-xs text-muted-foreground">
                        (poprzednio: {record.previousValue})
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="bg-secondary/30">
          <CardContent className="p-4 text-center">
            <Clock className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
            <p className="text-2xl font-bold">{duration}</p>
            <p className="text-xs text-muted-foreground">minut</p>
          </CardContent>
        </Card>

        <Card className="bg-secondary/30">
          <CardContent className="p-4 text-center">
            <Dumbbell className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
            <p className="text-2xl font-bold">{stats.exerciseCount}</p>
            <p className="text-xs text-muted-foreground">ćwiczeń</p>
          </CardContent>
        </Card>

        <Card className="bg-secondary/30">
          <CardContent className="p-4 text-center">
            <Target className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
            <p className="text-2xl font-bold">{stats.completedSets}/{stats.totalSets}</p>
            <p className="text-xs text-muted-foreground">serii</p>
          </CardContent>
        </Card>

        <Card className="bg-secondary/30">
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
            <p className="text-2xl font-bold">{stats.completionRate}%</p>
            <p className="text-xs text-muted-foreground">ukończono</p>
          </CardContent>
        </Card>
      </div>

      {/* Volume and Reps Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {stats.totalVolume > 0 && (
          <Card className="bg-secondary/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Activity className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalVolume.toLocaleString()} kg</p>
                  <p className="text-xs text-muted-foreground">Całkowita objętość</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {stats.totalReps > 0 && (
          <Card className="bg-secondary/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Repeat className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalReps}</p>
                  <p className="text-xs text-muted-foreground">Łączne powtórzenia</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {stats.totalDuration > 0 && (
          <Card className="bg-secondary/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Timer className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{Math.floor(stats.totalDuration / 60)}:{(stats.totalDuration % 60).toString().padStart(2, '0')}</p>
                  <p className="text-xs text-muted-foreground">Łączny czas ćwiczeń</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Best Performances */}
      {bestPerformances.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Flame className="h-5 w-5 text-orange-500" />
              Najlepsze wyniki w tym treningu
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {bestPerformances.map((perf, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded-lg bg-secondary/30"
                >
                  <div className="flex items-center gap-2">
                    {perf.icon}
                    <span className="font-medium">{perf.exerciseName}</span>
                  </div>
                  <Badge variant="outline">{perf.value}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}