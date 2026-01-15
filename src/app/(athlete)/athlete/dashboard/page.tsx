'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { format, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Skeleton } from '@/components/ui/skeleton';
import { useCollection, useDoc, useUser } from '@/lib/db-hooks';
import type { WorkoutLog, Goal, BodyMeasurement, RunningSession, LoggedMeal, PlannedWorkout, UserProfile, TrainingPlan } from '@/lib/types';
import { Activity, Target, Weight, Footprints, ChefHat, Calendar as CalendarIcon, TrendingUp, Dumbbell, Clock, Award, Layers, User, MapPin, Bell } from 'lucide-react';
import type { TrainingSessionData } from '@/components/schedule/SessionDetailsDialog';

const StatCard = ({
  title,
  value,
  unit,
  icon: Icon,
  isLoading,
  trend,
  href
}: {
  title: string;
  value: string | number;
  unit?: string;
  icon: React.ElementType;
  isLoading: boolean;
  trend?: string;
  href?: string;
}) => {
  const CardComponent = href ? Link : 'div';
  return (
    <CardComponent href={href || ''} className={href ? 'block' : ''}>
      <Card className={href ? 'transition-all hover:shadow-lg' : ''}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <div className="text-2xl font-bold">
              {value} {unit && <span className="text-base font-normal text-muted-foreground">{unit}</span>}
            </div>
          )}
          {trend && !isLoading && (
            <p className="text-xs text-muted-foreground mt-1">{trend}</p>
          )}
        </CardContent>
      </Card>
    </CardComponent>
  );
};

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
  const { data: trainerSessions, isLoading: trainerSessionsLoading } = useCollection<TrainingSessionData>(
    user ? 'trainingSessions' : null,
    { athleteId: user?.uid }
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

  const isLoading = workoutsLoading || goalsLoading || measurementsLoading || runningLoading || mealsLoading || assignedPlansLoading;

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="mb-6">
        <h1 className="font-headline text-3xl font-bold">Panel Sportowca</h1>
        <p className="text-muted-foreground">Witaj, {userProfile?.name}! Oto Twój przegląd postępów.</p>
      </div>

      {/* Statistics Grid */}
      <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Treningi w tym tygodniu"
          value={stats.thisWeekWorkouts}
          icon={Dumbbell}
          isLoading={isLoading}
          trend={`z ${stats.totalWorkouts} łącznie`}
          href="/athlete/history"
        />
        <StatCard
          title="Objętość tego tygodnia"
          value={stats.thisWeekVolume.toLocaleString()}
          unit="kg"
          icon={Activity}
          isLoading={isLoading}
          href="/athlete/history"
        />
        <StatCard
          title="Ukończone cele"
          value={`${stats.completedGoals}/${stats.totalGoals}`}
          icon={Target}
          isLoading={isLoading}
          href="/athlete/goals"
        />
        <StatCard
          title="Aktualna waga"
          value={stats.currentWeight.toFixed(1)}
          unit="kg"
          icon={Weight}
          isLoading={isLoading}
          href="/athlete/measurements"
        />
        <StatCard
          title="Bieganie (30 dni)"
          value={stats.totalRunningDistance.toFixed(1)}
          unit="km"
          icon={Footprints}
          isLoading={isLoading}
          trend={`${Math.round(stats.totalRunningTime)} min łącznie`}
          href="/athlete/running"
        />
        <StatCard
          title="Przypisane plany"
          value={assignedPlans?.length || 0}
          icon={Award}
          isLoading={isLoading}
          href="/athlete/workout-plans"
        />
        <StatCard
          title="Zaplanowane na dziś"
          value={plannedWorkouts?.filter(p => {
            const today = new Date();
            return format(new Date(p.date), 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');
          }).length || 0}
          icon={CalendarIcon}
          isLoading={plannedLoading}
          href="/athlete/calendar"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Workouts */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="font-headline">Ostatnie Treningi</CardTitle>
              <CardDescription>Twoja najnowsza aktywność treningowa</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/athlete/history">Zobacz wszystkie</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-md border">
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </div>
            ) : recentWorkouts && recentWorkouts.length > 0 ? (
              <div className="space-y-3">
                {recentWorkouts.map(workout => {
                  const totalVolume = workout.exercises.reduce((acc, ex) => {
                    if (ex.exercise?.type !== 'weight') return acc;
                    const exVolume = ex.sets.reduce((setAcc, set) => setAcc + (set.reps || 0) * (set.weight || 0), 0);
                    return acc + exVolume;
                  }, 0);

                  return (
                    <Link key={workout.id} href={`/athlete/history/${workout.id}`}>
                      <div className="flex items-center justify-between p-3 rounded-md border hover:bg-secondary/50 transition-colors">
                        <div>
                          <p className="font-semibold">{workout.workoutName}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(workout.endTime), 'd MMM yyyy', { locale: pl })} • {workout.duration} min
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{totalVolume.toLocaleString()} kg</p>
                          <p className="text-sm text-muted-foreground">{workout.exercises.length} ćwiczeń</p>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <Dumbbell className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Brak ostatnich treningów</p>
                <Button variant="outline" className="mt-2" asChild>
                  <Link href="/athlete/log">Rozpocznij trening</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active Goals */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="font-headline">Aktywne Cele</CardTitle>
              <CardDescription>Twój postęp w osiąganiu celów</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/athlete/goals">Zobacz wszystkie</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-2 w-full" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                ))}
              </div>
            ) : goals && goals.length > 0 ? (
              <div className="space-y-4">
                {goals.slice(0, 3).map(goal => {
                  const progress = Math.min((goal.current / goal.target) * 100, 100);
                  const isCompleted = progress >= 100;

                  return (
                    <div key={goal.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-sm">{goal.title}</p>
                        <Badge variant={isCompleted ? "default" : "secondary"}>
                          {progress.toFixed(0)}%
                        </Badge>
                      </div>
                      <Progress value={progress} className={isCompleted ? '[&>div]:bg-green-500' : ''} />
                      <p className="text-xs text-muted-foreground">
                        {goal.current.toLocaleString()} / {goal.target.toLocaleString()} {goal.unit}
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <Target className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Brak aktywnych celów</p>
                <Button variant="outline" className="mt-2" asChild>
                  <Link href="/athlete/goals">Ustaw cel</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Trainer Sessions */}
      {upcomingTrainerSessions.length > 0 && (
        <Card className="mt-6 border-orange-500/30 bg-orange-500/5">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500/20">
                <Bell className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <CardTitle className="font-headline">Sesje z Trenerem</CardTitle>
                <CardDescription>Nadchodzące spotkania treningowe</CardDescription>
              </div>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/athlete/calendar">Zobacz kalendarz</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {upcomingTrainerSessions.slice(0, 3).map((session) => {
                const sessionDate = new Date(session.date);
                return (
                  <Link key={session.id} href="/athlete/calendar" className="block">
                    <div className="p-4 rounded-lg border border-orange-500/20 hover:bg-orange-500/10 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold">{session.title}</h4>
                        <Badge
                          className={session.status === 'confirmed'
                            ? 'bg-green-500 hover:bg-green-600'
                            : 'bg-orange-500 hover:bg-orange-600'
                          }
                        >
                          {session.status === 'confirmed' ? 'Potwierdzona' : 'Oczekuje'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                        <CalendarIcon className="h-3 w-3" />
                        <span>{format(sessionDate, 'EEEE, d MMM', { locale: pl })}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                        <Clock className="h-3 w-3" />
                        <span>{format(sessionDate, 'HH:mm')} ({session.duration} min)</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="h-3 w-3" />
                        <span>{session.trainerName}</span>
                      </div>
                      {session.location && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                          <MapPin className="h-3 w-3" />
                          <span>{session.location}</span>
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Assigned Workout Plans */}
      {assignedPlans && assignedPlans.length > 0 && (
        <Card className="mt-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="font-headline">Plany Treningowe od Trenera</CardTitle>
              <CardDescription>Przypisane Ci programy treningowe</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/athlete/workout-plans">Zobacz szczegóły</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {assignedPlans.slice(0, 3).map((plan) => {
                const totalWeeks = plan.stages.reduce((acc, stage) => acc + stage.weeks.length, 0);
                return (
                  <Link key={plan.id} href="/athlete/workout-plans" className="block">
                    <div className="p-4 rounded-lg border hover:bg-secondary/50 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold">{plan.name}</h4>
                        <Badge variant="outline" className="text-xs">{plan.level}</Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Layers className="h-3 w-3" />
                          <span>{plan.stages.length} etapów</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <CalendarIcon className="h-3 w-3" />
                          <span>{totalWeeks} tyg.</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="font-headline">Szybkie Akcje</CardTitle>
          <CardDescription>Najczęściej używane funkcje</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Button asChild className="h-auto p-4 flex-col">
              <Link href="/athlete/log">
                <Dumbbell className="h-8 w-8 mb-2" />
                <span>Rozpocznij Trening</span>
              </Link>
            </Button>
            <Button variant="outline" asChild className="h-auto p-4 flex-col">
              <Link href="/athlete/measurements">
                <Weight className="h-8 w-8 mb-2" />
                <span>Dodaj Pomiary</span>
              </Link>
            </Button>
            <Button variant="outline" asChild className="h-auto p-4 flex-col">
              <Link href="/athlete/running">
                <Footprints className="h-8 w-8 mb-2" />
                <span>Zapisz Bieg</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
