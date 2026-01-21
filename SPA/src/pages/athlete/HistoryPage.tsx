import { useState } from 'react';
<<<<<<< HEAD
import { Link } from 'react-router-dom';
import { useCollection } from '@/hooks/useCollection';
import { useDeleteDoc } from '@/hooks/useMutation';
import { useAuth } from '@/contexts/AuthContext';
import { WorkoutLog } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
=======
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
>>>>>>> 47f4578 (feat: Revamp workout detail page with copy/schedule/start actions, introduce exercise progress tracking, gamification, and new UI components.)
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
<<<<<<< HEAD
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Calendar as CalendarIcon, Clock, Dumbbell, Activity, Trash2, ChevronRight, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

export default function HistoryPage() {
  const { user } = useAuth();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<WorkoutLog | null>(null);

  const { data: workoutLogs, isLoading, refetch } = useCollection<WorkoutLog>(
    user?.id ? 'workoutLogs' : null,
    {
      query: { athleteId: user?.id },
      sort: { endTime: -1 },
      limit: 50
    }
  );

  const { mutate: deleteDoc, isPending: isDeleting } = useDeleteDoc('workoutLogs');

  const handleDeleteClick = (log: WorkoutLog, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedLog(log);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (!selectedLog) return;

    deleteDoc(selectedLog.id, {
      onSuccess: () => {
        toast.success('Trening został usunięty.');
        setDeleteDialogOpen(false);
        setSelectedLog(null);
        refetch();
      },
      onError: () => {
        toast.error('Nie udało się usunąć treningu.');
      }
    });
  };

  const calculateVolume = (log: WorkoutLog) => {
    return log.exercises.reduce((acc, ex) => {
      if (ex.exercise?.type !== 'weight') return acc;
      const exVolume = ex.sets.reduce((setAcc, set) => setAcc + (set.reps || 0) * (set.weight ?? 0), 0);
=======
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
>>>>>>> 47f4578 (feat: Revamp workout detail page with copy/schedule/start actions, introduce exercise progress tracking, gamification, and new UI components.)
      return acc + exVolume;
    }, 0);
  };

<<<<<<< HEAD
  // Filter out in-progress workouts
  const completedLogs = workoutLogs?.filter(log => log.status !== 'in-progress');

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="mb-6">
        <h1 className="font-headline text-3xl font-bold">Historia Treningów</h1>
        <p className="text-muted-foreground">Szczegółowy zapis wszystkich Twoich ukończonych treningów.</p>
      </div>

      {isLoading ? (
        <div className="grid gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <div className="flex gap-4">
                    <Skeleton className="h-10 w-16" />
                    <Skeleton className="h-10 w-16" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : completedLogs && completedLogs.length > 0 ? (
        <div className="grid gap-4">
          {completedLogs.map((log) => {
            const totalVolume = calculateVolume(log);

            return (
              <Link key={log.id} to={`/athlete/history/${log.id}`}>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg truncate">{log.workoutName}</h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <CalendarIcon className="h-4 w-4" />
                          <span>
                            {log.endTime
                              ? format(new Date(log.endTime), 'd MMMM yyyy', { locale: pl })
                              : 'Brak daty'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 md:gap-6">
                        <div className="text-center">
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            <span>Czas</span>
                          </div>
                          <p className="font-semibold">{log.duration || '-'} min</p>
                        </div>

                        <div className="text-center hidden sm:block">
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Dumbbell className="h-4 w-4" />
                            <span>Ćwiczenia</span>
                          </div>
                          <p className="font-semibold">{log.exercises?.length || 0}</p>
                        </div>

                        <div className="text-center">
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Activity className="h-4 w-4" />
                            <span>Objętość</span>
                          </div>
                          <p className="font-semibold">{totalVolume.toLocaleString()} kg</p>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => handleDeleteClick(log, e)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </div>
                    </div>

                    {/* New records badge */}
                    {log.newRecords && log.newRecords.length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-700">
                          🏆 {log.newRecords.length} nowy{log.newRecords.length > 1 ? 'ch rekordów' : ' rekord'}
                        </Badge>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-20">
            <Dumbbell className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Brak historii treningów</h3>
            <p className="text-muted-foreground mb-4">Ukończ swój pierwszy trening, aby zobaczyć go tutaj.</p>
            <Link to="/athlete/workouts">
              <Button>Rozpocznij trening</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Czy na pewno chcesz usunąć ten trening?</AlertDialogTitle>
            <AlertDialogDescription>
              Tej operacji nie można cofnąć. To spowoduje trwałe usunięcie treningu
              "{selectedLog?.workoutName}" z dnia {selectedLog?.endTime ? format(new Date(selectedLog.endTime), 'd.MM.yyyy') : ''}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedLog(null)}>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Usuń
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
=======
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
>>>>>>> 47f4578 (feat: Revamp workout detail page with copy/schedule/start actions, introduce exercise progress tracking, gamification, and new UI components.)
    </div>
  );
}
