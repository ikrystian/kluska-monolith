'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { useCollection, useUser } from '@/lib/db-hooks';
import { apiFetch } from '@/lib/api-client';
import type { WorkoutLog, Exercise, RunningSession, StravaActivity } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Trash2, Footprints } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion, listItemMotion } from '@/components/motion';

interface RunHistoryItem {
  kind: 'run';
  id: string;
  date: Date;
  title: string;
  distanceKm: number;
  durationMin: number;
  avgPace: number;
  isClickable: boolean;
  href: string;
}

interface WorkoutHistoryItem {
  kind: 'workout';
  id: string;
  date: Date;
  log: WorkoutLog;
}

type HistoryItem = WorkoutHistoryItem | RunHistoryItem;

const formatRunPace = (pace: number) => {
  if (!pace || !Number.isFinite(pace)) return `0'00"/km`;
  const paceMinutes = Math.floor(pace);
  const paceSeconds = Math.round((pace - paceMinutes) * 60);
  return `${paceMinutes}'${paceSeconds.toString().padStart(2, '0')}"/km`;
};

export default function HistoryPage() {
  const { user } = useUser();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const MotionAccordionItem = motion(AccordionItem);

  // Fetch workout logs for the current user, sorted by endTime descending
  // Limit to 50 records to prevent loading too much data at once
  const { data: workoutLogs, isLoading, refetch } = useCollection<WorkoutLog>(
    user?.uid ? 'workoutLogs' : null,
    user?.uid ? { athleteId: user.uid } : undefined,
    { sort: { endTime: -1 }, limit: 50 }
  );

  // Running sessions tracked in-app, plus activities imported from Strava —
  // both show up in the same history feed as the strength workout logs.
  const { data: runningSessions, isLoading: runningLoading } = useCollection<RunningSession>(
    user?.uid ? 'runningSessions' : null,
    user?.uid ? { ownerId: user.uid } : undefined,
    { sort: { date: -1 }, limit: 50 }
  );
  const { data: stravaActivities, isLoading: stravaLoading } = useCollection<StravaActivity>(
    user?.uid ? 'stravaActivities' : null,
    user?.uid ? { ownerId: user.uid } : undefined,
    { sort: { date: -1 }, limit: 50 }
  );

  const combinedHistory = useMemo(() => {
    const items: HistoryItem[] = [];

    workoutLogs?.forEach((log) => {
      if (log.status === 'in-progress') return;
      items.push({ kind: 'workout', id: log.id, date: new Date(log.endTime), log });
    });

    runningSessions?.forEach((session) => {
      items.push({
        kind: 'run',
        id: session.id,
        date: new Date(session.date),
        title: session.programName || session.notes || 'Bieg',
        distanceKm: session.distance,
        durationMin: session.duration,
        avgPace: session.avgPace,
        isClickable: !!session.polyline,
        href: `/athlete/running/${session.id}`,
      });
    });

    stravaActivities?.forEach((activity) => {
      const distanceKm = activity.distance / 1000;
      const durationMin = activity.movingTime / 60;
      items.push({
        kind: 'run',
        id: activity.id,
        date: new Date(activity.date),
        title: activity.name || 'Bieg (Strava)',
        distanceKm,
        durationMin,
        avgPace: durationMin / distanceKm,
        isClickable: true,
        href: `/athlete/running/strava/${activity.stravaActivityId}`,
      });
    });

    return items.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [workoutLogs, runningSessions, stravaActivities]);

  const isHistoryLoading = isLoading || runningLoading || stravaLoading;

  const handleDelete = async (sessionId: string) => {
    if (!user) return;
    setDeletingId(sessionId);

    try {
      const response = await apiFetch(`/api/db/workoutLogs/${sessionId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Failed to delete workout log');
      }

      toast({
        title: "Trening usunięty",
        description: "Wybrana sesja treningowa została pomyślnie usunięta.",
        variant: "destructive"
      });
      refetch();
    } catch (error) {
      console.error('Error deleting workout log:', error);
      toast({
        title: "Błąd",
        description: "Nie udało się usunąć treningu.",
        variant: "destructive"
      });
    } finally {
      setDeletingId(null);
    }
  }


  return (
    <AlertDialog>
      <div className="container mx-auto p-4 md:p-8">
        <h1 className="mb-6 font-headline text-3xl font-bold">Historia Treningów</h1>
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Twój Dziennik</CardTitle>
            <CardDescription>Szczegółowy zapis wszystkich Twoich ukończonych treningów.</CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {isHistoryLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <AccordionItem value={`skeleton-${i}`} key={i} className="border-b">
                    <AccordionTrigger className="hover:no-underline">
                      <Skeleton className="h-10 w-full" />
                    </AccordionTrigger>
                  </AccordionItem>
                ))
              ) : (
                <AnimatePresence mode="popLayout" initial={false}>
                  {combinedHistory.map((item) => {
                    if (item.kind === 'run') {
                      return (
                        <MotionAccordionItem value={`run-${item.id}`} key={`run-${item.id}`} {...listItemMotion}>
                          <AccordionTrigger
                            className={cn('hover:no-underline', item.isClickable && 'cursor-pointer')}
                            onClick={() => item.isClickable && navigate(item.href)}
                          >
                            <div className="flex w-full items-center justify-between pr-4">
                              <div className="text-left">
                                <p className="flex items-center gap-1.5 font-semibold">
                                  <Footprints className="h-4 w-4 shrink-0 text-sky-500" />
                                  {item.title}
                                </p>
                                <p className="text-sm text-muted-foreground">{format(item.date, 'd MMMM yyyy', { locale: pl })}</p>
                              </div>
                              <div className="hidden text-right md:block">
                                <p className="font-semibold">{item.durationMin.toFixed(0)} min</p>
                                <p className="text-sm text-muted-foreground">Czas trwania</p>
                              </div>
                              <div className="hidden text-right lg:block">
                                <p className="font-semibold">{formatRunPace(item.avgPace)}</p>
                                <p className="text-sm text-muted-foreground">Tempo</p>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold">{item.distanceKm.toFixed(2)} km</p>
                                <p className="text-sm text-muted-foreground">Dystans</p>
                              </div>
                            </div>
                          </AccordionTrigger>
                        </MotionAccordionItem>
                      );
                    }

                    const log = item.log;
                    const totalVolume = log.exercises.reduce((acc, ex) => {
                      if (ex.exercise?.type !== 'weight') return acc;
                      const exVolume = ex.sets.reduce((setAcc, set) => setAcc + (set.reps || 0) * (set.weight ?? 0), 0);
                      return acc + exVolume;
                    }, 0);

                    return (
                      <MotionAccordionItem value={log.id} key={log.id} {...listItemMotion}>
                    <div className="flex items-center">
                      <AccordionTrigger className="hover:no-underline flex-grow" onClick={() => navigate(`/athlete/history/${log.id}`)}>
                        <div className="flex w-full items-center justify-between pr-4">
                          <div className="text-left">
                            <p className="font-semibold">{log.workoutName}</p>
                            <p className="text-sm text-muted-foreground">{format(new Date(log.endTime), 'd MMMM yyyy', { locale: pl })}</p>
                          </div>
                          <div className="hidden text-right md:block">
                            <p className="font-semibold">{log.duration} min</p>
                            <p className="text-sm text-muted-foreground">Czas trwania</p>
                          </div>
                          <div className="hidden text-right lg:block">
                            <p className="font-semibold">{log.exercises.length}</p>
                            <p className="text-sm text-muted-foreground">Ćwiczenia</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">{totalVolume.toLocaleString()} kg</p>
                            <p className="text-sm text-muted-foreground">Objętość</p>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="mr-2"
                          onClick={(e) => e.stopPropagation()}
                          disabled={deletingId === log.id}
                        >
                          {deletingId === log.id
                            ? <Loader2 className="h-4 w-4 animate-spin" />
                            : <Trash2 className="h-4 w-4 text-destructive" />
                          }
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Czy na pewno chcesz usunąć ten trening?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tej operacji nie można cofnąć. To spowoduje trwałe usunięcie treningu "{log.workoutName}" z dnia {format(log.endTime, 'd.MM.yyyy')}.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Anuluj</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(log.id)} className="bg-destructive hover:bg-destructive/90">
                            Usuń
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </div>
                  </MotionAccordionItem>
                );
              })}
                </AnimatePresence>
              )}
            </Accordion>
          </CardContent>
        </Card>
      </div>
    </AlertDialog>
  );
}
