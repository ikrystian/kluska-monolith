import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCollection } from '@/hooks/useCollection';
import { useCreateDoc, useUpdateDoc, useDeleteDoc } from '@/hooks/useMutation';
import { Goal } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { PlusCircle, Target, Loader2, Trophy, MoreVertical, Edit, Trash2, Calendar as CalendarIcon } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { pl } from 'date-fns/locale';

interface GoalFormData {
  title: string;
  target: number;
  current: number;
  unit: string;
  deadline: string;
}

export default function GoalsPage() {
  const { user } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [deleteGoal, setDeleteGoal] = useState<Goal | null>(null);
  const [formData, setFormData] = useState<GoalFormData>({
    title: '',
    target: 100,
    current: 0,
    unit: 'kg',
    deadline: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
  });

  const { data: goals, isLoading, refetch } = useCollection<Goal>(
    user?.id ? 'goals' : null,
    { query: { ownerId: user?.id } }
  );

  const { mutate: createDoc, isPending: isCreating } = useCreateDoc<Goal>('goals');
  const { mutate: updateDoc, isPending: isUpdating } = useUpdateDoc<Goal>('goals');
  const { mutate: deleteDoc, isPending: isDeleting } = useDeleteDoc('goals');

  const handleOpenDialog = (goal?: Goal) => {
    if (goal) {
      setEditingGoal(goal);
      const targetVal = goal.target ?? goal.targetValue ?? 0;
      const currentVal = goal.current ?? goal.currentValue ?? 0;
      const deadlineVal = goal.deadline ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      setFormData({
        title: goal.title,
        target: targetVal,
        current: currentVal,
        unit: goal.unit,
        deadline: format(new Date(deadlineVal), 'yyyy-MM-dd'),
      });
    } else {
      setEditingGoal(null);
      setFormData({
        title: '',
        target: 100,
        current: 0,
        unit: 'kg',
        deadline: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingGoal(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    const goalData = {
      title: formData.title,
      target: Number(formData.target),
      current: Number(formData.current),
      unit: formData.unit,
      deadline: new Date(formData.deadline).toISOString(),
      ownerId: user.id,
    };

    if (editingGoal) {
      updateDoc(
        { id: editingGoal.id, data: goalData },
        {
          onSuccess: () => {
            toast.success('Cel został zaktualizowany.');
            handleCloseDialog();
            refetch();
          },
          onError: () => {
            toast.error('Nie udało się zaktualizować celu.');
          }
        }
      );
    } else {
      createDoc(goalData, {
        onSuccess: () => {
          toast.success('Nowy cel został dodany.');
          handleCloseDialog();
          refetch();
        },
        onError: () => {
          toast.error('Nie udało się dodać celu.');
        }
      });
    }
  };

  const handleDelete = () => {
    if (!deleteGoal) return;

    deleteDoc(deleteGoal.id, {
      onSuccess: () => {
        toast.success('Cel został usunięty.');
        setDeleteGoal(null);
        refetch();
      },
      onError: () => {
        toast.error('Nie udało się usunąć celu.');
      }
    });
  };

  const isSaving = isCreating || isUpdating;

  return (
    <div className="container mx-auto p-4 md:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h1 className="font-headline text-3xl font-bold">Cele i Trofea</h1>
        <Button onClick={() => handleOpenDialog()}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Ustaw Nowy Cel
        </Button>
      </div>

      {/* Active Goals Section */}
      <section className="mb-12">
        <h2 className="mb-4 font-headline text-2xl font-semibold">Aktywne Cele</h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="flex flex-col">
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2 mt-2" />
                </CardHeader>
                <CardContent className="flex-grow space-y-2">
                  <Skeleton className="h-8 w-1/2 mx-auto" />
                  <Skeleton className="h-4 w-full" />
                </CardContent>
                <CardFooter>
                  <Skeleton className="h-4 w-1/3 mx-auto" />
                </CardFooter>
              </Card>
            ))
          ) : goals?.length === 0 ? (
            <Card onClick={() => handleOpenDialog()} className="flex flex-col items-center justify-center border-dashed hover:border-primary hover:bg-secondary/30 transition-colors cursor-pointer min-h-[280px] col-span-full max-w-md mx-auto">
              <CardContent className="text-center p-6">
                <Target className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-headline text-xl font-semibold mb-2">Brak aktywnych celów</h3>
                <p className="text-muted-foreground mb-4">Zdefiniuj swój następny cel i pozostań zmotywowany.</p>
                <Button variant="outline">Ustaw Nowy Cel</Button>
              </CardContent>
            </Card>
          ) : goals?.map((goal) => {
            const targetVal = goal.target ?? goal.targetValue ?? 0;
            const currentVal = goal.current ?? goal.currentValue ?? 0;
            const progress = targetVal > 0 ? Math.min((currentVal / targetVal) * 100, 100) : 0;
            const isCompleted = progress >= 100;
            const deadlineVal = goal.deadline ?? goal.createdAt;

            return (
              <Card key={goal.id} className="flex flex-col">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="font-headline">{goal.title}</CardTitle>
                      <CardDescription className="flex items-center gap-1 mt-1">
                        <CalendarIcon className="h-3 w-3" />
                        Termin: {deadlineVal ? format(new Date(deadlineVal), 'd MMM yyyy', { locale: pl }) : 'Brak terminu'}
                      </CardDescription>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 -mt-2 -mr-2">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenDialog(goal)}>
                          <Edit className="mr-2 h-4 w-4" />
                          <span>Edytuj</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setDeleteGoal(goal)}>
                          <Trash2 className="mr-2 h-4 w-4 text-destructive" />
                          <span className="text-destructive">Usuń</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="flex-grow">
                  <div className="mb-2 flex items-baseline justify-center gap-2">
                    <span className="text-4xl font-bold">{currentVal.toLocaleString()}</span>
                    <span className="text-muted-foreground">/ {targetVal.toLocaleString()} {goal.unit}</span>
                  </div>
                  <Progress
                    value={progress}
                    className={isCompleted ? '[&>div]:bg-green-500' : ''}
                  />
                  <p className="text-center text-sm text-muted-foreground mt-2">
                    {progress.toFixed(0)}% ukończono
                  </p>
                </CardContent>
                <CardFooter className="flex-col gap-2">
                  {isCompleted ? (
                    <div className="w-full text-center">
                      <div className="flex items-center justify-center gap-2 text-green-600 font-semibold">
                        <Trophy className="h-5 w-5" />
                        Cel osiągnięty!
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground w-full text-center">
                      {deadlineVal ? `Pozostało ${formatDistanceToNow(new Date(deadlineVal), { locale: pl, addSuffix: true })}` : 'Brak terminu'}
                    </p>
                  )}
                </CardFooter>
              </Card>
            );
          })}

          {goals && goals.length > 0 && (
            <Card onClick={() => handleOpenDialog()} className="flex flex-col items-center justify-center border-dashed hover:border-primary hover:bg-secondary/30 transition-colors cursor-pointer min-h-[280px]">
              <CardContent className="text-center p-6">
                <PlusCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-headline text-xl font-semibold mb-2">Stwórz Nowy Cel</h3>
                <p className="text-muted-foreground mb-4">Zdefiniuj swój następny cel.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      {/* Goal Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle className="font-headline">
                {editingGoal ? 'Edytuj Cel' : 'Ustaw Nowy Cel'}
              </DialogTitle>
              <DialogDescription>
                {editingGoal ? 'Zaktualizuj szczegóły swojego celu.' : 'Zdefiniuj swój następny cel i pozostań zmotywowany.'}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Tytuł Celu</Label>
                <Input
                  id="title"
                  placeholder="np. Wyciskanie na ławce 100kg"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="current">Aktualnie</Label>
                  <Input
                    id="current"
                    type="number"
                    value={formData.current}
                    onChange={(e) => setFormData(prev => ({ ...prev, current: Number(e.target.value) }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="target">Cel</Label>
                  <Input
                    id="target"
                    type="number"
                    value={formData.target}
                    onChange={(e) => setFormData(prev => ({ ...prev, target: Number(e.target.value) }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unit">Jednostka</Label>
                  <Input
                    id="unit"
                    placeholder="kg, km, powt."
                    value={formData.unit}
                    onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="deadline">Termin</Label>
                <Input
                  id="deadline"
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => setFormData(prev => ({ ...prev, deadline: e.target.value }))}
                  required
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="secondary" onClick={handleCloseDialog} disabled={isSaving}>
                Anuluj
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingGoal ? 'Zapisz Zmiany' : 'Zapisz Cel'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteGoal} onOpenChange={() => setDeleteGoal(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Czy na pewno chcesz usunąć ten cel?</AlertDialogTitle>
            <AlertDialogDescription>
              Tej operacji nie można cofnąć. To spowoduje trwałe usunięcie celu "{deleteGoal?.title}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
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
