'use client';

import { useMemo, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { format, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useCollection, useDoc, useUser } from '@/lib/db-hooks';
import type { WorkoutLog, Goal, BodyMeasurement, RunningSession, LoggedMeal, PlannedWorkout, UserProfile, TrainingPlan, Habit, HabitLog } from '@/lib/types';
import { Activity, Target, Weight, Footprints, ChefHat, Calendar as CalendarIcon, TrendingUp, Dumbbell, Clock, Award, Layers, User, MapPin, CheckSquare, Play, ArrowRight, Check } from 'lucide-react';
import type { TrainingSessionData } from '@/components/schedule/SessionDetailsDialog';
import { ActiveChallenges } from '@/components/challenges/ActiveChallenges';

/* ---------- Bento building blocks ---------- */

const Tile = ({ to, className, children }: { to?: string; className?: string; children: ReactNode }) => {
  const base = 'group relative block overflow-hidden rounded-[1.75rem] border border-border/60 bg-card p-4 shadow-soft transition-all duration-200';
  if (to) {
    return (
      <Link to={to} className={cn(base, 'hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lifted active:scale-[0.97]', className)}>
        {children}
      </Link>
    );
  }
  return <div className={cn(base, className)}>{children}</div>;
};

const TileLabel = ({ children }: { children: ReactNode }) => (
  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{children}</p>
);

const TileValue = ({ value, unit, isLoading }: { value: string | number; unit?: string; isLoading?: boolean }) =>
  isLoading ? (
    <Skeleton className="mt-2 h-8 w-20" />
  ) : (
    <p className="mt-2 font-headline text-[1.7rem] font-bold leading-none tracking-tight tabular-nums">
      {value}
      {unit && <span className="ml-1 text-sm font-semibold text-muted-foreground">{unit}</span>}
    </p>
  );

function ProgressRing({ value, max, size = 116, stroke = 11, children }: { value: number; max: number; size?: number; stroke?: number; children?: ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="ring-ember" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--primary))" />
            <stop offset="100%" stopColor="hsl(var(--volt))" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-foreground/10" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          stroke="url(#ring-ember)"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  );
}

const SectionHeader = ({ title, sub, href, linkLabel = 'Wszystkie' }: { title: string; sub?: string; href?: string; linkLabel?: string }) => (
  <div className="mb-3 flex items-end justify-between gap-3">
    <div className="min-w-0">
      <h2 className="font-headline text-lg font-bold tracking-tight md:text-xl">{title}</h2>
      {sub && <p className="text-xs text-muted-foreground md:text-sm">{sub}</p>}
    </div>
    {href && (
      <Link
        to={href}
        className="flex shrink-0 items-center gap-1 pb-0.5 text-[11px] font-bold uppercase tracking-wider text-primary transition-colors hover:text-primary/80"
      >
        {linkLabel} <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    )}
  </div>
);

export default function AthleteDashboardPage() {
  const { user } = useUser();

  // User profile
  const { data: userProfile } = useDoc<UserProfile>(user ? 'users' : null, user?.uid || null);

  // Date ranges
  const { weekStart, weekEnd, thirtyDaysAgo, todayStart, todayEnd } = useMemo(() => {
    const now = new Date();
    const weekStart = startOfWeek(now, { locale: pl });
    const weekEnd = endOfWeek(now, { locale: pl });

    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);

    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    return { weekStart, weekEnd, thirtyDaysAgo, todayStart, todayEnd };
  }, []);

  // Recent workouts (last 5)
  const { data: recentWorkouts, isLoading: workoutsLoading } = useCollection<WorkoutLog>(
    user ? 'workoutLogs' : null,
    { athleteId: user?.uid, status: 'completed' },
    { sort: { endTime: -1 }, limit: 5 }
  );

  // Active goals
  const { data: goals, isLoading: goalsLoading } = useCollection<Goal>(
    user ? 'goals' : null,
    { ownerId: user?.uid }
  );

  // Latest body measurement
  const { data: latestMeasurements, isLoading: measurementsLoading } = useCollection<BodyMeasurement>(
    user ? 'bodyMeasurements' : null,
    { ownerId: user?.uid },
    { sort: { date: -1 }, limit: 1 }
  );

  // Recent running sessions (last 30 days)
  const { data: runningSessions, isLoading: runningLoading } = useCollection<RunningSession>(
    user ? 'runningSessions' : null,
    { ownerId: user?.uid, date: { $gte: thirtyDaysAgo.toISOString() } },
    { sort: { date: -1 } }
  );

  // Recent meals (today)
  const { data: todayMeals, isLoading: mealsLoading } = useCollection<LoggedMeal>(
    user ? 'meals' : null,
    { ownerId: user?.uid, date: { $gte: todayStart.toISOString(), $lte: todayEnd.toISOString() } }
  );

  // This week's planned workouts
  const { data: plannedWorkouts, isLoading: plannedLoading } = useCollection<PlannedWorkout>(
    user ? 'plannedWorkouts' : null,
    { ownerId: user?.uid, date: { $gte: weekStart.toISOString(), $lte: weekEnd.toISOString() } }
  );

  // Assigned workout plans
  const { data: assignedPlans, isLoading: assignedPlansLoading } = useCollection<TrainingPlan>(
    user ? 'workoutPlans' : null,
    { assignedAthleteIds: user?.uid }
  );

  // Upcoming trainer sessions
  const { data: trainerSessions } = useCollection<TrainingSessionData>(
    user ? 'trainingSessions' : null,
    { athleteId: user?.uid }
  );

  // Habits data
  const { data: habits, isLoading: habitsLoading } = useCollection<Habit>(
    user ? 'habits' : null,
    { ownerId: user?.uid, isActive: true }
  );

  // Habit logs for this week
  const { data: habitLogs } = useCollection<HabitLog>(
    user ? 'habitlogs' : null,
    { ownerId: user?.uid }
  );

  // Upcoming planned workouts (next 7 days)
  const sevenDaysLater = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return date;
  }, []);

  const todayIso = useMemo(() => new Date().toISOString(), []);

  const { data: upcomingPlannedWorkouts } = useCollection<PlannedWorkout>(
    user ? 'plannedWorkouts' : null,
    {
      ownerId: user?.uid,
      date: { $gte: todayIso, $lte: sevenDaysLater.toISOString() }
    },
    { sort: { date: 1 } }
  );

  // Filter upcoming sessions (next 7 days, not cancelled)
  const upcomingTrainerSessions = useMemo(() => {
    if (!trainerSessions) return [];
    const now = new Date();
    const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return trainerSessions
      .filter(session => {
        const sessionDate = new Date(session.date);
        return sessionDate >= now && sessionDate <= weekLater && session.status !== 'cancelled';
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [trainerSessions]);

  // Calculate stats
  const stats = useMemo(() => {
    // Workout stats
    const totalWorkouts = recentWorkouts?.length || 0;
    const thisWeekWorkouts = recentWorkouts?.filter(w =>
      isWithinInterval(new Date(w.endTime), { start: weekStart, end: weekEnd })
    ).length || 0;

    // Goals progress
    const completedGoals = goals?.filter(g => (g.current / g.target) * 100 >= 100).length || 0;
    const totalGoals = goals?.length || 0;

    // Weight progress
    const currentWeight = latestMeasurements?.[0]?.weight || 0;

    // Running stats
    const totalRunningDistance = runningSessions?.reduce((acc, session) => acc + session.distance, 0) || 0;
    const totalRunningTime = runningSessions?.reduce((acc, session) => acc + session.duration, 0) || 0;

    // Today's calories
    const todayCalories = todayMeals?.reduce((acc, meal) =>
      acc + meal.foodItems.reduce((mealAcc, item) => mealAcc + item.calories, 0), 0
    ) || 0;

    // This week's training volume
    const thisWeekVolume = recentWorkouts?.filter(w =>
      isWithinInterval(new Date(w.endTime), { start: weekStart, end: weekEnd })
    ).reduce((acc, w) => {
      return acc + w.exercises.reduce((exAcc, ex) => {
        if (ex.exercise?.type !== 'weight') return exAcc;
        return exAcc + ex.sets.reduce((setAcc, set) => setAcc + (set.reps || 0) * (set.weight || 0), 0);
      }, 0);
    }, 0) || 0;

    return {
      totalWorkouts,
      thisWeekWorkouts,
      completedGoals,
      totalGoals,
      currentWeight,
      totalRunningDistance,
      totalRunningTime,
      todayCalories,
      thisWeekVolume,
    };
  }, [recentWorkouts, goals, latestMeasurements, runningSessions, todayMeals, weekStart, weekEnd]);

  // Calculate habits stats for the week
  const habitsStats = useMemo(() => {
    if (!habits || habits.length === 0) return { completionRate: 0, completedToday: 0, totalHabits: 0 };

    const today = format(new Date(), 'yyyy-MM-dd');
    const weekDates: string[] = [];
    let currentDate = weekStart;
    while (currentDate <= weekEnd && currentDate <= new Date()) {
      weekDates.push(format(currentDate, 'yyyy-MM-dd'));
      currentDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000);
    }

    // Create a lookup for completed habits
    const completedLookup = new Set<string>();
    habitLogs?.forEach(log => {
      if (log.completed) {
        completedLookup.add(`${log.habitId}-${log.date}`);
      }
    });

    // Count completions
    let totalPossible = 0;
    let totalCompleted = 0;
    let completedToday = 0;

    weekDates.forEach(dateStr => {
      habits.forEach(habit => {
        // Check if habit should be active on this day
        const date = new Date(dateStr);
        const dayOfWeek = date.getDay();
        let isActiveOnDay = true;

        if (habit.frequency?.type === 'specific_days') {
          isActiveOnDay = habit.frequency?.daysOfWeek?.includes(dayOfWeek) ?? false;
        }

        if (isActiveOnDay) {
          totalPossible++;
          if (completedLookup.has(`${habit.id}-${dateStr}`)) {
            totalCompleted++;
            if (dateStr === today) {
              completedToday++;
            }
          }
        }
      });
    });

    const completionRate = totalPossible > 0 ? Math.round((totalCompleted / totalPossible) * 100) : 0;

    return {
      completionRate,
      completedToday,
      totalHabits: habits.length,
    };
  }, [habits, habitLogs, weekStart, weekEnd]);

  const isLoading = workoutsLoading || goalsLoading || measurementsLoading || runningLoading || mealsLoading || assignedPlansLoading || habitsLoading;

  const plannedTodayCount = plannedWorkouts?.filter(p =>
    format(new Date(p.date), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
  ).length || 0;

  const weeklyTarget = Math.max(plannedWorkouts?.length || 0, stats.thisWeekWorkouts, 3);

  // Current week, day by day: completed / planned / rest
  const weekDays = useMemo(() => {
    const todayKey = format(new Date(), 'yyyy-MM-dd');
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      const key = format(d, 'yyyy-MM-dd');
      return {
        label: format(d, 'EEEEEE', { locale: pl }),
        isToday: key === todayKey,
        done: recentWorkouts?.some(w => format(new Date(w.endTime), 'yyyy-MM-dd') === key) || false,
        planned: plannedWorkouts?.some(p => format(new Date(p.date), 'yyyy-MM-dd') === key) || false,
      };
    });
  }, [recentWorkouts, plannedWorkouts, weekStart]);

  const firstName = userProfile?.name?.split(' ')[0] || 'Sportowcu';

  return (
    <div className="container mx-auto max-w-7xl px-4 pb-10 pt-5 md:px-8 md:pt-8">
      <div className="stagger-rise">
        {/* Hero — typographic statement */}
        <section className="mb-6 md:mb-10">
          <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-muted-foreground">
            {format(new Date(), 'EEEE · d MMMM yyyy', { locale: pl })}
          </p>
          <h1 className="mt-2.5 font-display text-[1.85rem] font-extrabold uppercase leading-[1.08] tracking-tight md:text-5xl">
            Cześć, {firstName}!
            <br />
            <span className="text-gradient-ember">Czas na ruch</span>
          </h1>
        </section>

        {/* Bento grid */}
        <section className="grid grid-cols-2 gap-3 md:grid-flow-dense md:grid-cols-4 md:gap-4">
          {/* CTA */}
          <Link
            to="/athlete/log"
            className="hero-ember texture-grain group relative col-span-2 flex items-center justify-between gap-4 overflow-hidden rounded-[1.75rem] p-5 text-white shadow-glow transition-transform duration-200 active:scale-[0.98] md:p-6"
          >
            <div aria-hidden className="pointer-events-none absolute -right-12 -top-16 h-44 w-44 rounded-full border-[1.1rem] border-white/10" />
            <div className="relative min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/75">Trenuj teraz</p>
              <p className="mt-1 font-display text-xl font-extrabold uppercase leading-tight md:text-2xl">
                Rozpocznij trening
              </p>
              {plannedTodayCount > 0 && (
                <span className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-black/25 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm">
                  <CalendarIcon className="h-3 w-3" /> Dziś: {plannedTodayCount} zaplanowane
                </span>
              )}
            </div>
            <span className="relative grid h-14 w-14 shrink-0 place-items-center rounded-full bg-white text-primary shadow-lg transition-transform duration-200 group-hover:scale-105 group-active:scale-95">
              <Play className="h-6 w-6 fill-current" />
            </span>
          </Link>

          {/* Weekly ring */}
          <Tile to="/athlete/history" className="row-span-2 flex flex-col items-center justify-between gap-2 py-5">
            <TileLabel>Ten tydzień</TileLabel>
            <ProgressRing value={stats.thisWeekWorkouts} max={weeklyTarget}>
              <div className="text-center">
                <p className="font-display text-3xl font-extrabold leading-none tabular-nums">
                  {isLoading ? '–' : stats.thisWeekWorkouts}
                </p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">/ {weeklyTarget}</p>
              </div>
            </ProgressRing>
            <p className="text-center text-[11px] leading-tight text-muted-foreground">
              treningi
              <br />
              łącznie {stats.totalWorkouts}
            </p>
          </Tile>

          {/* Volume */}
          <Tile to="/athlete/history">
            <div className="flex items-center justify-between">
              <TileLabel>Objętość</TileLabel>
              <Activity className="h-4 w-4 text-muted-foreground/50 transition-colors group-hover:text-primary" />
            </div>
            <TileValue value={stats.thisWeekVolume.toLocaleString()} unit="kg" isLoading={isLoading} />
            <p className="mt-1 text-[11px] text-muted-foreground">w tym tygodniu</p>
          </Tile>

          {/* Weight */}
          <Tile to="/athlete/measurements">
            <div className="flex items-center justify-between">
              <TileLabel>Waga</TileLabel>
              <Weight className="h-4 w-4 text-muted-foreground/50 transition-colors group-hover:text-primary" />
            </div>
            <TileValue value={stats.currentWeight.toFixed(1)} unit="kg" isLoading={isLoading} />
            <p className="mt-1 text-[11px] text-muted-foreground">ostatni pomiar</p>
          </Tile>

          {/* Week strip */}
          <Tile className="col-span-2 md:col-span-2">
            <TileLabel>Twój tydzień</TileLabel>
            <div className="mt-3 flex items-center justify-between">
              {weekDays.map((d, i) => (
                <span
                  key={i}
                  title={d.label}
                  className={cn(
                    'grid h-9 w-9 place-items-center rounded-full text-[10px] font-bold uppercase transition-all md:h-10 md:w-10',
                    d.done
                      ? 'hero-ember text-white shadow-glow'
                      : d.planned
                        ? 'border-2 border-volt/70 text-volt'
                        : 'border border-border text-muted-foreground/60',
                    d.isToday && !d.done && 'ring-2 ring-primary/60 ring-offset-2 ring-offset-card'
                  )}
                >
                  {d.done ? <Check className="h-4 w-4" strokeWidth={3} /> : d.label}
                </span>
              ))}
            </div>
          </Tile>

          {/* Running */}
          <Tile to="/athlete/running">
            <div className="flex items-center justify-between">
              <TileLabel>Bieganie</TileLabel>
              <Footprints className="h-4 w-4 text-muted-foreground/50 transition-colors group-hover:text-primary" />
            </div>
            <TileValue value={stats.totalRunningDistance.toFixed(1)} unit="km" isLoading={isLoading} />
            <p className="mt-1 text-[11px] text-muted-foreground">30 dni · {Math.round(stats.totalRunningTime)} min</p>
          </Tile>

          {/* Goals */}
          <Tile to="/athlete/goals">
            <div className="flex items-center justify-between">
              <TileLabel>Cele</TileLabel>
              <Target className="h-4 w-4 text-muted-foreground/50 transition-colors group-hover:text-primary" />
            </div>
            <TileValue value={`${stats.completedGoals}/${stats.totalGoals}`} isLoading={isLoading} />
            <Progress
              value={stats.totalGoals > 0 ? (stats.completedGoals / stats.totalGoals) * 100 : 0}
              className="mt-2.5 h-1.5"
            />
          </Tile>

          {/* Calories today */}
          <Tile>
            <div className="flex items-center justify-between">
              <TileLabel>Kalorie</TileLabel>
              <ChefHat className="h-4 w-4 text-muted-foreground/50" />
            </div>
            <TileValue value={stats.todayCalories.toLocaleString()} unit="kcal" isLoading={isLoading} />
            <p className="mt-1 text-[11px] text-muted-foreground">zjedzone dziś</p>
          </Tile>

          {/* Assigned plans */}
          <Tile to="/athlete/workout-plans">
            <div className="flex items-center justify-between">
              <TileLabel>Programy</TileLabel>
              <Award className="h-4 w-4 text-muted-foreground/50 transition-colors group-hover:text-primary" />
            </div>
            <TileValue value={assignedPlans?.length || 0} isLoading={isLoading} />
            <p className="mt-1 text-[11px] text-muted-foreground">od trenera</p>
          </Tile>
        </section>

        {/* Running Challenges */}
        <section className="mt-8">
          <ActiveChallenges />
        </section>

        {/* Recent workouts + goals */}
        <section className="mt-8 grid gap-8 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <SectionHeader title="Ostatnie treningi" sub="Twoja najnowsza aktywność" href="/athlete/history" />
            {isLoading ? (
              <div className="space-y-2.5">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between rounded-2xl border border-border/60 bg-card p-4">
                    <div className="space-y-1.5">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </div>
            ) : recentWorkouts && recentWorkouts.length > 0 ? (
              <div className="space-y-2.5">
                {recentWorkouts.map(workout => {
                  const totalVolume = workout.exercises.reduce((acc, ex) => {
                    if (ex.exercise?.type !== 'weight') return acc;
                    const exVolume = ex.sets.reduce((setAcc, set) => setAcc + (set.reps || 0) * (set.weight || 0), 0);
                    return acc + exVolume;
                  }, 0);

                  return (
                    <Link
                      key={workout.id}
                      to={`/athlete/history/${workout.id}`}
                      className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card p-3.5 shadow-soft transition-all hover:border-primary/30 hover:shadow-lifted active:scale-[0.99]"
                    >
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
                        <Dumbbell className="h-5 w-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{workout.workoutName}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(workout.endTime), 'd MMM yyyy', { locale: pl })} · {workout.duration} min
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-headline font-bold tabular-nums">{totalVolume.toLocaleString()} kg</p>
                        <p className="text-xs text-muted-foreground">{workout.exercises.length} ćwiczeń</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-[1.75rem] border border-dashed border-border bg-card/50 p-8 text-center">
                <span className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-secondary text-primary">
                  <Dumbbell className="h-7 w-7" />
                </span>
                <p className="text-sm text-muted-foreground">Brak ostatnich treningów</p>
                <Button variant="outline" size="sm" className="mt-3" asChild>
                  <Link to="/athlete/log">Rozpocznij trening</Link>
                </Button>
              </div>
            )}
          </div>

          <div className="lg:col-span-2">
            <SectionHeader title="Aktywne cele" sub="Twój postęp" href="/athlete/goals" />
            {isLoading ? (
              <div className="space-y-4 rounded-[1.75rem] border border-border/60 bg-card p-5">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-2 w-full" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                ))}
              </div>
            ) : goals && goals.length > 0 ? (
              <div className="space-y-5 rounded-[1.75rem] border border-border/60 bg-card p-5 shadow-soft">
                {goals.slice(0, 3).map(goal => {
                  const progress = Math.min((goal.current / goal.target) * 100, 100);
                  const isCompleted = progress >= 100;

                  return (
                    <div key={goal.id} className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold">{goal.title}</p>
                        <Badge
                          variant={isCompleted ? 'default' : 'secondary'}
                          className={isCompleted ? 'border-transparent bg-volt text-volt-foreground' : ''}
                        >
                          {progress.toFixed(0)}%
                        </Badge>
                      </div>
                      <Progress value={progress} />
                      <p className="text-xs tabular-nums text-muted-foreground">
                        {goal.current.toLocaleString()} / {goal.target.toLocaleString()} {goal.unit}
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-[1.75rem] border border-dashed border-border bg-card/50 p-8 text-center">
                <span className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-secondary text-primary">
                  <Target className="h-7 w-7" />
                </span>
                <p className="text-sm text-muted-foreground">Brak aktywnych celów</p>
                <Button variant="outline" size="sm" className="mt-3" asChild>
                  <Link to="/athlete/goals">Ustaw cel</Link>
                </Button>
              </div>
            )}
          </div>
        </section>

        {/* Upcoming Trainer Sessions */}
        {upcomingTrainerSessions.length > 0 && (
          <section className="mt-8">
            <SectionHeader title="Sesje z trenerem" sub="Nadchodzące spotkania" href="/athlete/calendar" linkLabel="Kalendarz" />
            <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 md:pb-0 lg:grid-cols-3">
              {upcomingTrainerSessions.slice(0, 3).map((session) => {
                const sessionDate = new Date(session.date);
                return (
                  <Link
                    key={session.id}
                    to="/athlete/calendar"
                    className="w-[16.5rem] shrink-0 snap-start rounded-[1.75rem] border border-border/60 bg-card p-4 shadow-soft transition-all hover:border-primary/30 hover:shadow-lifted active:scale-[0.98] md:w-auto"
                  >
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <h4 className="min-w-0 truncate font-semibold">{session.title}</h4>
                      <Badge
                        className={session.status === 'confirmed'
                          ? 'border-transparent bg-volt text-volt-foreground'
                          : 'border-transparent bg-secondary text-foreground'
                        }
                      >
                        {session.status === 'confirmed' ? 'Potwierdzona' : 'Oczekuje'}
                      </Badge>
                    </div>
                    <div className="space-y-1.5 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="h-3.5 w-3.5" />
                        <span className="capitalize">{format(sessionDate, 'EEEE, d MMM', { locale: pl })}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{format(sessionDate, 'HH:mm')} ({session.duration} min)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <User className="h-3.5 w-3.5" />
                        <span>{session.trainerName}</span>
                      </div>
                      {session.location && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5" />
                          <span className="truncate">{session.location}</span>
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* Assigned Workout Plans */}
        {assignedPlans && assignedPlans.length > 0 && (
          <section className="mt-8">
            <SectionHeader title="Plany od trenera" sub="Przypisane programy" href="/athlete/workout-plans" linkLabel="Szczegóły" />
            <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 md:pb-0 lg:grid-cols-3">
              {assignedPlans.slice(0, 3).map((plan) => {
                const totalWeeks = plan.stages.reduce((acc, stage) => acc + stage.weeks.length, 0);
                return (
                  <Link
                    key={plan.id}
                    to="/athlete/workout-plans"
                    className="w-[16.5rem] shrink-0 snap-start rounded-[1.75rem] border border-border/60 bg-card p-4 shadow-soft transition-all hover:border-primary/30 hover:shadow-lifted active:scale-[0.98] md:w-auto"
                  >
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <h4 className="min-w-0 truncate font-semibold">{plan.name}</h4>
                      <Badge variant="outline">{plan.level}</Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Layers className="h-3.5 w-3.5" />
                        <span>{plan.stages.length} etapów</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <CalendarIcon className="h-3.5 w-3.5" />
                        <span>{totalWeeks} tyg.</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* Habits */}
        {habits && habits.length > 0 && (
          <section className="mt-8">
            <SectionHeader title="Nawyki" sub="Codzienna konsekwencja" href="/athlete/habits" linkLabel="Zarządzaj" />
            <div className="mb-3 flex gap-2.5">
              <div className="flex-1 rounded-2xl border border-border/60 bg-card p-3 text-center shadow-soft">
                <p className="font-headline text-xl font-bold tabular-nums text-volt">{habitsStats.completionRate}%</p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">ten tydzień</p>
              </div>
              <div className="flex-1 rounded-2xl border border-border/60 bg-card p-3 text-center shadow-soft">
                <p className="font-headline text-xl font-bold tabular-nums">
                  {habitsStats.completedToday}/{habitsStats.totalHabits}
                </p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">dziś</p>
              </div>
            </div>

            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
              {habits.slice(0, 6).map((habit) => {
                const today = format(new Date(), 'yyyy-MM-dd');
                const isCompletedToday = habitLogs?.some(
                  log => log.habitId === habit.id && log.date === today && log.completed
                );

                return (
                  <Link key={habit.id} to="/athlete/habits" className="block">
                    <div
                      className={cn(
                        'flex items-center gap-3 rounded-2xl border p-3 transition-all active:scale-[0.99]',
                        isCompletedToday
                          ? 'border-volt/40 bg-volt/10'
                          : 'border-border/60 bg-card hover:bg-secondary/50'
                      )}
                    >
                      <span className="text-2xl">{habit.icon || '💪'}</span>
                      <div className="min-w-0 flex-1">
                        <p className={cn('truncate font-medium', isCompletedToday && 'text-volt')}>
                          {habit.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {habit.frequency?.type === 'daily'
                            ? 'Codziennie'
                            : habit.frequency?.type === 'specific_days'
                              ? 'Wybrane dni'
                              : `Co ${habit.frequency?.repeatEvery} dni`
                          }
                        </p>
                      </div>
                      {isCompletedToday && (
                        <CheckSquare className="h-5 w-5 shrink-0 text-volt" />
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>

            {habits.length > 6 && (
              <div className="mt-3 text-center">
                <Button variant="link" size="sm" asChild>
                  <Link to="/athlete/habits">Zobacz wszystkie ({habits.length})</Link>
                </Button>
              </div>
            )}
          </section>
        )}

        {/* Upcoming Planned Workouts */}
        {upcomingPlannedWorkouts && upcomingPlannedWorkouts.length > 0 && (
          <section className="mt-8">
            <SectionHeader title="Zaplanowane treningi" sub="Nadchodzące sesje" href="/athlete/calendar" linkLabel="Kalendarz" />
            <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 md:pb-0 lg:grid-cols-3">
              {upcomingPlannedWorkouts.slice(0, 6).map((workout) => {
                const workoutDate = new Date(workout.date);
                const now = new Date();
                const diffTime = workoutDate.getTime() - now.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                let timeBadge = '';
                if (diffDays === 0) {
                  timeBadge = 'Dzisiaj';
                } else if (diffDays === 1) {
                  timeBadge = 'Jutro';
                } else {
                  timeBadge = `Za ${diffDays} dni`;
                }

                return (
                  <div
                    key={workout.id}
                    className="w-[16.5rem] shrink-0 snap-start rounded-[1.75rem] border border-border/60 bg-card p-4 shadow-soft transition-all hover:border-primary/30 hover:shadow-lifted md:w-auto"
                  >
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <h4 className="min-w-0 truncate font-semibold">{workout.workoutName}</h4>
                      <Badge className={diffDays === 0 ? '' : 'border-transparent bg-secondary text-foreground'}>
                        {timeBadge}
                      </Badge>
                    </div>
                    <div className="space-y-1.5 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="h-3.5 w-3.5" />
                        <span className="capitalize">{format(workoutDate, 'EEEE, d MMM', { locale: pl })}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{format(workoutDate, 'HH:mm')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Dumbbell className="h-3.5 w-3.5" />
                        <span>{workout.exercises.length} ćwiczeń</span>
                      </div>
                    </div>
                    {(workout as any).workoutId && (
                      <div className="mt-3 flex gap-2">
                        <Button size="sm" className="flex-1" asChild>
                          <Link to={`/athlete/log?workoutId=${(workout as any).workoutId}`}>
                            Rozpocznij
                          </Link>
                        </Button>
                        <Button size="sm" variant="outline" asChild>
                          <Link to={`/athlete/workouts/${(workout as any).workoutId}`}>
                            Szczegóły
                          </Link>
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Quick Actions */}
        <section className="mt-8">
          <SectionHeader title="Szybkie akcje" sub="Najczęściej używane funkcje" />
          <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
            <Link
              to="/athlete/log"
              className="hero-ember texture-grain group relative flex flex-col items-center justify-center gap-2.5 overflow-hidden rounded-[1.75rem] p-5 text-white shadow-glow transition-transform duration-200 hover:-translate-y-0.5 active:scale-[0.96]"
            >
              <Play className="h-7 w-7 fill-current" />
              <span className="text-center text-[11px] font-bold uppercase tracking-wider leading-tight">Rozpocznij trening</span>
            </Link>
            <Link
              to="/athlete/measurements"
              className="group flex flex-col items-center justify-center gap-2.5 rounded-[1.75rem] border border-border/60 bg-card p-5 shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lifted active:scale-[0.96]"
            >
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-secondary text-primary">
                <Weight className="h-5 w-5" />
              </span>
              <span className="text-center text-[11px] font-bold uppercase tracking-wider leading-tight">Dodaj pomiary</span>
            </Link>
            <Link
              to="/athlete/running"
              className="group flex flex-col items-center justify-center gap-2.5 rounded-[1.75rem] border border-border/60 bg-card p-5 shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lifted active:scale-[0.96]"
            >
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-secondary text-primary">
                <Footprints className="h-5 w-5" />
              </span>
              <span className="text-center text-[11px] font-bold uppercase tracking-wider leading-tight">Zapisz bieg</span>
            </Link>
            <Link
              to="/athlete/progress"
              className="group flex flex-col items-center justify-center gap-2.5 rounded-[1.75rem] border border-border/60 bg-card p-5 shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lifted active:scale-[0.96]"
            >
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-secondary text-primary">
                <TrendingUp className="h-5 w-5" />
              </span>
              <span className="text-center text-[11px] font-bold uppercase tracking-wider leading-tight">Zobacz postępy</span>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
