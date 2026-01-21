import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { format, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { fetchCollection } from '@/api/db';
import {
  Activity,
  Target,
  Weight,
  Footprints,
  Dumbbell,
  Loader2,
} from 'lucide-react';
import type { WorkoutLog, Goal, BodyMeasurement, RunningSession } from '@/types';

interface StatCardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon: React.ElementType;
  isLoading: boolean;
  trend?: string;
  href?: string;
}

function StatCard({ title, value, unit, icon: Icon, isLoading, trend, href }: StatCardProps) {
  const CardWrapper = href ? Link : 'div';
  const wrapperProps = href ? { to: href } : {};

  return (
    <CardWrapper {...(wrapperProps as any)} className={href ? 'block' : ''}>
      <Card className={href ? 'transition-all hover:shadow-lg' : ''}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-8 w-24 animate-pulse rounded bg-muted" />
          ) : (
            <div className="text-2xl font-bold">
              {value} {unit && <span className="text-base font-normal text-muted-foreground">{unit}</span>}
            </div>
          )}
          {trend && !isLoading && <p className="text-xs text-muted-foreground mt-1">{trend}</p>}
        </CardContent>
      </Card>
    </CardWrapper>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { userProfile } = useUserProfile();

  // Date ranges
  const { weekStart, weekEnd, thirtyDaysAgo } = useMemo(() => {
    const now = new Date();
    const weekStart = startOfWeek(now, { locale: pl });
    const weekEnd = endOfWeek(now, { locale: pl });

    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);

    return { weekStart, weekEnd, thirtyDaysAgo };
  }, []);

  // Recent workouts
  const { data: recentWorkouts, isLoading: workoutsLoading } = useQuery({
    queryKey: ['workoutLogs', user?.id],
    queryFn: () =>
      fetchCollection<WorkoutLog>('workoutLogs', {
        query: { athleteId: user?.id, status: 'completed' },
        sort: { endTime: -1 },
        limit: 5,
      }),
    enabled: !!user?.id,
  });

  // Goals
  const { data: goals, isLoading: goalsLoading } = useQuery({
    queryKey: ['goals', user?.id],
    queryFn: () =>
      fetchCollection<Goal>('goals', {
        query: { ownerId: user?.id },
      }),
    enabled: !!user?.id,
  });

  // Latest body measurement
  const { data: measurements, isLoading: measurementsLoading } = useQuery({
    queryKey: ['bodyMeasurements', user?.id],
    queryFn: () =>
      fetchCollection<BodyMeasurement>('bodyMeasurements', {
        query: { ownerId: user?.id },
        sort: { date: -1 },
        limit: 1,
      }),
    enabled: !!user?.id,
  });

  // Running sessions
  const { data: runningSessions, isLoading: runningLoading } = useQuery({
    queryKey: ['runningSessions', user?.id],
    queryFn: () =>
      fetchCollection<RunningSession>('runningSessions', {
        query: { ownerId: user?.id, date: { $gte: thirtyDaysAgo.toISOString() } },
        sort: { date: -1 },
      }),
    enabled: !!user?.id,
  });

  // Calculate stats
  const stats = useMemo(() => {
    const totalWorkouts = recentWorkouts?.length || 0;
    const thisWeekWorkouts =
      recentWorkouts?.filter((w) => isWithinInterval(new Date(w.endTime), { start: weekStart, end: weekEnd })).length ||
      0;

    const completedGoals = goals?.filter((g) => ((g.currentValue || g.current || 0) / (g.targetValue || g.target || 1)) * 100 >= 100).length || 0;
    const totalGoals = goals?.length || 0;

    const currentWeight = measurements?.[0]?.weight || 0;

    const totalRunningDistance = runningSessions?.reduce((acc, session) => acc + session.distance, 0) || 0;
    const totalRunningTime = runningSessions?.reduce((acc, session) => acc + session.duration, 0) || 0;

    const thisWeekVolume =
      recentWorkouts
        ?.filter((w) => isWithinInterval(new Date(w.endTime), { start: weekStart, end: weekEnd }))
        .reduce((acc, w) => {
          return (
            acc +
            w.exercises.reduce((exAcc, ex) => {
              if (ex.exercise?.type !== 'weight') return exAcc;
              return exAcc + ex.sets.reduce((setAcc, set) => setAcc + (set.reps || 0) * (set.weight || 0), 0);
            }, 0)
          );
        }, 0) || 0;

    return {
      totalWorkouts,
      thisWeekWorkouts,
      completedGoals,
      totalGoals,
      currentWeight,
      totalRunningDistance,
      totalRunningTime,
      thisWeekVolume,
    };
  }, [recentWorkouts, goals, measurements, runningSessions, weekStart, weekEnd]);

  const isLoading = workoutsLoading || goalsLoading || measurementsLoading || runningLoading;

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
              <Link to="/athlete/history">Zobacz wszystkie</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {workoutsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : recentWorkouts && recentWorkouts.length > 0 ? (
              <div className="space-y-3">
                {recentWorkouts.map((workout) => {
                  const totalVolume = workout.exercises.reduce((acc, ex) => {
                    if (ex.exercise?.type !== 'weight') return acc;
                    const exVolume = ex.sets.reduce((setAcc, set) => setAcc + (set.reps || 0) * (set.weight || 0), 0);
                    return acc + exVolume;
                  }, 0);

                  return (
                    <Link key={workout.id} to={`/athlete/history/${workout.id}`}>
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
                  <Link to="/athlete/log">Rozpocznij trening</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Szybkie Akcje</CardTitle>
            <CardDescription>Najczęściej używane funkcje</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button asChild className="w-full justify-start">
              <Link to="/athlete/log">
                <Dumbbell className="mr-2 h-4 w-4" />
                Rozpocznij Trening
              </Link>
            </Button>
            <Button variant="outline" asChild className="w-full justify-start">
              <Link to="/athlete/measurements">
                <Weight className="mr-2 h-4 w-4" />
                Dodaj Pomiary
              </Link>
            </Button>
            <Button variant="outline" asChild className="w-full justify-start">
              <Link to="/athlete/running">
                <Footprints className="mr-2 h-4 w-4" />
                Zapisz Bieg
              </Link>
            </Button>
            <Button variant="outline" asChild className="w-full justify-start">
              <Link to="/athlete/goals">
                <Target className="mr-2 h-4 w-4" />
                Zarządzaj Celami
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
