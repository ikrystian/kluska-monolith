'use client';

import { useState } from 'react';
import { useUser, useCollection, useDeleteDoc, useCreateDoc, useUpdateDoc } from '@/lib/db-hooks';
import { Workout, TrainingPlan, TrainingLevel } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { PlusCircle, Edit, Trash2, Loader2, Dumbbell, Calendar } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { WorkoutForm } from '@/components/admin/workout-form';
import { PlanForm } from '@/components/admin/plan-form';
import { useToast } from '@/hooks/use-toast';
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function TrainerTemplatesPage() {
  const { user } = useUser();
  const { toast } = useToast();
  const { deleteDoc } = useDeleteDoc();
  const { createDoc } = useCreateDoc();
  const { updateDoc } = useUpdateDoc();

  const [activeTab, setActiveTab] = useState('workouts');
  const [view, setView] = useState<'list' | 'new-workout' | 'edit-workout' | 'new-plan' | 'edit-plan'>('list');
  const [editingItem, setEditingItem] = useState<any>(null);

  // Fetch Workouts
  const { data: workouts, isLoading: workoutsLoading, refetch: refetchWorkouts } = useCollection<Workout>(
    'workouts',
    user?.uid ? { ownerId: user.uid } : undefined
  );

  // Fetch Plans
  const { data: plans, isLoading: plansLoading, refetch: refetchPlans } = useCollection<TrainingPlan>(
    'workoutPlans',
    user?.uid ? { trainerId: user.uid } : undefined
  );

  const handleCreateWorkout = async (data: Workout) => {
    try {
      await createDoc('workouts', { ...data, ownerId: user?.uid });
      toast({ title: 'Sukces', description: 'Trening utworzony.' });
      setView('list');
      refetchWorkouts();
    } catch (e) {
      toast({ title: 'Błąd', description: 'Nie udało się utworzyć treningu.', variant: 'destructive' });
    }
  };

  const handleUpdateWorkout = async (data: Workout) => {
    if (!editingItem) return;
    try {
      await updateDoc('workouts', editingItem.id, data);
      toast({ title: 'Sukces', description: 'Trening zaktualizowany.' });
      setView('list');
      setEditingItem(null);
      refetchWorkouts();
    } catch (e) {
      toast({ title: 'Błąd', description: 'Nie udało się zaktualizować treningu.', variant: 'destructive' });
    }
  };

  const handleDeleteWorkout = async (id: string) => {
    try {
      await deleteDoc('workouts', id);
      toast({ title: 'Sukces', description: 'Trening usunięty.' });
      refetchWorkouts();
    } catch (e) {
      toast({ title: 'Błąd', description: 'Nie udało się usunąć treningu.', variant: 'destructive' });
    }
  };

  const handleCreatePlan = async (data: TrainingPlan) => {
    try {
      await createDoc('workoutPlans', { ...data, trainerId: user?.uid });
      toast({ title: 'Sukces', description: 'Plan utworzony.' });
      setView('list');
      refetchPlans();
    } catch (e) {
      toast({ title: 'Błąd', description: 'Nie udało się utworzyć planu.', variant: 'destructive' });
    }
  };

  const handleUpdatePlan = async (data: TrainingPlan) => {
    if (!editingItem) return;
    try {
      await updateDoc('workoutPlans', editingItem.id, data);
      toast({ title: 'Sukces', description: 'Plan zaktualizowany.' });
      setView('list');
      setEditingItem(null);
      refetchPlans();
    } catch (e) {
      toast({ title: 'Błąd', description: 'Nie udało się zaktualizować planu.', variant: 'destructive' });
    }
  };

  const handleDeletePlan = async (id: string) => {
    try {
      await deleteDoc('workoutPlans', id);
      toast({ title: 'Sukces', description: 'Plan usunięty.' });
      refetchPlans();
    } catch (e) {
      toast({ title: 'Błąd', description: 'Nie udało się usunąć planu.', variant: 'destructive' });
    }
  };

  if (view === 'new-workout') {
    return (
      <div className="container mx-auto p-4 md:p-8">
        <Button variant="ghost" onClick={() => setView('list')} className="mb-4">&larr; Powrót</Button>
        <h1 className="text-2xl font-bold mb-6">Nowy Trening</h1>
        <WorkoutForm onSubmit={handleCreateWorkout} />
      </div>
    )
  }

  if (view === 'edit-workout') {
    return (
      <div className="container mx-auto p-4 md:p-8">
        <Button variant="ghost" onClick={() => { setView('list'); setEditingItem(null); }} className="mb-4">&larr; Powrót</Button>
        <h1 className="text-2xl font-bold mb-6">Edytuj Trening</h1>
        <WorkoutForm initialData={editingItem} onSubmit={handleUpdateWorkout} />
      </div>
    )
  }

  if (view === 'new-plan') {
    return (
      <div className="container mx-auto p-4 md:p-8">
        <Button variant="ghost" onClick={() => setView('list')} className="mb-4">&larr; Powrót</Button>
        <h1 className="text-2xl font-bold mb-6">Nowy Plan Treningowy</h1>
        <PlanForm onSubmit={handleCreatePlan} />
      </div>
    )
  }

  if (view === 'edit-plan') {
    return (
      <div className="container mx-auto p-4 md:p-8">
        <Button variant="ghost" onClick={() => { setView('list'); setEditingItem(null); }} className="mb-4">&larr; Powrót</Button>
        <h1 className="text-2xl font-bold mb-6">Edytuj Plan Treningowy</h1>
        <PlanForm initialData={editingItem} onSubmit={handleUpdatePlan} />
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="font-headline text-3xl font-bold">Baza Treningowa</h1>
          <p className="text-muted-foreground">Zarządzaj swoimi treningami i planami treningowymi.</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-8">
          <TabsTrigger value="workouts">Treningi (Jednostki)</TabsTrigger>
          <TabsTrigger value="plans">Plany Treningowe (Harmonogramy)</TabsTrigger>
        </TabsList>

        <TabsContent value="workouts">
          <div className="flex justify-end mb-4">
            <Button onClick={() => setView('new-workout')}>
              <PlusCircle className="mr-2 h-4 w-4" /> Nowy Trening
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {workoutsLoading ? <p>Ładowanie...</p> : workouts?.map(workout => (
              <Card key={workout.id}>
                <CardHeader>
                  <CardTitle className="flex justify-between items-start">
                    <span>{workout.name}</span>
                    <Badge variant="outline">{workout.level}</Badge>
                  </CardTitle>
                  <CardDescription>{workout.durationMinutes} min • {workout.exerciseSeries?.length || 0} ćwiczeń</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => { setEditingItem(workout); setView('edit-workout'); }}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Usuń trening</AlertDialogTitle>
                          <AlertDialogDescription>Czy na pewno chcesz usunąć ten trening?</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Anuluj</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteWorkout(workout.id)}>Usuń</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            ))}
            {!workoutsLoading && workouts?.length === 0 && (
              <div className="col-span-full text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                <Dumbbell className="mx-auto h-12 w-12 mb-4" />
                <p>Brak treningów. Stwórz pierwszy trening!</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="plans">
          <div className="flex justify-end mb-4">
            <Button onClick={() => setView('new-plan')}>
              <PlusCircle className="mr-2 h-4 w-4" /> Nowy Plan
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {plansLoading ? <p>Ładowanie...</p> : plans?.map(plan => (
              <Card key={plan.id}>
                <CardHeader>
                  <CardTitle className="flex justify-between items-start">
                    <span>{plan.name}</span>
                    <Badge variant="outline">{plan.level}</Badge>
                  </CardTitle>
                  <CardDescription>{plan.stages?.length || 0} etapów</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => { setEditingItem(plan); setView('edit-plan'); }}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Usuń plan</AlertDialogTitle>
                          <AlertDialogDescription>Czy na pewno chcesz usunąć ten plan?</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Anuluj</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeletePlan(plan.id)}>Usuń</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            ))}
            {!plansLoading && plans?.length === 0 && (
              <div className="col-span-full text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                <Calendar className="mx-auto h-12 w-12 mb-4" />
                <p>Brak planów treningowych. Stwórz pierwszy plan!</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
