import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

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
} from '@/components/ui/alert-dialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useCollection } from '@/hooks/useCollection';
import { useDeleteDoc } from '@/hooks/useMutation';
import { useAuth } from '@/contexts/AuthContext';
import type { WorkoutLog } from '@/types';

export default function HistoryPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Fetch workout logs for the current user, sorted by endTime descending
  const { data: workoutLogs, isLoading, refetch } = useCollection<WorkoutLog>(
    user?.id ? 'workoutLogs' : null,
    {
      query: user?.id ? { athleteId: user.id } : undefined,
      sort: { endTime: -1 },
      limit: 50,
    }
  );

  const deleteWorkoutLog = useDeleteDoc('workoutLogs');

  const handleDelete = async (sessionId: string) => {
    if (!user) return;
    setDeletingId(sessionId);

    try {
      await deleteWorkoutLog.mutateAsync(sessionId);
      toast.success('Trening usunięty', {
        description: 'Wybrana sesja treningowa została pomyślnie usunięta.',
      });
      refetch();
    } catch (error) {
      console.error('Error deleting workout log:', error);
      toast.error('Błąd', {
        description: 'Nie udało się usunąć treningu.',
      });
    } finally {
      setDeletingId(null);
    }
  };

  const calculateTotalVolume = (log: WorkoutLog): number => {
    return log.exercises.reduce((acc, ex) => {
      if (ex.exercise?.type !== 'weight') return acc;
      const exVolume = ex.sets.reduce(
        (setAcc, set) => setAcc + (set.reps || 0) * (set.weight ?? 0),
        0
      );
      return acc + exVolume;
    }, 0);
  };

  return (
    <div className="container mx-auto p-4 md:p-8">
      <h1 className="mb-6 font-headline text-3xl font-bold">Historia Treningów</h1>
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Twój Dziennik</CardTitle>
          <CardDescription>
            Szczegółowy zapis wszystkich Twoich ukończonych treningów.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <AccordionItem value={`skeleton-${i}`} key={i} className="border-b">
                  <AccordionTrigger className="hover:no-underline">
                    <Skeleton className="h-10 w-full" />
                  </AccordionTrigger>
                </AccordionItem>
              ))
            ) : workoutLogs && workoutLogs.length > 0 ? (
              workoutLogs.map((log) => {
                if (log.status === 'in-progress') return null;

                const totalVolume = calculateTotalVolume(log);

                return (
                  <AccordionItem value={log.id} key={log.id}>
                    <div className="flex items-center">
                      <AccordionTrigger
                        className="hover:no-underline flex-grow"
                        onClick={() => navigate(`/athlete/history/${log.id}`)}
                      >
                        <div className="flex w-full items-center justify-between pr-4">
                          <div className="text-left">
                            <p className="font-semibold">{log.workoutName}</p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(log.endTime), 'd MMMM yyyy', { locale: pl })}
                            </p>
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
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="mr-2"
                            onClick={(e) => e.stopPropagation()}
                            disabled={deletingId === log.id}
                          >
                            {deletingId === log.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4 text-destructive" />
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Czy na pewno chcesz usunąć ten trening?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              Tej operacji nie można cofnąć. To spowoduje trwałe usunięcie
                              treningu "{log.workoutName}" z dnia{' '}
                              {format(new Date(log.endTime), 'd.MM.yyyy')}.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Anuluj</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(log.id)}
                              className="bg-destructive hover:bg-destructive/90"
                            >
                              Usuń
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </AccordionItem>
                );
              })
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                <p>Brak historii treningów.</p>
                <p className="text-sm mt-2">
                  Ukończ swój pierwszy trening, aby zobaczyć go tutaj.
                </p>
              </div>
            )}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
