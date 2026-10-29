'use client';

import { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { format, differenceInMinutes } from 'date-fns';
import { pl } from 'date-fns/locale';
import {
  ArrowLeft,
  Activity,
  Award,
  Calendar,
  CheckCircle2,
  Clock,
  Copy,
  Dumbbell,
  Flame,
  Layers,
  Lightbulb,
  Maximize2,
  MessageSquare,
  Play,
  Repeat,
  RotateCcw,
  Share2,
  Sparkles,
  Timer,
  TrendingUp,
  Trophy,
  Zap,
} from 'lucide-react';
import { useDoc, useUser, useCreateDoc } from '@/lib/db-hooks';
import { resolveMediaUrl } from '@/lib/api-client';
import type { WorkoutLog, Workout } from '@/lib/types';
import { TrainingLevel } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { SetTypeBadge } from '@/components/workout/SetTypeModal';
import { rpeToRir } from '@/components/workout/RpeSelector';
import { seriesLabel, exercisesLabel } from '@/components/schedule/WorkoutExerciseList';
import { tint } from '@/components/profile/profile-ui';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

/**
 * Calculates estimated 1 Rep Max using the Epley formula:
 * 1RM = weight * (1 + reps / 30)
 */
function calculate1RM(weight?: number, reps?: number): number | null {
  if (!weight || weight <= 0 || !reps || reps <= 0) return null;
  if (reps === 1) return Math.round(weight);
  if (reps > 15) return null; // Epley formula loses accuracy above 15 reps
  return Math.round(weight * (1 + reps / 30));
}

/** Formats duration into a readable Polish string like "1h 15m" or "45 min". */
function formatDuration(minutes?: number): string {
  if (!minutes || minutes <= 0) return '-';
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs > 0) {
    return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
  }
  return `${mins} min`;
}

