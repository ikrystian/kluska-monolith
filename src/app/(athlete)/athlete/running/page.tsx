'use client';

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Loader2, Footprints, TrendingUp, Route, Timer, Activity, RefreshCw, Heart, Mountain } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useCollection, useCreateDoc, useUser, useDoc } from '@/lib/db-hooks';
import { ActivityDetailModal } from '@/components/running/ActivityDetailModal';
import type { RunningSession, StravaActivity, UserProfile } from '@/lib/types';

const runSchema = z.object({
  distance: z.coerce.number().positive('Dystans musi być liczbą dodatnią.'),
  duration: z.coerce.number().positive('Czas trwania musi być liczbą dodatnią.'),
  notes: z.string().optional(),
});

type RunFormValues = z.infer<typeof runSchema>;

const StatCard = ({ title, value, icon: Icon, isLoading }: { title: string; value: string; icon: React.ElementType; isLoading: boolean }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      {isLoading ? <Skeleton className="h-8 w-24" /> : <div className="text-2xl font-bold">{value}</div>}
    </CardContent>
  </Card>
);

interface CombinedActivity {
  id: string;
  date: Date;
  distance: number; // km for manual, meters for Strava
  duration: number;// min for manual, seconds for Strava
  avgPace: number; // min/km
  notes?: string;
  source: 'manual' | 'strava';
  // Strava-specific fields
  stravaActivityId?: string;
  name?: string;
  totalElevationGain?: number;
  averageHeartrate?: number;
  maxHeartrate?: number;
  kudosCount?: number;
}

