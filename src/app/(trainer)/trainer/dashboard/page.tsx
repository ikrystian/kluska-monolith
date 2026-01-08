'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useUser, useCollection } from '@/lib/db-hooks';
import { Users, MessageSquare, Dumbbell, TrendingUp, Ruler, Check } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useMemo } from 'react';

interface Athlete {
  id: string;
  name: string;
  email: string;
}

interface Conversation {
  id: string;
  athleteName: string;
  lastMessage?: {
    text: string;
    createdAt: string;
  };
  unreadCount?: Record<string, number>;
}

interface BodyMeasurement {
  id: string;
  ownerId: string;
  date: string;
  weight: number;
  photoURLs?: string[];
  sharedWithTrainer: boolean;
}

interface WorkoutLog {
  id: string;
  athleteId: string;
  workoutName: string;
  endTime: string;
  duration: number;
}

interface WorkoutPlan {
  id: string;
  name: string;
  trainerId: string;
}

export default function TrainerDashboardPage() {
  const { user } = useUser();

  // Fetch trainer's athletes - only when user is available
  const { data: athletes, isLoading: athletesLoading } = useCollection<Athlete>(
    user?.uid ? 'users' : null,
    { trainerId: user?.uid, role: 'athlete' }
  );

  // Fetch conversations - only when user is available
  const { data: conversations, isLoading: conversationsLoading } = useCollection<Conversation>(
    user?.uid ? 'conversations' : null,
    { trainerId: user?.uid },
    { sort: { updatedAt: -1 }, limit: 5 }
  );

  // Fetch recent workout logs from all athletes - only when we have athletes
  const athleteIds = athletes?.map((a) => a.id) || [];
  const { data: recentWorkouts, isLoading: workoutsLoading } = useCollection<WorkoutLog>(
    user?.uid && athleteIds.length > 0 ? 'workoutLogs' : null,
    { athleteId: { $in: athleteIds } },
    { sort: { endTime: -1 }, limit: 10 }
  );

  // Fetch workout plans - only when user is available
  const { data: workoutPlans, isLoading: plansLoading } = useCollection<WorkoutPlan>(
    user?.uid ? 'workoutPlans' : null,
    { trainerId: user?.uid }
  );

  // Fetch recent Shared Measurements - NEW
  const { data: recentMeasurements, isLoading: measurementsLoading } = useCollection<BodyMeasurement>(
    user?.uid ? 'bodyMeasurements' : null,
    { sharedWithTrainer: true },
    { sort: { date: -1 }, limit: 5 }
  );

  // Calculate statistics
  const stats = useMemo(() => {
    const totalAthletes = athletes?.length || 0;
    const totalPlans = workoutPlans?.length || 0;
    const unreadMessages = conversations?.reduce((sum: number, conv: any) => {
      return sum + (conv.unreadCount?.[user?.uid || ''] || 0);
    }, 0) || 0;
    const recentWorkoutsCount = recentWorkouts?.filter((w: any) => {
      const workoutDate = new Date(w.endTime);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return workoutDate >= weekAgo;
    }).length || 0;

    return {
      totalAthletes,
      totalPlans,
      unreadMessages,
      recentWorkoutsCount,
    };
  }, [athletes, workoutPlans, conversations, recentWorkouts, user]);

  const isLoading = athletesLoading || conversationsLoading || workoutsLoading || plansLoading || measurementsLoading;

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 md:p-8">
        <Skeleton className="mb-6 h-10 w-64" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <h1 className="mb-6 font-headline text-3xl font-bold">Panel Trenera</h1>

      {/* Statistics Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sportowcy</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAthletes}</div>
            <p className="text-xs text-muted-foreground">
              Przypisanych sportowców
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nieprzeczytane</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.unreadMessages}</div>
            <p className="text-xs text-muted-foreground">
              Nowych wiadomości
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Plany Treningowe</CardTitle>
            <Dumbbell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPlans}</div>
            <p className="text-xs text-muted-foreground">
              Utworzonych planów
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aktywność (7 dni)</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.recentWorkoutsCount}</div>
            <p className="text-xs text-muted-foreground">
              Treningów wykonanych
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Activities */}
        <Card>
          <CardHeader>
            <CardTitle>Ostatnie Aktywności</CardTitle>
            <CardDescription>Najnowsze treningi Twoich sportowców</CardDescription>
          </CardHeader>
          <CardContent>
            {recentWorkouts && recentWorkouts.length > 0 ? (
              <div className="space-y-4">
                {recentWorkouts.slice(0, 5).map((workout: any) => {
                  const athlete = athletes?.find((a: any) => a.id === workout.athleteId);
                  return (
                    <div key={workout.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>
                            {athlete?.name?.charAt(0) || 'A'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{athlete?.name || 'Nieznany'}</p>
                          <p className="text-xs text-muted-foreground">{workout.workoutName}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">
                          {new Date(workout.endTime).toLocaleDateString('pl-PL')}
                        </p>
                        <Badge variant="secondary" className="text-xs">
                          {Math.round(workout.duration / 60)} min
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                Brak ostatnich aktywności
              </p>
            )}
          </CardContent>
        </Card>

        {/* Unread Messages */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Wiadomości</CardTitle>
                <CardDescription>Ostatnie konwersacje</CardDescription>
              </div>
              <Button asChild size="sm" variant="outline">
                <Link href="/trainer/chat">Zobacz wszystkie</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {conversations && conversations.length > 0 ? (
              <div className="space-y-4">
                {conversations.map((conv: any) => {
                  const unreadCount = conv.unreadCount?.[user?.uid || ''] || 0;
                  return (
                    <Link
                      key={conv.id}
                      href={`/trainer/chat?conversationId=${conv.id}`}
                      className="flex items-center justify-between border-b pb-3 last:border-0 hover:bg-accent/50 rounded p-2 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>
                            {conv.athleteName?.charAt(0) || 'A'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{conv.athleteName}</p>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {conv.lastMessage?.text || 'Brak wiadomości'}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {unreadCount > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {unreadCount}
                          </Badge>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {conv.lastMessage?.createdAt
                            ? new Date(conv.lastMessage.createdAt).toLocaleDateString('pl-PL')
                            : ''}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                Brak konwersacji
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Ostatnie Pomiary</CardTitle>
            <CardDescription>Najnowsze pomiary udostępnione przez sportowców</CardDescription>
          </CardHeader>
          <CardContent>
            {recentMeasurements && recentMeasurements.length > 0 ? (
              <div className="space-y-4">
                {recentMeasurements.map((measurement: any) => {
                  const athlete = athletes?.find((a: any) => a.id === measurement.ownerId);
                  return (
                    <div key={measurement.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                      <div className="flex items-center gap-3">
                        <div className="flex bg-muted h-8 w-8 items-center justify-center rounded-full">
                          <Ruler className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{athlete?.name || 'Nieznany'}</p>
                          <p className="text-xs text-muted-foreground">Waga: {measurement.weight} kg</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {measurement.photoURLs && measurement.photoURLs.length > 0 && (
                          <Badge variant="outline" className="text-xs gap-1">
                            <Check className="h-3 w-3" /> Zdjęcia
                          </Badge>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {new Date(measurement.date).toLocaleDateString('pl-PL')}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                Brak udostępnionych pomiarów
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