export default function HistoryDetailPage() {
  const { user } = useUser();
  const navigate = useNavigate();
  const params = useParams();
  const sessionId = params.sessionId as string;
  const { createDoc } = useCreateDoc();

  const [isPhotoOpen, setIsPhotoOpen] = useState(false);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);

  const { data: workoutLog, isLoading } = useDoc<WorkoutLog>('workoutLogs', sessionId);

  // Derived metrics and statistics
  const stats = useMemo(() => {
    if (!workoutLog) return null;

    let totalVolume = 0;
    let totalSets = 0;
    let totalReps = 0;
    let weightSetsCount = 0;
    let maxWeight = 0;
    let peakEstimated1RM = 0;
    let rpeSum = 0;
    let rpeCount = 0;

    // Per-exercise volume and muscle group distribution
    const exerciseVolumes: { name: string; volume: number; sets: number }[] = [];
    const muscleMap = new Map<string, number>();

    workoutLog.exercises.forEach((series) => {
      const exercise = series.exercise;
      const isWeight = !exercise?.type || exercise.type === 'weight';
      let exVol = 0;

      (series.sets || []).forEach((set) => {
        totalSets += 1;
        if (set.reps) totalReps += set.reps;

        if (isWeight) {
          const w = set.weight || 0;
          const r = set.reps || 0;
          const vol = w * r;
          exVol += vol;
          totalVolume += vol;
          if (w > maxWeight) maxWeight = w;

          const est1RM = calculate1RM(w, r);
          if (est1RM && est1RM > peakEstimated1RM) peakEstimated1RM = est1RM;
          weightSetsCount += 1;
        }

        if (set.rpe !== undefined && set.rpe > 0) {
          rpeSum += set.rpe;
          rpeCount += 1;
        }
      });

      exerciseVolumes.push({
        name: exercise?.name || 'Ćwiczenie',
        volume: exVol,
        sets: series.sets?.length || 0,
      });

      // Muscle groups counting
      const muscles = exercise?.mainMuscleGroups || [];
      muscles.forEach((mg) => {
        if (mg?.name) {
          muscleMap.set(mg.name, (muscleMap.get(mg.name) || 0) + (series.sets?.length || 1));
        }
      });
    });

    // Duration fallback from start/end time if not set
    let duration = workoutLog.duration;
    if ((!duration || duration <= 0) && workoutLog.startTime && workoutLog.endTime) {
      duration = Math.max(1, differenceInMinutes(new Date(workoutLog.endTime), new Date(workoutLog.startTime)));
    }

    const avgRpe = rpeCount > 0 ? (rpeSum / rpeCount).toFixed(1) : null;
    const density = duration && duration > 0 && totalVolume > 0 ? Math.round(totalVolume / duration) : null;

    // Muscle groups list sorted by set frequency
    const totalMuscleSets = Array.from(muscleMap.values()).reduce((a, b) => a + b, 0);
    const muscleGroups = Array.from(muscleMap.entries())
      .map(([name, count]) => ({
        name,
        count,
        percent: totalMuscleSets > 0 ? Math.round((count / totalMuscleSets) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    return {
      totalVolume,
      totalSets,
      totalReps,
      weightSetsCount,
      maxWeight,
      peakEstimated1RM,
      avgRpe,
      density,
      duration,
      exerciseVolumes,
      muscleGroups,
    };
  }, [workoutLog]);

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/athlete/history');
    }
  };

  const handleShare = async () => {
    if (!workoutLog) return;
    const dateFormatted = workoutLog.endTime
      ? format(new Date(workoutLog.endTime), 'd MMMM yyyy', { locale: pl })
      : '';
    const shareText = `Ukończony trening: ${workoutLog.workoutName}\nData: ${dateFormatted}\nTonaż: ${(stats?.totalVolume || 0).toLocaleString('pl-PL')} kg | Serie: ${stats?.totalSets || 0} | Czas: ${formatDuration(stats?.duration)}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: workoutLog.workoutName,
          text: shareText,
          url: window.location.href,
        });
        return;
      } catch {
        // User dismissed share dialog
      }
    }

    try {
      await navigator.clipboard.writeText(`${shareText}\n${window.location.href}`);
      toast({
        title: 'Skopiowano podsumowanie',
        description: 'Tekst podsumowania treningu trafił do schowka.',
      });
    } catch {
      toast({
        title: 'Błąd',
        description: 'Nie udało się skopiować linku do schowka.',
        variant: 'destructive',
      });
    }
  };

  const handleRepeatWorkout = () => {
    if (!workoutLog) return;
    if (workoutLog.sourceWorkoutId) {
      navigate(`/athlete/log?workoutId=${workoutLog.sourceWorkoutId}`);
    } else {
      navigate(`/athlete/log?historyId=${workoutLog.id}`);
    }
  };

  const handleSaveAsTemplate = async () => {
    if (!workoutLog || !user) return;
    setIsSavingTemplate(true);
    try {
      const template: Omit<Workout, 'id'> = {
        name: `${workoutLog.workoutName} (z historii)`,
        level: TrainingLevel.Intermediate,
        durationMinutes: stats?.duration || 60,
        ownerId: user.uid,
        description: `Szablon utworzony z treningu ukończonego ${workoutLog.endTime ? format(new Date(workoutLog.endTime), 'd.MM.yyyy') : ''}`,
        exerciseSeries: workoutLog.exercises.map((ex) => ({
          exercise: ex.exercise,
          tempo: ex.tempo || '2-0-2-0',
          tip: ex.tip || '',
          sets: (ex.sets || []).map((s, idx) => ({
            number: idx + 1,
            type: s.type,
            reps: s.reps || 10,
            weight: s.weight || 0,
            restTimeSeconds: s.restTimeSeconds || 90,
            completed: false,
          })),
        })),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const result = await createDoc('workouts', template);
      toast({
        title: 'Zapisano szablon',
        description: `Utworzono nowy trening "${template.name}" na liście Twoich treningów.`,
      });
      navigate(`/athlete/workouts/${result.id}`);
    } catch (err) {
      console.error('Error creating workout template:', err);
      toast({
        title: 'Błąd',
        description: 'Nie udało się zapisać szablonu.',
        variant: 'destructive',
      });
    } finally {
      setIsSavingTemplate(false);
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-6 px-4 pb-16 pt-18 md:px-6 md:pt-8">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-6 w-48 rounded-lg" />
        </div>
        <Skeleton className="h-64 w-full rounded-[1.75rem]" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </div>
        <Skeleton className="h-80 w-full rounded-[1.75rem]" />
      </div>
    );
  }

  if (!workoutLog) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-24 text-center">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-secondary">
          <Dumbbell className="h-8 w-8 text-muted-foreground" />
        </span>
        <h2 className="mt-4 font-headline text-2xl font-bold">Nie znaleziono sesji</h2>
        <p className="mb-6 mt-1 text-muted-foreground">Nie można załadować podsumowania treningu lub zostało ono usunięte.</p>
        <Button className="rounded-full px-6" onClick={() => navigate('/athlete/history')}>
          Wróć do historii
        </Button>
      </div>
    );
  }

  const rawPhoto = workoutLog.photoURL || (workoutLog as unknown as { photoUrl?: string }).photoUrl;
  const photoUrl = rawPhoto ? resolveMediaUrl(rawPhoto) : null;
  const completedDate = workoutLog.endTime ? new Date(workoutLog.endTime) : null;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 pb-20 pt-18 md:px-6 md:pt-8">
      {/* Top Navigation & Quick Actions */}
      <div className="flex items-center justify-between gap-2">
        <Button
          onClick={handleBack}
          variant="ghost"
          size="sm"
          className="h-10 gap-2 rounded-full px-3 text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm font-semibold">Historia</span>
        </Button>

        <div className="flex items-center gap-1.5">
          <Button
            onClick={handleShare}
            variant="outline"
            size="icon"
            className="h-9 w-9 rounded-full border-border/60 hover:bg-secondary"
            title="Udostępnij trening"
          >
            <Share2 className="h-4 w-4 text-muted-foreground" />
          </Button>

          <Button
            onClick={handleSaveAsTemplate}
            disabled={isSavingTemplate}
            variant="outline"
            size="icon"
            className="h-9 w-9 rounded-full border-border/60 hover:bg-secondary"
            title="Zapisz jako szablon treningu"
          >
            <Copy className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
      </div>

      {/* Main Hero Card */}
      <section className="relative overflow-hidden rounded-[1.75rem] border border-border/80 bg-card/85 p-5 shadow-soft backdrop-blur-md md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Badge className="gap-1.5 rounded-full border-emerald-500/30 bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Ukończono
          </Badge>

          {completedDate && (
            <p className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              {format(completedDate, 'EEEE, d MMMM yyyy · HH:mm', { locale: pl })}
            </p>
          )}
        </div>

        <h1 className="mt-3 font-headline text-2xl font-black uppercase tracking-tight text-foreground md:text-3xl">
          {workoutLog.workoutName}
        </h1>

        {/* Workout Photo */}
        {photoUrl && (
          <div
            onClick={() => setIsPhotoOpen(true)}
            className="group relative mt-4 aspect-video w-full cursor-pointer overflow-hidden rounded-2xl border border-border/60 bg-muted/60 transition-transform active:scale-[0.99] sm:aspect-[21/9]"
          >
            <img
              src={photoUrl}
              alt={`Zdjęcie z treningu ${workoutLog.workoutName}`}
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80" />
            <div className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white backdrop-blur-md">
              <Maximize2 className="h-3.5 w-3.5" />
              <span>Powiększ zdjęcie</span>
            </div>
          </div>
        )}
      </section>

      {/* Key Performance Indicators (KPIs) 4-tile grid */}
      <section className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {/* Total Volume */}
        <div
          className="rounded-2xl p-4 transition-colors"
          style={{ backgroundColor: tint('#f97316', 10) }}
        >
          <div className="flex items-center justify-between text-orange-500">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Tonaż</span>
            <Flame className="h-4 w-4" />
          </div>
          <p className="mt-2 font-display text-2xl font-black leading-none tabular-nums text-foreground">
            {(stats?.totalVolume || 0).toLocaleString('pl-PL')}
            <span className="ml-1 text-xs font-bold text-muted-foreground">kg</span>
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {stats?.weightSetsCount || 0} {seriesLabel(stats?.weightSetsCount || 0)} siłowych
          </p>
        </div>

        {/* Duration */}
        <div
          className="rounded-2xl p-4 transition-colors"
          style={{ backgroundColor: tint('#0284c7', 10) }}
        >
          <div className="flex items-center justify-between text-sky-500">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Czas</span>
            <Clock className="h-4 w-4" />
          </div>
          <p className="mt-2 font-display text-2xl font-black leading-none tabular-nums text-foreground">
            {formatDuration(stats?.duration)}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {stats?.density ? `${stats.density} kg/min` : 'Łączny czas sesji'}
          </p>
        </div>

        {/* Exercises & Sets */}
        <div
          className="rounded-2xl p-4 transition-colors"
          style={{ backgroundColor: tint('#10b981', 10) }}
        >
          <div className="flex items-center justify-between text-emerald-500">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Ćwiczenia</span>
            <Dumbbell className="h-4 w-4" />
          </div>
          <p className="mt-2 font-display text-2xl font-black leading-none tabular-nums text-foreground">
            {workoutLog.exercises.length}
            <span className="ml-1 text-xs font-bold text-muted-foreground">ćw.</span>
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {stats?.totalSets || 0} {seriesLabel(stats?.totalSets || 0)} ({stats?.totalReps || 0} powt.)
          </p>
        </div>

        {/* Max Weight / Intensity */}
        <div
          className="rounded-2xl p-4 transition-colors"
          style={{ backgroundColor: tint('#8b5cf6', 10) }}
        >
          <div className="flex items-center justify-between text-purple-500">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Szczyt</span>
            {stats?.maxWeight && stats.maxWeight > 0 ? (
              <TrendingUp className="h-4 w-4" />
            ) : (
              <Zap className="h-4 w-4" />
            )}
          </div>
          <p className="mt-2 font-display text-2xl font-black leading-none tabular-nums text-foreground">
            {stats?.maxWeight && stats.maxWeight > 0 ? (
              <>
                {stats.maxWeight}
                <span className="ml-1 text-xs font-bold text-muted-foreground">kg</span>
              </>
            ) : stats?.avgRpe ? (
              `RPE ${stats.avgRpe}`
            ) : (
              '-'
            )}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {stats?.peakEstimated1RM && stats.peakEstimated1RM > 0
              ? `Est. 1RM: ~${stats.peakEstimated1RM} kg`
              : stats?.avgRpe
                ? `Średnie RPE: ${stats.avgRpe}`
                : 'Maks. obciążenie'}
          </p>
        </div>
      </section>

      {/* Personal Records Celebration Banner (Peak Moment) */}
      {workoutLog.newRecords && workoutLog.newRecords.length > 0 && (
        <section className="relative overflow-hidden rounded-[1.75rem] border border-amber-500/40 bg-gradient-to-br from-amber-500/15 via-yellow-500/10 to-transparent p-5 shadow-glow md:p-6">
          <div className="flex items-center gap-2.5">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-500 text-white shadow-md">
              <Trophy className="h-5 w-5" />
            </span>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-headline text-lg font-bold text-foreground">
                  Nowe Rekordy Życiowe!
                </h3>
                <Sparkles className="h-4 w-4 text-amber-500" />
              </div>
              <p className="text-xs text-muted-foreground">
                Świetna forma! W tym treningu pobiłeś {workoutLog.newRecords.length}{' '}
                {workoutLog.newRecords.length === 1 ? 'rekord' : 'rekordy'}.
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
            {workoutLog.newRecords.map((record, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-background/80 p-3 shadow-xs backdrop-blur-xs"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-foreground">{record.exerciseName}</p>
                  <p className="text-[11px] uppercase tracking-wider text-amber-600 dark:text-amber-400 font-semibold">
                    {record.type === 'max_weight' && 'Maksymalny ciężar'}
                    {record.type === 'max_reps' && 'Maksymalna liczba powtórzeń'}
                    {record.type === 'max_duration' && 'Czas maksymalny'}
                  </p>
                </div>
                <Badge className="shrink-0 bg-amber-500/20 text-amber-700 dark:text-amber-300 font-mono text-xs font-bold border-amber-500/30">
                  {record.type === 'max_weight' && `${record.value} kg @ ${record.reps} powt.`}
                  {record.type === 'max_reps' && `${record.value} powt.`}
                  {record.type === 'max_duration' && `${record.value} s`}
                </Badge>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Muscle Groups Distribution */}
      {stats?.muscleGroups && stats.muscleGroups.length > 0 && (
        <section className="rounded-[1.75rem] border border-border/70 bg-card/70 p-5 shadow-soft">
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              Zaangażowane partie mięśniowe
            </h3>
            <span className="text-xs text-muted-foreground">
              {stats.muscleGroups.length} {stats.muscleGroups.length === 1 ? 'partia' : 'partie'}
            </span>
          </div>

          {/* Progress bar split */}
          <div className="mt-3 flex h-2.5 w-full overflow-hidden rounded-full bg-secondary">
            {stats.muscleGroups.map((mg, i) => {
              const colors = ['bg-primary', 'bg-sky-500', 'bg-amber-500', 'bg-emerald-500', 'bg-purple-500', 'bg-pink-500'];
              const color = colors[i % colors.length];
              return (
                <div
                  key={mg.name}
                  style={{ width: `${mg.percent}%` }}
                  className={cn(color, 'transition-all')}
                  title={`${mg.name}: ${mg.percent}% (${mg.count} serii)`}
                />
              );
            })}
          </div>

          {/* Muscle chips */}
          <div className="mt-3.5 flex flex-wrap gap-2">
            {stats.muscleGroups.map((mg, i) => {
              const dotColors = ['bg-primary', 'bg-sky-500', 'bg-amber-500', 'bg-emerald-500', 'bg-purple-500', 'bg-pink-500'];
              const dot = dotColors[i % dotColors.length];
              return (
                <div
                  key={mg.name}
                  className="flex items-center gap-1.5 rounded-full border border-border/60 bg-secondary/50 px-3 py-1 text-xs"
                >
                  <span className={cn('h-2 w-2 rounded-full', dot)} />
                  <span className="font-medium text-foreground">{mg.name}</span>
                  <span className="text-muted-foreground">
                    · {mg.count} {seriesLabel(mg.count)} ({mg.percent}%)
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Exercise List & Sets Breakdown */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            Ćwiczenia · {exercisesLabel(workoutLog.exercises.length)}
          </h2>
          <span className="text-xs text-muted-foreground">
            Łącznie {stats?.totalSets || 0} {seriesLabel(stats?.totalSets || 0)}
          </span>
        </div>

        <div className="space-y-4">
          {workoutLog.exercises.map((series, exIndex) => {
            const exercise = series.exercise;
            const exType = exercise?.type || 'weight';
            const sets = series.sets || [];
            const exVolume = exType === 'weight'
              ? sets.reduce((acc, s) => acc + (s.reps || 0) * (s.weight || 0), 0)
              : 0;

            const mediaUrl = exercise?.mediaUrl || exercise?.image;
            const resolvedImg = mediaUrl ? resolveMediaUrl(mediaUrl) : null;

            return (
              <article
                key={exIndex}
                className="overflow-hidden rounded-[1.5rem] border border-border/70 bg-card/80 shadow-soft"
              >
                {/* Exercise Header */}
                <div className="flex flex-col gap-3 border-b border-border/50 bg-secondary/25 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-primary/10 font-headline text-xs font-bold text-primary">
                      {exIndex + 1}
                    </span>

                    {resolvedImg && (
                      <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-border/60 bg-secondary">
                        <img
                          src={resolvedImg}
                          alt={exercise?.name}
                          className="h-full w-full object-cover"
                          loading="lazy"
                          onError={(e) => {
                            // Hide broken image placeholder
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                    )}

                    <div className="min-w-0">
                      <h4 className="truncate font-semibold text-foreground text-sm sm:text-base">
                        {exercise?.name || 'Nieznane ćwiczenie'}
                      </h4>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                        <Badge variant="outline" className="h-5 px-1.5 text-[10px] gap-1">
                          {exType === 'weight' && <Dumbbell className="h-2.5 w-2.5" />}
                          {exType === 'reps' && <Repeat className="h-2.5 w-2.5" />}
                          {exType === 'duration' && <Timer className="h-2.5 w-2.5" />}
                          {exType === 'weight' ? 'Ciężar' : exType === 'reps' ? 'Powt.' : 'Czas'}
                        </Badge>
                        {series.tempo && (
                          <span className="font-mono text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-sm">
                            Tempo {series.tempo}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 self-end sm:self-auto">
                    {exVolume > 0 && (
                      <div className="text-right">
                        <p className="font-mono text-sm font-bold tabular-nums text-foreground">
                          {exVolume.toLocaleString('pl-PL')} kg
                        </p>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Objętość</p>
                      </div>
                    )}
                    <Badge variant="secondary" className="h-6 text-xs font-semibold px-2.5">
                      {sets.length} {seriesLabel(sets.length)}
                    </Badge>
                  </div>
                </div>

                {/* Coach Tip or Note */}
                {series.tip && (
                  <div className="flex items-start gap-2.5 border-b border-border/40 bg-primary/5 px-4 py-2.5 text-xs text-muted-foreground">
                    <Lightbulb className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                    <p className="leading-relaxed">{series.tip}</p>
                  </div>
                )}

                {/* Sets List */}
                <div className="divide-y divide-border/40">
                  {sets.map((set, setIndex) => {
                    const est1RM = exType === 'weight' ? calculate1RM(set.weight, set.reps) : null;

                    return (
                      <div
                        key={setIndex}
                        className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-secondary/15 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-secondary font-mono text-xs font-semibold text-muted-foreground">
                            {setIndex + 1}
                          </span>
                          <SetTypeBadge type={set.type} showLabel={false} />
                        </div>

                        <div className="flex items-center gap-3 font-mono">
                          {/* 1RM chip */}
                          {est1RM && (
                            <span
                              title="Szacowane 1RM wg wzoru Epleya"
                              className="hidden sm:inline-flex items-center rounded-md bg-secondary/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
                            >
                              ~{est1RM} kg 1RM
                            </span>
                          )}

                          {/* RPE pill */}
                          {set.rpe !== undefined && set.rpe > 0 && (
                            <span
                              title={rpeToRir(set.rpe)}
                              className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold tabular-nums text-primary"
                            >
                              RPE {set.rpe}
                            </span>
                          )}

                          {/* Rest time */}
                          {set.restTimeSeconds && set.restTimeSeconds > 0 ? (
                            <span className="hidden md:inline-flex text-[10px] text-muted-foreground">
                              {set.restTimeSeconds}s pauzy
                            </span>
                          ) : null}

                          {/* Primary set readout */}
                          <div className="min-w-[80px] text-right font-bold text-foreground text-sm">
                            {exType === 'duration' ? (
                              `${set.duration || 0} s`
                            ) : exType === 'weight' ? (
                              <>
                                <span className="text-foreground">{set.weight || 0} kg</span>
                                <span className="mx-1 text-muted-foreground">×</span>
                                <span className="text-foreground">{set.reps || 0}</span>
                              </>
                            ) : (
                              `${set.reps || 0} powt.`
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Trainer Feedback Section */}
      {workoutLog.feedback && (
        <section className="rounded-[1.75rem] border border-primary/30 bg-primary/5 p-5 shadow-soft md:p-6">
          <div className="flex items-center gap-2 text-primary font-semibold text-sm">
            <MessageSquare className="h-4 w-4" />
            <span>Komentarz od Twojego Trenera</span>
          </div>
          <div className="mt-3 rounded-2xl bg-background/80 p-4 border border-border/60">
            <p className="italic text-foreground text-sm leading-relaxed">
              "{workoutLog.feedback}"
            </p>
          </div>
        </section>
      )}

      {/* Bottom Actions Card / Thumb Zone */}
      <section className="sticky bottom-4 z-20 rounded-2xl border border-border/80 bg-background/90 p-3 shadow-lg backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <Button
            onClick={handleRepeatWorkout}
            className="flex-1 h-12 gap-2 rounded-xl text-sm font-bold shadow-md"
          >
            <RotateCcw className="h-4 w-4" />
            Powtórz ten trening
          </Button>

          <Button
            onClick={handleSaveAsTemplate}
            disabled={isSavingTemplate}
            variant="outline"
            className="h-12 gap-2 rounded-xl text-sm font-medium border-border/70"
          >
            <Copy className="h-4 w-4" />
            <span className="hidden sm:inline">Zapisz jako szablon</span>
            <span className="sm:hidden">Szablon</span>
          </Button>
        </div>
      </section>

      {/* Photo Lightbox Dialog */}
      <Dialog open={isPhotoOpen} onOpenChange={setIsPhotoOpen}>
        <DialogContent className="max-w-3xl overflow-hidden p-0 border-border/60 bg-black/95">
          <DialogTitle className="sr-only">Zdjęcie z treningu {workoutLog.workoutName}</DialogTitle>
          <DialogDescription className="sr-only">Podgląd pełnoekranowy zdjęcia z treningu</DialogDescription>
          {photoUrl && (
            <div className="relative flex max-h-[85vh] w-full items-center justify-center p-2">
              <img
                src={photoUrl}
                alt={`Zdjęcie z treningu ${workoutLog.workoutName}`}
                className="max-h-[80vh] w-auto max-w-full rounded-lg object-contain"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
