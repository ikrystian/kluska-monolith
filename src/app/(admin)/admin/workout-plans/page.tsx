'use client';

import { useMemo, useState } from 'react';
import { useCollection, useUser, useDeleteDoc } from '@/lib/db-hooks';
import type { WorkoutPlan, UserProfile } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Trash2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
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

export default function AdminWorkoutPlansPage() {
  const { user: currentUser } = useUser();
  const { toast } = useToast();
  const { deleteDoc, isLoading: isDeleting } = useDeleteDoc();

  const { data: plans, isLoading: plansLoading, refetch: refetchPlans } = useCollection<WorkoutPlan>('workoutPlans');
  const { data: users, isLoading: usersLoading } = useCollection<UserProfile>('users');

  const [planToDelete, setPlanToDelete] = useState<WorkoutPlan | null>(null);

  const usersMap = useMemo(() => {
    if (!users) return new Map();
    return new Map(users.map(u => [u.id || u._id, u.name]));
  }, [users]);

  const isLoading = plansLoading || usersLoading;

  const handleDeletePlan = async () => {
    if (!planToDelete) return;

    try {
      await deleteDoc('workoutPlans', planToDelete.id);
      toast({
        title: "Plan Usunięty",
        description: `Plan "${planToDelete.name}" został pomyślnie usunięty.`,
        variant: "destructive",
      });
      setPlanToDelete(null);
      refetchPlans();
    } catch (error) {
      toast({
        title: "Błąd",
        description: "Nie udało się usunąć planu.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-8">
      <Card>
        <CardHeader>
          <CardTitle>Wszystkie Plany Treningowe</CardTitle>
          <CardDescription>
            Lista wszystkich planów treningowych utworzonych przez użytkowników w systemie.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nazwa Planu</TableHead>
                <TableHead>Autor</TableHead>
                <TableHead>Przypisani sportowcy</TableHead>
                <TableHead className="text-right">Akcje</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-9 w-12 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : plans && plans.length > 0 ? (
                plans.map((plan: any) => (
                  <TableRow key={plan._id || plan.id}>
                    <TableCell className="font-medium">{plan.name}</TableCell>
                    <TableCell>{usersMap.get(plan.trainerId) || plan.trainerId}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{plan.assignedAthleteIds?.length || 0}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setPlanToDelete(plan)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Czy na pewno chcesz usunąć ten plan?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tej operacji nie można cofnąć. Plan &quot;{plan.name}&quot; zostanie trwale usunięty.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setPlanToDelete(null)}>Anuluj</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={handleDeletePlan}
                              className="bg-destructive hover:bg-destructive/90"
                              disabled={isDeleting}
                            >
                              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                              Usuń
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                 <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-12">
                        <p>Brak planów treningowych w systemie.</p>
                    </TableCell>
                </TableRow>
               )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