export default function RunningPage() {
  const { user } = useUser();
  const { toast } = useToast();
  const { createDoc, isLoading: isCreating } = useCreateDoc();
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);

  const { data: userProfile } = useDoc<UserProfile>('users', user?.uid || null);
  const isStravaConnected = !!userProfile?.stravaAccessToken;

  const { data: runningSessions, isLoading: isLoadingManual, refetch: refetchManual } = useCollection<RunningSession>(
    user ? 'runningSessions' : null,
    { ownerId: user?.uid },
    { sort: { date: -1 } }
  );

  const { data: stravaActivities, isLoading: isLoadingStrava, refetch: refetchStrava } = useCollection<StravaActivity>(
    user ? 'stravaActivities' : null,
    { ownerId: user?.uid },
    { sort: { date: -1 } }
  );

  const isLoading = isLoadingManual || isLoadingStrava;

  // Combine manual and Strava sessions
  const combinedActivities = useMemo(() => {
    const activities: CombinedActivity[] = [];

    // Add manual sessions
    if (runningSessions) {
      runningSessions.forEach((session) => {
        activities.push({
          id: session.id,
          date: new Date(session.date),
          distance: session.distance,
          duration: session.duration,
          avgPace: session.avgPace,
          notes: session.notes,
          source: 'manual',
        });
      });
    }

    // Add Strava activities
    if (stravaActivities) {
      stravaActivities.forEach((activity) => {
        const distanceKm = activity.distance / 1000;
        const durationMin = activity.movingTime / 60;
        const avgPace = durationMin / distanceKm;

        activities.push({
          id: activity.id,
          stravaActivityId: activity.stravaActivityId,
          date: new Date(activity.date),
          distance: distanceKm,
          duration: durationMin,
          avgPace: avgPace,
          name: activity.name,
          totalElevationGain: activity.totalElevationGain,
          averageHeartrate: activity.averageHeartrate,
          maxHeartrate: activity.maxHeartrate,
          kudosCount: activity.kudosCount,
          source: 'strava',
        });
      });
    }

    // Sort by date descending
    return activities.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [runningSessions, stravaActivities]);

  const stats = useMemo(() => {
    if (!combinedActivities.length) {
      return { totalRuns: 0, totalDistance: 0, totalDuration: 0, overallAvgPace: 0 };
    }
    const totalRuns = combinedActivities.length;
    const totalDistance = combinedActivities.reduce((acc, activity) => acc + activity.distance, 0);
    const totalDuration = combinedActivities.reduce((acc, activity) => acc + activity.duration, 0);
    const overallAvgPace = totalDistance > 0 ? totalDuration / totalDistance : 0;

    return { totalRuns, totalDistance, totalDuration, overallAvgPace };
  }, [combinedActivities]);

  const formatPace = (pace: number) => {
    if (pace === 0) return `0'00"/km`;
    const paceMinutes = Math.floor(pace);
    const paceSeconds = Math.round((pace - paceMinutes) * 60);
    return `${paceMinutes}'${paceSeconds.toString().padStart(2, '0')}"/km`;
  };

  const form = useForm<RunFormValues>({
    resolver: zodResolver(runSchema),
    defaultValues: {
      distance: undefined,
      duration: undefined,
      notes: '',
    },
  });

  const onSubmit = async (data: RunFormValues) => {
    if (!user) return;

    const avgPace = data.duration / data.distance;

    const newRun = {
      date: new Date().toISOString(),
      distance: data.distance,
      duration: data.duration,
      avgPace: avgPace,
      notes: data.notes,
      ownerId: user.uid,
    };

    try {
      await createDoc('runningSessions', newRun);
      toast({
        title: 'Bieg Zapisany!',
        description: 'Twoja sesja biegowa została dodana do historii.',
      });
      form.reset();
      setDialogOpen(false);
      refetchManual();
    } catch (error) {
      console.error("Error saving run:", error);
      toast({ title: "Błąd", description: "Nie udało się zapisać biegu.", variant: "destructive" });
    }
  };

  const handleSyncStrava = async () => {
    setIsSyncing(true);
    try {
      const response = await fetch('/api/strava/sync', {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to sync');
      }

      const data = await response.json();
      toast({
        title: 'Sukces!',
        description: `Zsynchronizowano ${data.syncedCount} aktywności ze Strava.`,
      });
      refetchStrava();
    } catch (error) {
      toast({
        title: 'Błąd!',
        description: error instanceof Error ? error.message : 'Nie udało się zsynchronizować ze Strava.',
        variant: 'destructive',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h1 className="font-headline text-3xl font-bold">Dziennik Biegowy</h1>
        <div className="flex gap-2">
          {isStravaConnected && (
            <Button variant="outline" onClick={handleSyncStrava} disabled={isSyncing}>
              {isSyncing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Synchronizuj Strava
            </Button>
          )}
          <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Dodaj Bieg
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-headline">Zarejestruj Nowy Bieg</DialogTitle>
                <DialogDescription>Wprowadź szczegóły swojego ostatniego treningu biegowego.</DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="distance"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Dystans (km)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" placeholder="np. 5.2" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="duration"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Czas (min)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.1" placeholder="np. 28.5" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notatki (opcjonalnie)</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Jak się czułeś/aś? Jaka była pogoda?" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button type="button" variant="secondary" disabled={form.formState.isSubmitting}>Anuluj</Button>
                    </DialogClose>
                    <Button type="submit" disabled={isCreating}>
                      {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Zapisz Bieg
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Wszystkie biegi" value={stats.totalRuns.toString()} icon={Footprints} isLoading={isLoading} />
        <StatCard title="Łączny dystans" value={`${stats.totalDistance.toFixed(2)} km`} icon={Route} isLoading={isLoading} />
        <StatCard title="Całkowity czas" value={`${Math.round(stats.totalDuration)} min`} icon={Timer} isLoading={isLoading} />
        <StatCard title="Średnie tempo" value={formatPace(stats.overallAvgPace)} icon={TrendingUp} isLoading={isLoading} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historia Biegów</CardTitle>
          <CardDescription>Zapis wszystkich Twoich sesji biegowych.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Nazwa/Notatki</TableHead>
                <TableHead>Dystans</TableHead>
                <TableHead>Czas</TableHead>
                <TableHead>Średnie Tempo</TableHead>
                <TableHead>Szczegóły</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                  </TableRow>
                ))
              ) : combinedActivities && combinedActivities.length > 0 ? (
                combinedActivities.map((activity) => {
                  const isClickable = activity.source === 'strava';
                  return (
                    <TableRow
                      key={activity.id}
                      className={isClickable ? 'cursor-pointer hover:bg-muted/50' : ''}
                      onClick={() => isClickable && activity.stravaActivityId && setSelectedActivityId(activity.stravaActivityId)}
                    >
                      <TableCell className="font-medium">{format(activity.date, 'd MMM yyyy, HH:mm', { locale: pl })}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {activity.source === 'strava' && (
                            <Badge variant="secondary" className="bg-[#FC4C02]/10 text-[#FC4C02] hover:bg-[#FC4C02]/20">
                              <Activity className="mr-1 h-3 w-3" />
                              Strava
                            </Badge>
                          )}
                          <span className="text-sm">{activity.name || activity.notes || '-'}</span>
                        </div>
                      </TableCell>
                      <TableCell>{activity.distance.toFixed(2)} km</TableCell>
                      <TableCell>{activity.duration.toFixed(1)} min</TableCell>
                      <TableCell>{formatPace(activity.avgPace)}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                          {activity.totalElevationGain !== undefined && (
                            <span className="flex items-center gap-1">
                              <Mountain className="h-3 w-3" />
                              {Math.round(activity.totalElevationGain)}m
                            </span>
                          )}
                          {activity.averageHeartrate !== undefined && (
                            <span className="flex items-center gap-1">
                              <Heart className="h-3 w-3 text-red-500" />
                              {Math.round(activity.averageHeartrate)} bpm
                            </span>
                          )}
                          {activity.kudosCount !== undefined && activity.kudosCount > 0 && (
                            <span>❤️ {activity.kudosCount}</span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                      <Footprints className="h-8 w-8" />
                      <span>Nie zarejestrowano jeszcze żadnych biegów.</span>
                      {isStravaConnected && (
                        <Button variant="link" onClick={handleSyncStrava} className="text-[#FC4C02]">
                          Zsynchronizuj aktywności ze Strava
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ActivityDetailModal
        activityId={selectedActivityId}
        onClose={() => setSelectedActivityId(null)}
      />
    </div>
  );
}
