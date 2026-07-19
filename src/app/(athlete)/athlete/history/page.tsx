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
import type { WorkoutLog, Exercise } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Trash2, UserPlus } from 'lucide-react';

export default function HistoryPage() {
  const { user } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [guestLogs, setGuestLogs] = useState<WorkoutLog[]>([]);

  useEffect(() => {
    if (!user) {
      try {
        const stored = localStorage.getItem('guest_workout_logs');
        if (stored) {
          setGuestLogs(JSON.parse(stored));
        }
      } catch (err) {
        console.error('Error loading guest logs:', err);
      }
    }
  }, [user]);

  // Fetch workout logs for the current user, sorted by endTime descending
  // Limit to 50 records to prevent loading too much data at once
  const { data: workoutLogs, isLoading, refetch } = useCollection<WorkoutLog>(
    user?.uid ? 'workoutLogs' : null,
    user?.uid ? { athleteId: user.uid } : undefined,
    { sort: { endTime: -1 }, limit: 50 }
  );

  const logsToDisplay = user ? workoutLogs : guestLogs;

  const handleDelete = async (sessionId: string) => {
    if (!user) return;
    setDeletingId(sessionId);

    try {
      const response = await fetch(`/api/db/workoutLogs/${sessionId}`, {
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

        {!user && (
          <Card className="mb-6 border-amber-500/40 bg-amber-500/10 dark:bg-amber-500/15">
            <CardContent className="p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
                  <UserPlus className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-headline font-semibold text-lg text-amber-950 dark:text-amber-100">
                    Konto gościa
                  </h3>
                  <p className="text-sm text-amber-900/80 dark:text-amber-200/80">
                    Treningi w trybie gościa są przechowywane na tym urządzeniu. Załóż konto, aby trwale je zapisać.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                <Button asChild variant="default" className="flex-1 sm:flex-initial font-bold">
                  <Link href="/register">Załóż konto</Link>
                </Button>
                <Button asChild variant="outline" className="flex-1 sm:flex-initial">
                  <Link href="/login">Zaloguj się</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Twój Dziennik</CardTitle>
            <CardDescription>Szczegółowy zapis wszystkich Twoich ukończonych treningów.</CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {user && isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <AccordionItem value={`skeleton-${i}`} key={i} className="border-b">
                    <AccordionTrigger className="hover:no-underline">
                      <Skeleton className="h-10 w-full" />
                    </AccordionTrigger>
                  </AccordionItem>
                ))
              ) : logsToDisplay && logsToDisplay.length > 0 ? (
                logsToDisplay.map((log) => {
                  if (log.status === 'in-progress') return null;

                const totalVolume = log.exercises.reduce((acc, ex) => {
                  if (ex.exercise?.type !== 'weight') return acc;
                  const exVolume = ex.sets.reduce((setAcc, set) => setAcc + (set.reps || 0) * (set.weight ?? 0), 0);
                  return acc + exVolume;
                }, 0);

                return (
                  <AccordionItem value={log.id} key={log.id}>
                    <div className="flex items-center">
                      <AccordionTrigger className="hover:no-underline flex-grow" onClick={() => router.push(`/athlete/history/${log.id}`)}>
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
                  </AccordionItem>
                );
              })
              ) : (
                <div className="py-12 text-center text-muted-foreground">
                  Brak ukończonych treningów w historii.
                </div>
              )}
            </Accordion>
          </CardContent>
        </Card>
      </div>
    </AlertDialog>
  );
}
