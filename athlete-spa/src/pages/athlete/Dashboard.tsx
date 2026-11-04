'use client';

import { useMemo, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import useSWR from 'swr';
import { format, startOfWeek, endOfWeek, isSameDay, isWithinInterval } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Reorder, useDragControls } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { BigNumber, SectionHeader } from '@/components/ui/section';
import { cn } from '@/lib/utils';
import { jsonFetcher, useCollection, useDoc, useUser } from '@/lib/db-hooks';
import type { WorkoutLog, Goal, BodyMeasurement, RunningSession, StravaActivity, PlannedWorkout, UserProfile, TrainingPlan } from '@/lib/types';
import { Target, Weight, Calendar as CalendarIcon, Dumbbell, Award, User, CheckSquare, Check, GripVertical, Eye, EyeOff, RotateCcw, LayoutGrid, Trophy, SlidersHorizontal, Users, Activity, UtensilsCrossed, type AnimatedIcon } from '@/components/animated-icons';
import { ChevronRight } from 'lucide-react';
import type { TrainingSessionData } from '@/components/schedule/SessionDetailsDialog';
import { ActiveChallenges } from '@/components/challenges/ActiveChallenges';
import { FriendsActivityFeed } from '@/components/social/FriendsActivityFeed';
import { useDashboardLayout, type DashboardSectionId, type DashboardSectionState } from '@/hooks/useDashboardLayout';
import { useActiveWorkout } from '@/hooks/useActiveWorkout';
import { useGamificationProfile } from '@/hooks/useGamification';
import { useTodayHabits } from '@/hooks/useTodayHabits';
import { DailyBar, type BarPlate } from '@/components/dashboard/DailyBar';
import { WeekStrip, type WeekDay } from '@/components/dashboard/WeekStrip';
import { TodayHero } from '@/components/dashboard/TodayHero';
import { HabitsToday } from '@/components/dashboard/HabitsToday';
import { NutritionToday } from '@/components/dashboard/NutritionToday';
import { todayISO, type DiaryResponse } from '@/lib/nutrition';
import { exercisesLabel } from '@/lib/plural';

/* ---------- Editable dashboard sections ---------- */

const SECTION_META: Record<DashboardSectionId, { title: string; icon: AnimatedIcon }> = {
  bar: { title: 'Sztanga dnia', icon: Dumbbell },
  habits: { title: 'Nawyki', icon: CheckSquare },
  nutrition: { title: 'Jedzenie', icon: UtensilsCrossed },
  upcoming: { title: 'Nadchodzące', icon: CalendarIcon },
  'week-stats': { title: 'Ten tydzień', icon: Activity },
  plans: { title: 'Program od trenera', icon: Award },
  challenges: { title: 'Wyzwania biegowe', icon: Trophy },
  recent: { title: 'Ostatnie treningi', icon: LayoutGrid },
  goals: { title: 'Cele', icon: Target },
  'friends-activity': { title: 'Ekipa', icon: Users },
};

