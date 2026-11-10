import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Check, ChevronRight, Footprints, Play, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { exercisesLabel, setsLabel } from '@/lib/plural';
import type { PlannedWorkout, WorkoutLog } from '@/lib/types';

const volumeOf = (log: WorkoutLog) =>
  log.exercises.reduce(
    (sum, ex) => (ex.exercise?.type === 'weight' ? sum + ex.sets.reduce((acc, set) => acc + (set.reps || 0) * (set.weight || 0), 0) : sum),
    0
  );

const setCountOf = (log: WorkoutLog) => log.exercises.reduce((sum, ex) => sum + ex.sets.filter(set => set.completed).length, 0);

type PlannedWithTemplate = PlannedWorkout & { workoutId?: string };

interface TodayHeroProps {
  active: WorkoutLog | null;
  planned: PlannedWorkout | undefined;
  doneToday: WorkoutLog | undefined;
  lastWorkout: WorkoutLog | undefined;
}

/** The one thing to do today. Everything else on the screen is secondary to this. */
export function TodayHero({ active, planned, doneToday, lastWorkout }: TodayHeroProps) {
  if (active) {
    const total = active.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
    const done = setCountOf(active);
    return (
      <section className="rounded-2xl bg-primary p-4 text-primary-foreground">
        <p className="text-[13px] font-semibold opacity-80">Trening w toku · {done}/{total} serii</p>
        <h2 className="mt-1 line-clamp-2 font-display text-[3.25rem] font-bold uppercase leading-[0.95]">{active.workoutName}</h2>
        <Button asChild className="mt-4 w-full bg-primary-foreground text-primary active:bg-primary-foreground/85">
          <Link to={`/athlete/log?logId=${active.id}`}>
            <Play className="fill-current" /> Wróć do treningu
          </Link>
        </Button>
      </section>
    );
  }

  if (doneToday) {
    return (
      <Link to={`/athlete/history/${doneToday.id}`} className="block rounded-2xl bg-card p-4 transition-transform active:scale-[0.99]">
        <p className="flex items-center gap-1.5 text-[13px] font-semibold text-volt">
          <Check className="h-4 w-4" strokeWidth={3} /> Dzisiejszy trening zrobiony
        </p>
        <div className="mt-1 flex items-end justify-between gap-3">
          <h2 className="line-clamp-2 min-w-0 font-display text-[2.75rem] font-bold uppercase leading-[0.95]">{doneToday.workoutName}</h2>
          <ChevronRight className="mb-1 h-5 w-5 shrink-0 text-muted-foreground" />
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          {doneToday.duration ? `${doneToday.duration} min · ` : ''}
          {setsLabel(setCountOf(doneToday))} · {Math.round(volumeOf(doneToday)).toLocaleString('pl-PL')} kg
        </p>
      </Link>
    );
  }

  if (planned) {
    const workoutId = (planned as PlannedWithTemplate).workoutId;
    return (
      <section className="rounded-2xl bg-primary p-4 text-primary-foreground">
        <p className="text-[13px] font-semibold opacity-80">Dziś o {format(new Date(planned.date), 'HH:mm')}</p>
        <h2 className="mt-1 line-clamp-2 font-display text-[3.25rem] font-bold uppercase leading-[0.95]">{planned.workoutName}</h2>
        <p className="mt-1.5 line-clamp-1 text-sm font-medium opacity-80">
          {exercisesLabel(planned.exercises.length)}
          {planned.exercises[0]?.name ? ` · zaczynasz od: ${planned.exercises[0].name}` : ''}
        </p>
        <div className="mt-4 flex gap-2">
          <Button asChild className="flex-1 bg-primary-foreground text-primary active:bg-primary-foreground/85">
            <Link to={workoutId ? `/athlete/log?workoutId=${workoutId}` : '/athlete/log'}>
              <Play className="fill-current" /> Zacznij trening
            </Link>
          </Button>
          {workoutId && (
            <Button asChild variant="ghost" className="bg-black/10 px-4 text-primary-foreground active:bg-black/20 active:text-primary-foreground">
              <Link to={`/athlete/workouts/${workoutId}`}>Podgląd</Link>
            </Button>
          )}
        </div>
      </section>
    );
  }

  const repeatHref = lastWorkout?.sourceWorkoutId ? `/athlete/log?workoutId=${lastWorkout.sourceWorkoutId}` : '/athlete/log';
  return (
    <section className="rounded-2xl bg-card p-4">
      <h2 className="mt-1 font-display text-[2.75rem] font-bold uppercase leading-[0.95]">Wolny dzień?</h2>
      <p className="mt-1.5 text-sm text-muted-foreground">Odpocznij albo wejdź na salę. Wybór należy do Ciebie.</p>
      <div className="mt-4 flex gap-2">
        <Button asChild className="min-w-0 flex-1">
          <Link to={repeatHref}>
            {lastWorkout ? <RotateCcw /> : <Play className="fill-current" />}
            <span className="truncate">{lastWorkout ? `Powtórz ${lastWorkout.workoutName}` : 'Zacznij trening'}</span>
          </Link>
        </Button>
        <Button asChild variant="secondary" className="px-4">
          <Link to="/athlete/running">
            <Footprints /> Bieg
          </Link>
        </Button>
      </div>
    </section>
  );
}
