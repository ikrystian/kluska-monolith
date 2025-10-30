'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useUser, useCollection } from '@/lib/db-hooks';
import { Users, MessageSquare, Dumbbell, TrendingUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useMemo } from 'react';

export default function TrainerDashboardPage() {
  const { user } = useUser();

  // Fetch trainer's athletes
  const { data: athletes, isLoading: athletesLoading } = useCollection(
    user ? 'users' : null,
    { trainerId: user?.uid, role: 'athlete' }
  );

  // Fetch conversations
  const { data: conversations, isLoading: conversationsLoading } = useCollection(
    user ? 'conversations' : null,
    { trainerId: user?.uid },
    { sort: { updatedAt: -1 }, limit: 5 }
  );

  // Fetch recent workout logs from all athletes
  const { data: recentWorkouts, isLoading: workoutsLoading } = useCollection(
    user && athletes ? 'workoutLogs' : null,
    athletes ? { athleteId: { $in: athletes.map((a: any) => a.id) } } : {},
    { sort: { endTime: -1 }, limit: 10 }
  );

  // Fetch workout plans
  const { data: workoutPlans, isLoading: plansLoading } = useCollection(
    user ? 'workoutPlans' : null,
    { trainerId: user?.uid }
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

  const isLoading = athletesLoading || conversationsLoading || workoutsLoading || plansLoading;

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
    </div>
  );
}