/** Compact, draggable representation of a section shown in layout edit mode. */
function DashboardSectionEditRow({
  section,
  onToggle,
}: {
  section: DashboardSectionState;
  onToggle: (id: DashboardSectionId) => void;
}) {
  const controls = useDragControls();
  const meta = SECTION_META[section.id];
  const Icon = meta.icon;

  return (
    <Reorder.Item
      as="div"
      value={section.id}
      dragListener={false}
      dragControls={controls}
      whileDrag={{ scale: 1.02 }}
      className={cn('flex items-center gap-2 rounded-2xl bg-card p-2', !section.visible && 'opacity-60')}
    >
      <button
        type="button"
        aria-label={`Przeciągnij sekcję „${meta.title}”`}
        onPointerDown={e => controls.start(e)}
        className="grid h-11 w-9 shrink-0 cursor-grab touch-none place-items-center text-muted-foreground active:cursor-grabbing"
      >
        <GripVertical className="h-5 w-5" />
      </button>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-secondary text-muted-foreground">
        <Icon className="h-4 w-4" />
      </span>
      <p className="min-w-0 flex-1 truncate text-[15px] font-semibold">{meta.title}</p>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={section.visible ? `Ukryj sekcję „${meta.title}”` : `Pokaż sekcję „${meta.title}”`}
        onClick={() => onToggle(section.id)}
        className="shrink-0"
      >
        {section.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
      </Button>
    </Reorder.Item>
  );
}

/** Date block + title row, shared by planned workouts and trainer sessions. */
function AgendaRow({ date, title, meta, href }: { date: Date; title: string; meta: string; href: string }) {
  return (
    <Link to={href} className="row-tap flex items-center gap-3 px-3.5 py-2.5">
      <span className="w-9 shrink-0 text-center">
        <span className="block text-xs font-medium capitalize text-muted-foreground">{format(date, 'EEEEEE', { locale: pl })}</span>
        <span className="block font-display text-[1.625rem] font-bold leading-none tabular-nums">{format(date, 'd')}</span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold leading-tight">{title}</span>
        <span className="block truncate text-xs text-muted-foreground">{meta}</span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" />
    </Link>
  );
}

function WeekStat({ to, label, value, unit, sub, isLoading }: { to: string; label: string; value: ReactNode; unit?: string; sub?: string; isLoading?: boolean }) {
  return (
    <Link to={to} className="row-tap min-w-0 p-3.5">
      <p className="truncate text-xs font-medium text-muted-foreground">{label}</p>
      {isLoading ? <Skeleton className="mt-1.5 h-7 w-14" /> : <BigNumber value={value} unit={unit} className="mt-1 block truncate text-[1.875rem]" />}
      {sub && <p className="mt-1 truncate text-xs text-muted-foreground">{sub}</p>}
    </Link>
  );
}

const logVolume = (log: WorkoutLog) =>
  log.exercises.reduce(
    (sum, ex) => (ex.exercise?.type === 'weight' ? sum + ex.sets.reduce((acc, set) => acc + (set.reps || 0) * (set.weight || 0), 0) : sum),
    0
  );

export default function AthleteDashboardPage() {
  const { user } = useUser();
  const { layout, isEditing, setIsEditing, toggleSection, reorderSections, resetLayout } = useDashboardLayout();
  const { activeWorkout } = useActiveWorkout();
  const { stats: gamification } = useGamificationProfile();
  const { habits: todayHabits, isDone, toggle: toggleHabit, doneCount: habitsDone } = useTodayHabits();

  // User profile
  const { data: userProfile } = useDoc<UserProfile>(user ? 'users' : null, user?.uid || null);

  // Date ranges
  const { weekStart, weekEnd, thirtyDaysAgo } = useMemo(() => {
    const now = new Date();
    const weekStart = startOfWeek(now, { locale: pl });
    const weekEnd = endOfWeek(now, { locale: pl });

    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);

    return { weekStart, weekEnd, thirtyDaysAgo };
  }, []);

  // Recent workouts: enough to cover the week strip and compare with the last session
  const { data: recentWorkouts, isLoading: workoutsLoading } = useCollection<WorkoutLog>(
    user ? 'workoutLogs' : null,
    { athleteId: user?.uid, status: 'completed' },
    { sort: { endTime: -1 }, limit: 12 }
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
    { sort: { date: -1 }, limit: 2 }
  );

  // Recent running sessions (last 30 days)
  const { data: runningSessions, isLoading: runningLoading } = useCollection<RunningSession>(
    user ? 'runningSessions' : null,
    { ownerId: user?.uid, date: { $gte: thirtyDaysAgo.toISOString() } },
    { sort: { date: -1 } }
  );

  // Recent Strava activities (last 30 days)
  const { data: stravaActivities, isLoading: stravaLoading } = useCollection<StravaActivity>(
    user ? 'stravaActivities' : null,
    { ownerId: user?.uid, date: { $gte: thirtyDaysAgo.toISOString() } },
    { sort: { date: -1 } }
  );

  // Today's food diary, with the daily targets it is measured against
  const { data: diary } = useSWR<DiaryResponse>(
    user ? `/api/athlete/nutrition/diary?date=${todayISO()}` : null,
    jsonFetcher
  );

  // Assigned workout plans
  const { data: assignedPlans } = useCollection<TrainingPlan>(
    user ? 'workoutPlans' : null,
    { assignedAthleteIds: user?.uid }
  );

  // Upcoming trainer sessions
  const { data: trainerSessions } = useCollection<TrainingSessionData>(
    user ? 'trainingSessions' : null,
    { athleteId: user?.uid }
  );

  // Planned workouts: one request covering both the current week and the next
  // 7 days; the views below are derived from it instead of fetching twice.
  const plannedRange = useMemo(() => {
    const now = new Date();
    const sevenDaysLater = new Date(now);
    sevenDaysLater.setDate(now.getDate() + 7);
    return {
      now,
      sevenDaysLater,
      to: new Date(Math.max(weekEnd.getTime(), sevenDaysLater.getTime())).toISOString(),
    };
  }, [weekEnd]);

  const { data: allPlannedWorkouts } = useCollection<PlannedWorkout>(
    user ? 'plannedWorkouts' : null,
    { ownerId: user?.uid, date: { $gte: weekStart.toISOString(), $lte: plannedRange.to } },
    { sort: { date: 1 } }
  );

  const today = plannedRange.now;

  const plannedThisWeek = useMemo(
    () => (allPlannedWorkouts ?? []).filter(p => isWithinInterval(new Date(p.date), { start: weekStart, end: weekEnd })),
    [allPlannedWorkouts, weekStart, weekEnd]
  );
  const plannedToday = useMemo(() => plannedThisWeek.find(p => isSameDay(new Date(p.date), today)), [plannedThisWeek, today]);

  const doneThisWeek = useMemo(
    () => (recentWorkouts ?? []).filter(w => isWithinInterval(new Date(w.endTime), { start: weekStart, end: weekEnd })),
    [recentWorkouts, weekStart, weekEnd]
  );
  const doneToday = useMemo(() => doneThisWeek.find(w => isSameDay(new Date(w.endTime), today)), [doneThisWeek, today]);

  // Agenda: planned workouts and trainer sessions in one list, soonest first
  const upcoming = useMemo(() => {
    const planned = (allPlannedWorkouts ?? [])
      .filter(p => new Date(p.date) > today && new Date(p.date) <= plannedRange.sevenDaysLater && !isSameDay(new Date(p.date), today))
      .map(p => {
        const workoutId = (p as PlannedWorkout & { workoutId?: string }).workoutId;
        return {
          id: `planned-${p.id}`,
          date: new Date(p.date),
          title: p.workoutName,
          meta: `${format(new Date(p.date), 'HH:mm')} · ${exercisesLabel(p.exercises.length)}`,
          href: workoutId ? `/athlete/workouts/${workoutId}` : '/athlete/calendar',
        };
      });
    const sessions = (trainerSessions ?? [])
      .filter(session => {
        const date = new Date(session.date);
        return date >= today && date <= plannedRange.sevenDaysLater && session.status !== 'cancelled';
      })
      .map(session => ({
        id: `session-${session.id}`,
        date: new Date(session.date),
        title: session.title,
        meta: `${format(new Date(session.date), 'HH:mm')} · ${session.trainerName}`,
        href: '/athlete/calendar',
      }));
    return [...planned, ...sessions].sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [allPlannedWorkouts, trainerSessions, today, plannedRange]);

  const weekRunningKm = useMemo(() => {
    const inWeek = (date: string) => isWithinInterval(new Date(date), { start: weekStart, end: weekEnd });
    const manual = (runningSessions ?? []).filter(s => inWeek(s.date)).reduce((sum, s) => sum + s.distance, 0);
    const strava = (stravaActivities ?? []).filter(a => inWeek(a.date)).reduce((sum, a) => sum + a.distance / 1000, 0);
    return manual + strava;
  }, [runningSessions, stravaActivities, weekStart, weekEnd]);

  const ranToday =
    (runningSessions ?? []).some(s => isSameDay(new Date(s.date), today)) ||
    (stravaActivities ?? []).some(a => isSameDay(new Date(a.date), today));

  const weekVolume = doneThisWeek.reduce((sum, w) => sum + logVolume(w), 0);
  const currentWeight = latestMeasurements?.[0]?.weight;
  const previousWeight = latestMeasurements?.[1]?.weight;
  const weightDelta = currentWeight && previousWeight ? currentWeight - previousWeight : null;

  const isLoading = workoutsLoading || goalsLoading || measurementsLoading || runningLoading || stravaLoading;

  const weeklyTarget = Math.max(plannedThisWeek.length, doneThisWeek.length, 3);

  // Current week, day by day: completed / planned / rest
  const weekDays = useMemo<WeekDay[]>(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return {
        label: format(d, 'EEEEEE', { locale: pl }),
        day: d.getDate(),
        isToday: isSameDay(d, today),
        done: recentWorkouts?.some(w => isSameDay(new Date(w.endTime), d)) || false,
        planned: plannedThisWeek.some(p => isSameDay(new Date(p.date), d)),
      };
    });
  }, [recentWorkouts, plannedThisWeek, weekStart, today]);

  /* ---------- Sztanga dnia ---------- */

  const plates = useMemo<BarPlate[]>(() => {
    const totals = diary?.totals ?? { calories: 0, protein: 0, carbs: 0, fat: 0 };
    const goal = diary?.goal ?? null;
    const proteinTarget = goal?.dailyProtein ?? Math.round((currentWeight ?? userProfile?.weight ?? 75) * 1.6);

    // A week with a plan makes today's empty slot a deliberate rest day, and rest counts.
    const trained = Boolean(doneToday) || ranToday;
    const restDay = !trained && !plannedToday && plannedThisWeek.length > 0;

    return [
      {
        id: 'training',
        kg: 25,
        label: restDay ? 'Odpoczynek' : 'Trening',
        hint: trained ? 'zrobiony' : restDay ? 'dzień wolny' : plannedToday ? format(new Date(plannedToday.date), "'o' HH:mm") : 'jeszcze nie',
        loaded: trained || restDay,
        href: '/athlete/log',
      },
      {
        id: 'food',
        kg: 20,
        label: 'Jedzenie',
        hint: goal ? `${Math.round(totals.calories)} kcal` : `${diary?.entries.length ?? 0} wpisów`,
        loaded: goal ? totals.calories >= goal.dailyCalories * 0.7 : (diary?.entries.length ?? 0) >= 3,
        href: '/athlete/nutrition',
      },
      {
        id: 'protein',
        kg: 15,
        label: 'Białko',
        hint: `${Math.round(totals.protein)}/${proteinTarget} g`,
        loaded: totals.protein >= proteinTarget * 0.9,
        href: '/athlete/nutrition',
      },
      {
        id: 'habits',
        kg: 10,
        label: 'Nawyki',
        hint: todayHabits.length ? `${habitsDone}/${todayHabits.length}` : 'brak',
        loaded: todayHabits.length > 0 && habitsDone === todayHabits.length,
        href: '/athlete/habits',
      },
    ];
  }, [diary, currentWeight, userProfile, doneToday, ranToday, plannedToday, plannedThisWeek, todayHabits, habitsDone]);

  /* ---------- Section registry ---------- */

  const sectionContent: Record<DashboardSectionId, ReactNode> = {
    bar: <DailyBar plates={plates} />,

    habits: todayHabits.length > 0 ? (
      <HabitsToday habits={todayHabits} isDone={isDone} onToggle={toggleHabit} doneCount={habitsDone} />
    ) : null,

    nutrition: <NutritionToday totals={diary?.totals ?? { calories: 0, protein: 0, carbs: 0, fat: 0 }} goal={diary?.goal ?? null} />,

    upcoming: upcoming.length > 0 ? (
      <section>
        <SectionHeader title="Nadchodzące" href="/athlete/calendar" linkLabel="Kalendarz" />
        <div className="divide-y divide-border/50 overflow-hidden rounded-2xl bg-card">
          {upcoming.slice(0, 4).map(item => (
            <AgendaRow key={item.id} date={item.date} title={item.title} meta={item.meta} href={item.href} />
          ))}
        </div>
      </section>
    ) : null,

    'week-stats': (
      <section>
        <SectionHeader title="Ten tydzień" href="/athlete/progress" linkLabel="Wykresy" />
        <div className="grid grid-cols-3 divide-x divide-border/50 overflow-hidden rounded-2xl bg-card">
          <WeekStat
            to="/athlete/history"
            label="Objętość"
            value={weekVolume >= 10000 ? (weekVolume / 1000).toLocaleString('pl-PL', { maximumFractionDigits: 1 }) : Math.round(weekVolume).toLocaleString('pl-PL')}
            unit={weekVolume >= 10000 ? 't' : 'kg'}
            isLoading={isLoading && !recentWorkouts}
          />
          <WeekStat
            to="/athlete/running"
            label="Bieganie"
            value={weekRunningKm.toLocaleString('pl-PL', { maximumFractionDigits: 1 })}
            unit="km"
            isLoading={isLoading && !runningSessions}
          />
          <WeekStat
            to="/athlete/measurements"
            label="Waga"
            value={currentWeight ? currentWeight.toLocaleString('pl-PL', { minimumFractionDigits: 1 }) : '–'}
            unit={currentWeight ? 'kg' : undefined}
            sub={weightDelta !== null ? `${weightDelta > 0 ? '+' : ''}${weightDelta.toLocaleString('pl-PL', { maximumFractionDigits: 1 })} kg` : undefined}
            isLoading={isLoading && !latestMeasurements}
          />
        </div>
      </section>
    ),

    plans: assignedPlans && assignedPlans.length > 0 ? (
      <section>
        <SectionHeader title="Program od trenera" />
        <div className="divide-y divide-border/50 overflow-hidden rounded-2xl bg-card">
          {assignedPlans.slice(0, 2).map(plan => {
            const totalWeeks = plan.stages.reduce((acc, stage) => acc + stage.weeks.length, 0);
            return (
              <Link key={plan.id} to="/athlete/workout-plans" className="row-tap flex items-center gap-3 px-3.5 py-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary text-social">
                  <Award className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold leading-tight">{plan.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {plan.stages.length} etapy · {totalWeeks} tygodni
                  </span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" />
              </Link>
            );
          })}
        </div>
      </section>
    ) : null,

    challenges: <ActiveChallenges />,

    recent: recentWorkouts && recentWorkouts.length > 0 ? (
      <section>
        <SectionHeader title="Ostatnie treningi" href="/athlete/history" linkLabel="Historia" />
        <div className="divide-y divide-border/50 overflow-hidden rounded-2xl bg-card">
          {recentWorkouts.slice(0, 3).map(workout => (
            <Link key={workout.id} to={`/athlete/history/${workout.id}`} className="row-tap flex items-center gap-3 px-3.5 py-3">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-semibold leading-tight">{workout.workoutName}</span>
                <span className="block truncate text-xs capitalize text-muted-foreground">
                  {format(new Date(workout.endTime), 'EEEE, d MMM', { locale: pl })}
                  {workout.duration ? ` · ${workout.duration} min` : ''}
                </span>
              </span>
              <BigNumber value={Math.round(logVolume(workout)).toLocaleString('pl-PL')} unit="kg" className="shrink-0 text-[1.375rem]" />
            </Link>
          ))}
        </div>
      </section>
    ) : null,

    goals: goals && goals.some(goal => goal.current < goal.target) ? (
      <section>
        <SectionHeader title="Cele" href="/athlete/goals" />
        <div className="space-y-3.5 rounded-2xl bg-card p-4">
          {goals
            .filter(goal => goal.current < goal.target)
            .slice(0, 3)
            .map(goal => {
              const progress = Math.min((goal.current / goal.target) * 100, 100);
              return (
                <div key={goal.id}>
                  <div className="mb-1.5 flex items-baseline justify-between gap-2">
                    <p className="truncate text-sm font-semibold">{goal.title}</p>
                    <p className="shrink-0 text-xs tabular-nums text-muted-foreground">
                      {goal.current.toLocaleString('pl-PL')} / {goal.target.toLocaleString('pl-PL')} {goal.unit}
                    </p>
                  </div>
                  <Progress value={progress} />
                </div>
              );
            })}
        </div>
      </section>
    ) : null,

    // Friends need a full account (social is gated for guests).
    'friends-activity': user && !user.isGuest ? (
      <section>
        <SectionHeader title="Ekipa" href="/athlete/social" />
        <FriendsActivityFeed limit={3} />
      </section>
    ) : null,
  };

  if (isEditing) {
    return (
      <div className="page">
        <div className="mb-4 flex items-center justify-between gap-3 px-1">
          <div className="min-w-0">
            <h2 className="text-lg font-bold leading-tight">Układ ekranu</h2>
            <p className="text-sm text-muted-foreground">Przeciągnij lub ukryj sekcje.</p>
          </div>
          <Button size="sm" onClick={() => setIsEditing(false)} className="shrink-0">
            <Check className="h-4 w-4" />
            Gotowe
          </Button>
        </div>

        <Reorder.Group
          as="div"
          axis="y"
          values={layout.map(s => s.id)}
          onReorder={reorderSections}
          className="space-y-2"
        >
          {layout.map(section => (
            <DashboardSectionEditRow key={section.id} section={section} onToggle={toggleSection} />
          ))}
        </Reorder.Group>

        <Button variant="ghost" size="sm" onClick={resetLayout} className="mt-3 w-full text-muted-foreground">
          <RotateCcw className="h-3.5 w-3.5" />
          Przywróć domyślny układ
        </Button>
      </div>
    );
  }

  return (
    <div className="page stagger-rise space-y-4">
      <WeekStrip days={weekDays} doneCount={doneThisWeek.length} target={weeklyTarget} streak={gamification?.streaks.workout} />

      <TodayHero
        active={activeWorkout}
        planned={plannedToday}
        doneToday={doneToday}
        lastWorkout={recentWorkouts?.[0]}
      />

      {layout
        .filter(s => s.visible)
        .map(s => {
          const content = sectionContent[s.id];
          return content ? <div key={s.id}>{content}</div> : null;
        })}

      <button
        type="button"
        onClick={() => setIsEditing(true)}
        className="mx-auto flex h-11 items-center gap-2 px-4 text-sm font-medium text-muted-foreground active:text-foreground"
      >
        <SlidersHorizontal className="h-4 w-4" />
        Dostosuj ekran
      </button>
    </div>
  );
}
