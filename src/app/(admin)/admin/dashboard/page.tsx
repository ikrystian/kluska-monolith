'use client';

import { useCollection } from '@/lib/db-hooks';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Users, Dumbbell, FileText, Calendar } from 'lucide-react';

export default function AdminDashboardPage() {
  const { data: users } = useCollection('users');
  const { data: exercises } = useCollection('exercises');
  const { data: articles } = useCollection('articles');
  const { data: workoutLogs } = useCollection('workoutLogs');

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
  ];

  return (
    <div className="container mx-auto p-4 md:p-8">
      <h1 className="mb-6 font-headline text-3xl font-bold">Panel Administratora</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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

      <div className="mt-8 grid gap-4 md:grid-cols-2">
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

        <Card>
          <CardHeader>
            <CardTitle>Szybkie akcje</CardTitle>
            <CardDescription>Najczęściej używane funkcje</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
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
              <a href="/admin/muscle-groups" className="block rounded-lg border p-3 hover:bg-accent">
                <p className="font-medium">Grupy mięśniowe</p>
                <p className="text-xs text-muted-foreground">Konfiguracja grup mięśniowych</p>
              </a>
              <a href="/admin/workout-plans" className="block rounded-lg border p-3 hover:bg-accent">
                <p className="font-medium">Plany treningowe</p>
                <p className="text-xs text-muted-foreground">Przeglądaj wszystkie plany</p>
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
