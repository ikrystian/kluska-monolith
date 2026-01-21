import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCollection } from '@/hooks/useCollection';
import { useDeleteDoc } from '@/hooks/useMutation';
import { useAuth } from '@/contexts/AuthContext';
import { WorkoutLog } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
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
      return acc + exVolume;
    }, 0);
  };

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
    </div>
  );
}
