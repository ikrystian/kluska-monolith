'use client';

import { useCollection } from '@/lib/db-hooks';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Users,
  Dumbbell,
  FileText,
  Calendar,
  Target,
  Utensils,
  ClipboardList,
  Coins,
  Scale,
  UserPlus,
  TrendingUp,
  Trophy,
  Activity,
} from 'lucide-react';
import { useMemo } from 'react';

export default function AdminDashboardPage() {
  const { data: users } = useCollection('users');
  const { data: exercises } = useCollection('exercises');
  const { data: articles } = useCollection('articles');
  const { data: workoutLogs } = useCollection('workoutLogs');
  const { data: workoutPlans } = useCollection('workoutPlans');
  const { data: meals } = useCollection('meals');
  const { data: goals } = useCollection('goals');
  const { data: gamificationProfiles } = useCollection('gamificationProfiles');
  const { data: bodyMeasurements } = useCollection('bodyMeasurements');
  const { data: trainerRequests } = useCollection('trainerRequests');

  // Time-based calculations
  const timeStats = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    const usersToday = users?.filter((u: any) => new Date(u.createdAt) >= today).length || 0;
    const usersWeek = users?.filter((u: any) => new Date(u.createdAt) >= weekAgo).length || 0;
    const usersMonth = users?.filter((u: any) => new Date(u.createdAt) >= monthAgo).length || 0;

    const workoutsToday = workoutLogs?.filter((w: any) => new Date(w.startTime) >= today).length || 0;
    const workoutsWeek = workoutLogs?.filter((w: any) => new Date(w.startTime) >= weekAgo).length || 0;
    const workoutsMonth = workoutLogs?.filter((w: any) => new Date(w.startTime) >= monthAgo).length || 0;

    return { usersToday, usersWeek, usersMonth, workoutsToday, workoutsWeek, workoutsMonth };
  }, [users, workoutLogs]);

  // Top statistics
  const topStats = useMemo(() => {
    // Top users by workout count
    const userWorkoutCounts: Record<string, { count: number; name: string }> = {};
    workoutLogs?.forEach((log: any) => {
      if (!userWorkoutCounts[log.ownerId]) {
        const user = users?.find((u: any) => u._id === log.ownerId || u.id === log.ownerId);
        userWorkoutCounts[log.ownerId] = { count: 0, name: user?.name || 'Nieznany' };
      }
      userWorkoutCounts[log.ownerId].count++;
    });
    const topActiveUsers = Object.entries(userWorkoutCounts)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Top trainers by athlete count
    const trainers = users?.filter((u: any) => u.role === 'trainer') || [];
    const trainerAthleteCounts = trainers.map((trainer: any) => {
      const acceptedRequests = trainerRequests?.filter(
        (r: any) => r.trainerId === (trainer._id || trainer.id) && r.status === 'accepted'
      ).length || 0;
      return { id: trainer._id || trainer.id, name: trainer.name || 'Nieznany', count: acceptedRequests };
    }).sort((a: any, b: any) => b.count - a.count).slice(0, 5);

    return { topActiveUsers, topTrainers: trainerAthleteCounts };
  }, [users, workoutLogs, trainerRequests]);

  // Gamification stats
  const gamificationStats = useMemo(() => {
    if (!gamificationProfiles || gamificationProfiles.length === 0) {
      return { totalFitCoins: 0, avgLevel: 0 };
    }
    const totalFitCoins = gamificationProfiles.reduce((sum: number, p: any) => sum + (p.currentFitCoins || 0), 0);
    const avgLevel = gamificationProfiles.reduce((sum: number, p: any) => sum + (p.level || 1), 0) / gamificationProfiles.length;
    return { totalFitCoins, avgLevel: avgLevel.toFixed(1) };
  }, [gamificationProfiles]);

  const stats = [
    {
      title: 'Użytkownicy',
      value: users?.length || 0,
      description: 'Wszyscy użytkownicy w systemie',
      icon: Users,
      breakdown: {
        athletes: users?.filter((u: any) => u.role === 'athlete').length || 0,
        trainers: users?.filter((u: any) => u.role === 'trainer').length || 0,
        admins: users?.filter((u: any) => u.role === 'admin').length || 0,
      },
    },
    {
      title: 'Ćwiczenia',
      value: exercises?.length || 0,
      description: 'Dostępne ćwiczenia',
      icon: Dumbbell,
      breakdown: {
        system: exercises?.filter((e: any) => e.type === 'system').length || 0,
        custom: exercises?.filter((e: any) => e.type === 'custom').length || 0,
      },
    },
    {
      title: 'Artykuły',
      value: articles?.length || 0,
      description: 'Opublikowane artykuły',
      icon: FileText,
      breakdown: {
        published: articles?.filter((a: any) => a.status === 'published').length || 0,
        draft: articles?.filter((a: any) => a.status === 'draft').length || 0,
      },
    },
    {
      title: 'Treningi',
      value: workoutLogs?.length || 0,
      description: 'Wszystkie treningi',
      icon: Calendar,
      breakdown: {
        completed: workoutLogs?.filter((w: any) => w.status === 'completed').length || 0,
        inProgress: workoutLogs?.filter((w: any) => w.status === 'in-progress').length || 0,
      },
    },
    {
      title: 'Plany Treningowe',
      value: workoutPlans?.length || 0,
      description: 'Wszystkie plany',
      icon: ClipboardList,
      breakdown: {
        opublikowane: workoutPlans?.filter((p: any) => !p.isDraft).length || 0,
        drafty: workoutPlans?.filter((p: any) => p.isDraft).length || 0,
      },
    },
    {
      title: 'Posiłki',
      value: meals?.length || 0,
      description: 'Zarejestrowane posiłki',
      icon: Utensils,
      breakdown: {
        Breakfast: meals?.filter((m: any) => m.type === 'Breakfast').length || 0,
        Lunch: meals?.filter((m: any) => m.type === 'Lunch').length || 0,
        Dinner: meals?.filter((m: any) => m.type === 'Dinner').length || 0,
        Snack: meals?.filter((m: any) => m.type === 'Snack').length || 0,
      },
    },
    {
      title: 'Cele',
      value: goals?.length || 0,
      description: 'Cele użytkowników',
      icon: Target,
      breakdown: {
        aktywne: goals?.filter((g: any) => g.status === 'active').length || 0,
        ukończone: goals?.filter((g: any) => g.status === 'completed').length || 0,
        anulowane: goals?.filter((g: any) => g.status === 'cancelled').length || 0,
      },
    },
    {
      title: 'Gamifikacja',
      value: gamificationProfiles?.length || 0,
      description: 'Profile gamifikacyjne',
      icon: Coins,
      breakdown: {
        'FitCoins łącznie': gamificationStats.totalFitCoins,
        'Średni poziom': gamificationStats.avgLevel,
      },
    },
    {
      title: 'Pomiary Ciała',
      value: bodyMeasurements?.length || 0,
      description: 'Zarejestrowane pomiary',
      icon: Scale,
      breakdown: {
        'z fotozdjęciem': bodyMeasurements?.filter((m: any) => m.photoURLs && m.photoURLs.length > 0).length || 0,
        'udostępnione': bodyMeasurements?.filter((m: any) => m.sharedWithTrainer).length || 0,
      },
    },
    {
      title: 'Prośby o Trenera',
      value: trainerRequests?.length || 0,
      description: 'Wszystkie prośby',
      icon: UserPlus,
      breakdown: {
        oczekujące: trainerRequests?.filter((r: any) => r.status === 'pending').length || 0,
        zaakceptowane: trainerRequests?.filter((r: any) => r.status === 'accepted').length || 0,
        odrzucone: trainerRequests?.filter((r: any) => r.status === 'rejected').length || 0,
      },
    },
  ];

  return (
    <div className="container mx-auto p-4 md:p-8">
      <h1 className="mb-6 font-headline text-3xl font-bold">Panel Administratora</h1>

      {/* Main Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">{stat.description}</p>
                {stat.breakdown && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    {Object.entries(stat.breakdown).map(([key, value]) => (
                      <div key={key}>
                        {key}: {value as number}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Time-based Stats */}
      <div className="mt-8">
        <h2 className="mb-4 text-xl font-semibold flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Statystyki Czasowe
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Nowi Użytkownicy</CardTitle>
              <CardDescription>Rejestracje w czasie</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Dzisiaj</span>
                  <span className="font-bold">{timeStats.usersToday}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ostatnie 7 dni</span>
                  <span className="font-bold">{timeStats.usersWeek}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ostatnie 30 dni</span>
                  <span className="font-bold">{timeStats.usersMonth}</span>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Aktywność Treningowa</CardTitle>
              <CardDescription>Treningi w czasie</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Dzisiaj</span>
                  <span className="font-bold">{timeStats.workoutsToday}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ostatnie 7 dni</span>
                  <span className="font-bold">{timeStats.workoutsWeek}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ostatnie 30 dni</span>
                  <span className="font-bold">{timeStats.workoutsMonth}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Top Stats & Recent Activity */}
      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Top 5 Aktywnych Użytkowników
            </CardTitle>
            <CardDescription>Według liczby treningów</CardDescription>
          </CardHeader>
          <CardContent>
            {topStats.topActiveUsers.length > 0 ? (
              <div className="space-y-2">
                {topStats.topActiveUsers.map((user, index) => (
                  <div key={user.id} className="flex items-center justify-between border-b pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">#{index + 1}</span>
                      <span className="font-medium">{user.name}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">{user.count} treningów</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Brak danych</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-500" />
              Top 5 Trenerów
            </CardTitle>
            <CardDescription>Według liczby podopiecznych</CardDescription>
          </CardHeader>
          <CardContent>
            {topStats.topTrainers.length > 0 ? (
              <div className="space-y-2">
                {topStats.topTrainers.map((trainer: any, index: number) => (
                  <div key={trainer.id} className="flex items-center justify-between border-b pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">#{index + 1}</span>
                      <span className="font-medium">{trainer.name}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">{trainer.count} sportowców</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Brak danych</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ostatnia aktywność</CardTitle>
            <CardDescription>Najnowsze treningi w systemie</CardDescription>
          </CardHeader>
          <CardContent>
            {workoutLogs && workoutLogs.length > 0 ? (
              <div className="space-y-2">
                {workoutLogs.slice(0, 5).map((log: any) => (
                  <div key={log._id} className="flex items-center justify-between border-b pb-2">
                    <div>
                      <p className="font-medium">{log.workoutName}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(log.startTime).toLocaleDateString('pl-PL')}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">{log.status}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Brak treningów</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Szybkie akcje</CardTitle>
            <CardDescription>Najczęściej używane funkcje</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
              <a href="/admin/users" className="block rounded-lg border p-3 hover:bg-accent">
                <p className="font-medium">Zarządzaj użytkownikami</p>
                <p className="text-xs text-muted-foreground">Dodaj, edytuj lub usuń użytkowników</p>
              </a>
              <a href="/admin/exercises" className="block rounded-lg border p-3 hover:bg-accent">
                <p className="font-medium">Zarządzaj ćwiczeniami</p>
                <p className="text-xs text-muted-foreground">Moderuj ćwiczenia systemowe</p>
              </a>
              <a href="/admin/articles" className="block rounded-lg border p-3 hover:bg-accent">
                <p className="font-medium">Zarządzaj artykułami</p>
                <p className="text-xs text-muted-foreground">Publikuj i moderuj treści</p>
              </a>
              <a href="/admin/gyms" className="block rounded-lg border p-3 hover:bg-accent">
                <p className="font-medium">Zarządzaj siłowniami</p>
                <p className="text-xs text-muted-foreground">Dodaj lub usuń siłownie</p>
              </a>
              <a href="/admin/workout-plans" className="block rounded-lg border p-3 hover:bg-accent">
                <p className="font-medium">Plany treningowe</p>
                <p className="text-xs text-muted-foreground">Przeglądaj wszystkie plany</p>
              </a>
              <a href="/admin/workouts" className="block rounded-lg border p-3 hover:bg-accent">
                <p className="font-medium">Treningi</p>
                <p className="text-xs text-muted-foreground">Zarządzaj szablonami treningów</p>
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
