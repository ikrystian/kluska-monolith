'use client';

import { useMemo, useState } from 'react';
import { useCollection, useUser, useDeleteDoc } from '@/lib/db-hooks';
import type { TrainingPlan, UserProfile } from '@/lib/types';
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
import { Trash2, Loader2, Plus, Edit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
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

export type WorkoutPlansRole = 'trainer' | 'admin';

export interface WorkoutPlansListViewProps {
  /** Role determines filtering and display options */
  role: WorkoutPlansRole;
  /** Base path for links (e.g., '/trainer/workout-plans' or '/admin/workout-plans') */
  basePath: string;
  /** Title for the card */
  title?: string;
  /** Description for the card */
  description?: string;
  /** Whether to show the author column (default: true for admin, false for trainer) */
  showAuthorColumn?: boolean;
}

export function WorkoutPlansListView({
  role,
  basePath,
  title,
  description,
  showAuthorColumn,
}: WorkoutPlansListViewProps) {
  const { user: currentUser } = useUser();
  const { toast } = useToast();
  const { deleteDoc, isLoading: isDeleting } = useDeleteDoc();

  const { data: allPlans, isLoading: plansLoading, refetch: refetchPlans } = useCollection<TrainingPlan>('workoutPlans');
  const { data: users, isLoading: usersLoading } = useCollection<UserProfile>(
    showAuthorColumn ?? role === 'admin' ? 'users' : null
  );

  const [planToDelete, setPlanToDelete] = useState<TrainingPlan | null>(null);

  const usersMap = useMemo(() => {
    if (!users) return new Map<string, string>();
    return new Map(users.map(u => [u.id, u.name]));
  }, [users]);

  // Filter plans based on role
  const plans = useMemo(() => {
    if (!allPlans) return [];
    if (role === 'trainer' && currentUser) {
      return allPlans.filter(plan => plan.trainerId === currentUser.uid);
    }
    return allPlans; // Admin sees all
  }, [allPlans, currentUser, role]);

  const isLoading = plansLoading || (showAuthorColumn ?? role === 'admin' ? usersLoading : false);
  const shouldShowAuthor = showAuthorColumn ?? role === 'admin';

  const displayTitle = title ?? (role === 'admin' ? 'Wszystkie Plany Treningowe' : 'Moje Plany Treningowe');
  const displayDescription = description ?? (role === 'admin'
    ? 'Lista wszystkich planów treningowych w systemie.'
    : 'Zarządzaj swoimi planami treningowymi.');
  const emptyMessage = role === 'admin'
    ? 'Brak planów treningowych w systemie.'
    : 'Nie masz jeszcze żadnych planów treningowych.';

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
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{displayTitle}</CardTitle>
            <CardDescription>{displayDescription}</CardDescription>
          </div>
          <Button asChild>
            <Link href={`${basePath}/new`}>
              <Plus className="mr-2 h-4 w-4" />
              Nowy Plan
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nazwa Planu</TableHead>
                <TableHead>Poziom</TableHead>
                {shouldShowAuthor && <TableHead>Autor</TableHead>}
                <TableHead>Etapy</TableHead>
                <TableHead className="text-right">Akcje</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    {shouldShowAuthor && <TableCell><Skeleton className="h-5 w-16" /></TableCell>}
                    <TableCell><Skeleton className="h-5 w-8" /></TableCell>
                    <TableCell><Skeleton className="h-9 w-12 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : plans && plans.length > 0 ? (
                plans.map((plan: TrainingPlan) => (
                  <TableRow key={plan.id}>
                    <TableCell className="font-medium">{plan.name}</TableCell>
                    <TableCell><Badge variant="outline">{plan.level}</Badge></TableCell>
                    {shouldShowAuthor && (
                      <TableCell>{(plan.trainerId && usersMap.get(plan.trainerId)) || (plan.trainerId ? 'Trener' : 'System')}</TableCell>
                    )}
                    <TableCell>
                      <Badge variant="secondary">{plan.stages?.length || 0}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`${basePath}/${plan.id}`}>
                            <Edit className="h-4 w-4" />
                          </Link>
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setPlanToDelete(plan)}
                              className="text-destructive hover:text-destructive"
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
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={shouldShowAuthor ? 5 : 4} className="text-center text-muted-foreground py-12">
                    <p>{emptyMessage}</p>
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