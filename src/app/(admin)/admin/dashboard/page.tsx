'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { format, formatDistanceToNow } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  AlertCircle,
  ArrowUpRight,
  BookMarked,
  Building2,
  ChefHat,
  ClipboardCheck,
  ClipboardList,
  Coins,
  Database,
  Dumbbell,
  FileText,
  Footprints,
  ListChecks,
  MailWarning,
  Megaphone,
  NotebookPen,
  RefreshCw,
  Route,
  Salad,
  UserPlus,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { adminFetch } from '@/lib/admin/client';
import { OPTION_LABELS, getAdminResource } from '@/lib/admin/resources';

interface AdminStats {
  generatedAt: string;
  users: { total: number; athletes: number; trainers: number; admins: number; guests: number; unverified: number; today: number; week: number; month: number };
  activity: { workoutsToday: number; workoutsWeek: number; workoutsMonth: number; workoutsInProgress: number; runsWeek: number; runsMonth: number; diaryWeek: number; postsWeek: number };
  content: { exercises: number; publicExercises: number; articlesPublished: number; articlesDraft: number; gyms: number; workouts: number; workoutPlans: number; savedMeals: number; dietPlans: number; runningPrograms: number };
  attention: { pendingRequests: number; checkInsToReview: number; articlesDraft: number; unverified: number };
  gamification: { fitCoins: number; points: number; avgLevel: number; profiles: number };
  marketing: { adsTotal: number; adsLive: number; impressionsWeek: number; clicksWeek: number; promosActive: number };
  topAthletes: { id: string; name: string; count: number }[];
  recentUsers: { id: string; name: string; email: string; role: string; isGuest: boolean; createdAt: string | null }[];
  recentChanges: { id: string; summary: string; action: string; resource: string; recordId: string; createdAt: string }[];
  series: { day: string; users: number; workouts: number; runs: number }[];
}

const number = (value: number) => value.toLocaleString('pl-PL');
const ago = (iso: string | null) => (iso ? formatDistanceToNow(new Date(iso), { addSuffix: true, locale: pl }) : '');

function Kpi({ icon: Icon, label, value, hint, href }: { icon: LucideIcon; label: string; value: string; hint?: string; href: string }) {
  return (
    <Link href={href} className="group rounded-lg border bg-card p-4 transition-colors hover:border-primary/50">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span className="flex items-center gap-2">
          <Icon className="h-4 w-4" /> {label}
        </span>
        <ArrowUpRight className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
      <div className="mt-2 text-3xl font-bold tabular-nums">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </Link>
  );
}

export default function AdminDashboardPage() {
  const { data: stats, error, isLoading, isValidating, mutate } = useSWR<AdminStats>('/api/admin/stats', adminFetch, {
    refreshInterval: 60_000,
  });

  if (error) {
    return (
      <div className="container mx-auto p-4 md:p-8">
        <Card>
          <CardContent className="flex flex-col items-start gap-3 p-6">
            <div className="flex items-center gap-2 font-medium text-destructive">
              <AlertCircle className="h-5 w-5" /> Nie udało się wczytać statystyk
            </div>
            <p className="text-sm text-muted-foreground">{error.message}</p>
            <Button variant="outline" onClick={() => void mutate()}>
              Spróbuj ponownie
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading || !stats) {
    return (
      <div className="container mx-auto space-y-6 p-4 md:p-8">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-72" />
      </div>
    );
  }

  const attention = [
    { count: stats.attention.pendingRequests, label: 'próśb do trenerów czeka na decyzję', href: '/admin/data/trainerRequests?f.status=pending', icon: UserPlus },
    { count: stats.attention.checkInsToReview, label: 'raportów tygodniowych czeka na sprawdzenie', href: '/admin/data/weeklyCheckIns?f.status=submitted', icon: ClipboardCheck },
    { count: stats.attention.articlesDraft, label: 'artykułów w szkicach', href: '/admin/data/articles?f.status=draft', icon: FileText },
    { count: stats.attention.unverified, label: 'kont bez potwierdzonego e-maila', href: '/admin/data/users?f.emailVerified=false&f.isGuest=false', icon: MailWarning },
  ].filter((item) => item.count > 0);

  const content: { label: string; value: number; hint?: string; href: string; icon: LucideIcon }[] = [
    { label: 'Ćwiczenia', value: stats.content.exercises, hint: `${number(stats.content.publicExercises)} w bibliotece wspólnej`, href: '/admin/exercises', icon: Dumbbell },
    { label: 'Treningi', value: stats.content.workouts, href: '/admin/workouts', icon: ListChecks },
    { label: 'Plany treningowe', value: stats.content.workoutPlans, href: '/admin/workout-plans', icon: ClipboardList },
    { label: 'Artykuły', value: stats.content.articlesPublished, hint: `+ ${stats.content.articlesDraft} szkiców`, href: '/admin/articles', icon: BookMarked },
    { label: 'Siłownie', value: stats.content.gyms, href: '/admin/gyms', icon: Building2 },
    { label: 'Programy biegowe', value: stats.content.runningPrograms, href: '/admin/running-programs', icon: Footprints },
    { label: 'Gotowe posiłki', value: stats.content.savedMeals, href: '/admin/meals', icon: ChefHat },
    { label: 'Plany dietetyczne', value: stats.content.dietPlans, href: '/admin/diet-plans', icon: Salad },
  ];

  const chartData = stats.series.map((day) => ({
    ...day,
    label: format(new Date(`${day.day}T12:00:00`), 'd MMM', { locale: pl }),
  }));

  return (
    <div className="container mx-auto space-y-6 p-4 md:p-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-headline text-3xl font-bold">Panel administratora</h1>
          <p className="text-muted-foreground">Stan systemu na {format(new Date(stats.generatedAt), 'd MMMM yyyy, HH:mm', { locale: pl })}.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void mutate()} disabled={isValidating}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isValidating ? 'animate-spin' : ''}`} /> Odśwież
          </Button>
          <Button asChild>
            <Link href="/admin/data">
              <Database className="mr-2 h-4 w-4" /> Wszystkie dane
            </Link>
          </Button>
        </div>
      </div>

      {attention.length > 0 && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertCircle className="h-4 w-4 text-amber-600" /> Wymaga uwagi
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            {attention.map((item) => (
              <Link key={item.href} href={item.href} className="flex items-center gap-3 rounded-md border bg-card p-3 text-sm transition-colors hover:border-primary/50">
                <item.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="font-bold tabular-nums">{number(item.count)}</span>
                <span className="min-w-0 flex-1 truncate text-muted-foreground">{item.label}</span>
                <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          icon={Users}
          label="Użytkownicy"
          value={number(stats.users.total)}
          hint={`+${stats.users.today} dziś · +${stats.users.week} w 7 dni · ${number(stats.users.guests)} gości`}
          href="/admin/data/users"
        />
        <Kpi
          icon={Dumbbell}
          label="Treningi (7 dni)"
          value={number(stats.activity.workoutsWeek)}
          hint={`${stats.activity.workoutsToday} dziś · ${stats.activity.workoutsInProgress} w trakcie`}
          href="/admin/data/workoutLogs"
        />
        <Kpi
          icon={Route}
          label="Biegi (7 dni)"
          value={number(stats.activity.runsWeek)}
          hint={`${number(stats.activity.runsMonth)} w 30 dni`}
          href="/admin/data/runningSessions"
        />
        <Kpi
          icon={NotebookPen}
          label="Wpisy jedzenia (7 dni)"
          value={number(stats.activity.diaryWeek)}
          hint={`${stats.activity.postsWeek} nowych postów w społeczności`}
          href="/admin/data/foodDiaryEntries"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Aktywność — ostatnie 30 dni</CardTitle>
            <CardDescription>Nowe konta, treningi i biegi dzień po dniu.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} minTickGap={24} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tickLine={false} axisLine={false} fontSize={12} allowDecimals={false} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 8,
                      color: 'hsl(var(--popover-foreground))',
                      fontSize: 12,
                    }}
                  />
                  <Area type="monotone" dataKey="workouts" name="Treningi" stroke="hsl(var(--chart-1))" fill="hsl(var(--chart-1))" fillOpacity={0.15} strokeWidth={2} />
                  <Area type="monotone" dataKey="runs" name="Biegi" stroke="hsl(var(--chart-2))" fill="hsl(var(--chart-2))" fillOpacity={0.15} strokeWidth={2} />
                  <Area type="monotone" dataKey="users" name="Nowe konta" stroke="hsl(var(--chart-3))" fill="hsl(var(--chart-3))" fillOpacity={0.15} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Konta według roli</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {[
                ['Sportowcy', stats.users.athletes, 'athlete'],
                ['Trenerzy', stats.users.trainers, 'trainer'],
                ['Administratorzy', stats.users.admins, 'admin'],
              ].map(([label, count, role]) => (
                <Link key={role} href={`/admin/data/users?f.role=${role}`} className="flex items-center justify-between rounded px-1 py-0.5 hover:bg-muted">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-semibold tabular-nums">{number(count as number)}</span>
                </Link>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Megaphone className="h-4 w-4 text-muted-foreground" /> Marketing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Link href="/admin/ads" className="flex items-center justify-between rounded px-1 py-0.5 hover:bg-muted">
                <span className="text-muted-foreground">Reklamy wyświetlane</span>
                <span className="font-semibold tabular-nums">{stats.marketing.adsLive} z {stats.marketing.adsTotal}</span>
              </Link>
              <Link href="/admin/ads" className="flex items-center justify-between rounded px-1 py-0.5 hover:bg-muted">
                <span className="text-muted-foreground">Wyświetlenia / kliknięcia (7 dni)</span>
                <span className="font-semibold tabular-nums">{number(stats.marketing.impressionsWeek)} / {number(stats.marketing.clicksWeek)}</span>
              </Link>
              <Link href="/admin/home-content" className="flex items-center justify-between rounded px-1 py-0.5 hover:bg-muted">
                <span className="text-muted-foreground">Treści ekranu głównego</span>
                <span className="font-semibold tabular-nums">{stats.marketing.promosActive}</span>
              </Link>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Coins className="h-4 w-4 text-muted-foreground" /> Grywalizacja
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Link href="/admin/data/gamificationProfiles" className="flex items-center justify-between rounded px-1 py-0.5 hover:bg-muted">
                <span className="text-muted-foreground">FitCoins w obiegu</span>
                <span className="font-semibold tabular-nums">{number(stats.gamification.fitCoins)}</span>
              </Link>
              <div className="flex items-center justify-between px-1 py-0.5">
                <span className="text-muted-foreground">Średni poziom</span>
                <span className="font-semibold tabular-nums">{stats.gamification.avgLevel.toLocaleString('pl-PL')}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Treści w systemie</CardTitle>
          <CardDescription>Kliknij, aby przejść do edytora.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {content.map((item) => (
            <Link key={item.href} href={item.href} className="flex items-center gap-3 rounded-md border p-3 transition-colors hover:border-primary/50 hover:bg-muted/40">
              <item.icon className="h-5 w-5 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm text-muted-foreground">{item.label}</div>
                {item.hint && <div className="truncate text-xs text-muted-foreground/80">{item.hint}</div>}
              </div>
              <span className="text-xl font-bold tabular-nums">{number(item.value)}</span>
            </Link>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Najaktywniejsi (30 dni)</CardTitle>
            <CardDescription>Ukończone treningi.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {stats.topAthletes.length === 0 && <p className="text-sm text-muted-foreground">Brak ukończonych treningów w tym okresie.</p>}
            {stats.topAthletes.map((athlete, index) => (
              <Link key={athlete.id} href={`/admin/data/workoutLogs?f.athleteId=${athlete.id}`} className="flex items-center gap-3 rounded px-1 py-1 text-sm hover:bg-muted">
                <span className="w-5 text-center font-semibold tabular-nums text-muted-foreground">{index + 1}</span>
                <span className="min-w-0 flex-1 truncate">{athlete.name}</span>
                <Badge variant="secondary">{athlete.count}</Badge>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nowe konta</CardTitle>
            <CardDescription>+{stats.users.month} w ostatnich 30 dniach.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {stats.recentUsers.map((user) => (
              <Link key={user.id} href={`/admin/data/users?record=${user.id}`} className="flex items-center gap-3 rounded px-1 py-1 text-sm hover:bg-muted">
                <div className="min-w-0 flex-1">
                  <div className="truncate">{user.name}</div>
                  <div className="truncate text-xs text-muted-foreground">{user.isGuest ? 'Konto gościa' : user.email}</div>
                </div>
                <div className="shrink-0 text-right">
                  <Badge variant="outline">{OPTION_LABELS[user.role] ?? user.role}</Badge>
                  <div className="text-xs text-muted-foreground">{ago(user.createdAt)}</div>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ostatnie zmiany w panelu</CardTitle>
            <CardDescription>
              <Link href="/admin/data/auditLogs" className="underline underline-offset-2">Pełny dziennik zmian</Link>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {stats.recentChanges.length === 0 && <p className="text-sm text-muted-foreground">Nie zapisano jeszcze żadnej zmiany.</p>}
            {stats.recentChanges.map((change) => {
              const target = getAdminResource(change.resource);
              const body = (
                <>
                  <div className="line-clamp-2">{change.summary}</div>
                  <div className="text-xs text-muted-foreground">{ago(change.createdAt)}</div>
                </>
              );
              return target && change.action !== 'delete' ? (
                <Link key={change.id} href={`/admin/data/${change.resource}?record=${change.recordId}`} className="block rounded px-1 py-1 text-sm hover:bg-muted">
                  {body}
                </Link>
              ) : (
                <div key={change.id} className="px-1 py-1 text-sm">
                  {body}
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
