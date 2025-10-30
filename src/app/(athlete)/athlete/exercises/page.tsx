'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
  DialogClose,
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { Exercise, MuscleGroup, WorkoutPlan, UserProfile } from '@/lib/types';
import { PlusCircle, Search, Loader2, Dumbbell, MoreVertical, Edit, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useCollection, useUser, useCreateDoc, useUpdateDoc, useDeleteDoc } from '@/lib/db-hooks';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function ExercisesPage() {
  const { user } = useUser();
  const { toast } = useToast();
  const { createDoc } = useCreateDoc();
  const { updateDoc } = useUpdateDoc();
  const { deleteDoc } = useDeleteDoc();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setEditDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);

  // Fetch assigned workout plans
  const { data: assignedPlans, isLoading: assignedPlansLoading } = useCollection<WorkoutPlan>(
    user?.uid ? 'workoutPlans' : null,
    user?.uid ? { assignedAthleteIds: { $in: [user.uid] } } : undefined
  );

  const exerciseIds = useMemo(() => {
    const ids = new Set<string>();
    if (assignedPlans) {
        assignedPlans.forEach(plan => {
            plan.workoutDays.forEach(day => {
                day.exercises.forEach(ex => {
                    if (ex.exerciseId) ids.add(ex.exerciseId);
                });
            });
        });
    }
    return Array.from(ids);
  }, [assignedPlans]);

  // Fetch exercises from assigned plans
  const { data: assignedExercises, isLoading: assignedLoading } = useCollection<Exercise>(
    exerciseIds.length > 0 ? 'exercises' : null,
    exerciseIds.length > 0 ? { id: { $in: Array.from(exerciseIds) } } : undefined
  );

  // Fetch public and user's own exercises
  const { data: publicAndUserExercises, isLoading: publicAndUserLoading, refetch: refetchExercises } = useCollection<Exercise>(
    user?.uid ? 'exercises' : null,
    user?.uid ? { ownerId: { $in: ['public', user.uid] } } : undefined
  );

  const allExercises = useMemo(() => {
      const combined = new Map<string, Exercise>();
      publicAndUserExercises?.forEach(ex => combined.set(ex.id, ex));
      assignedExercises?.forEach(ex => combined.set(ex.id, ex));
      return Array.from(combined.values());
  }, [publicAndUserExercises, assignedExercises]);

  // Fetch muscle groups
  const { data: muscleGroups, isLoading: muscleGroupsLoading } = useCollection<MuscleGroup>('muscleGroups');

  const isLoading = assignedLoading || publicAndUserLoading || muscleGroupsLoading;

  const filteredExercises = allExercises?.filter(
    (exercise) =>
      exercise.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exercise.muscleGroup.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleFormSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) return;
    setIsSubmitting(true);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const exerciseData = {
      name: formData.get('name') as string,
      muscleGroup: formData.get('muscleGroup') as string,
      description: formData.get('description') as string,
      type: formData.get('type') as 'weight' | 'duration' | 'reps',
    };

    try {
      if(selectedExercise) {
        // Update existing exercise
        const updatedData = {
          name: exerciseData.name,
          muscleGroup: exerciseData.muscleGroup,
          description: exerciseData.description,
          type: exerciseData.type,
        };
        await updateDoc('exercises', selectedExercise.id, updatedData);
        toast({ title: "Sukces!", description: "Ćwiczenie zostało zaktualizowane."});
        setEditDialogOpen(false);
        setSelectedExercise(null);
        refetchExercises();
      } else {
        // Add new exercise
        const newExerciseData = {
          ...exerciseData,
          image: `https://picsum.photos/seed/${encodeURIComponent(exerciseData.name)}/400/300`,
          imageHint: exerciseData.name.toLowerCase(),
          ownerId: user.uid,
        };
        await createDoc('exercises', newExerciseData);
        toast({ title: "Sukces!", description: "Nowe ćwiczenie zostało dodane."});
        setAddDialogOpen(false);
        refetchExercises();
      }
    } catch (error) {
      toast({
        title: 'Błąd',
        description: error instanceof Error ? error.message : 'Nie udało się zapisać ćwiczenia.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditDialog = (exercise: Exercise) => {
    setSelectedExercise(exercise);
    setEditDialogOpen(true);
  };

  const handleDeleteExercise = async () => {
    if (!selectedExercise) return;
    setIsSubmitting(true);

    try {
      await deleteDoc('exercises', selectedExercise.id);
      toast({ title: "Sukces!", description: "Ćwiczenie zostało usunięte."});
      setSelectedExercise(null);
      refetchExercises();
    } catch (error) {
      toast({
        title: 'Błąd',
        description: error instanceof Error ? error.message : 'Nie udało się usunąć ćwiczenia.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };


  const ExerciseDialogContent = ({ isEditMode }: { isEditMode: boolean }) => (
    <>
      <DialogHeader>
        <DialogTitle className="font-headline">{isEditMode ? 'Edytuj Ćwiczenie' : 'Dodaj Nowe Ćwiczenie'}</DialogTitle>
        <DialogDescription>
          {isEditMode ? 'Zaktualizuj szczegóły tego ćwiczenia.' : 'Wprowadź szczegóły nowego ćwiczenia. Kliknij "Zapisz", gdy skończysz.'}
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleFormSubmit}>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">Nazwa</Label>
            <Input id="name" name="name" defaultValue={isEditMode ? selectedExercise?.name : ''} className="col-span-3" required disabled={isSubmitting} />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="muscleGroup" className="text-right">Grupa mięśniowa</Label>
            <Select name="muscleGroup" defaultValue={isEditMode ? selectedExercise?.muscleGroup : ''} required disabled={isSubmitting || muscleGroupsLoading}>
                <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Wybierz grupę mięśniową" />
                </SelectTrigger>
                <SelectContent>
                    {muscleGroups?.map(group => (
                        <SelectItem key={group.id} value={group.name}>{group.name}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="type" className="text-right">Typ</Label>
            <Select name="type" defaultValue={isEditMode ? selectedExercise?.type : 'weight'} required disabled={isSubmitting}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Wybierz typ ćwiczenia" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weight">Na ciężar (serie/powtórzenia)</SelectItem>
                <SelectItem value="reps">Na powtórzenia (bez ciężaru)</SelectItem>
                <SelectItem value="duration">Na czas (sekundy)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="description" className="text-right">Opis</Label>
            <Textarea id="description" name="description" defaultValue={isEditMode ? selectedExercise?.description : ''} className="col-span-3" required disabled={isSubmitting} />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary" disabled={isSubmitting}>Anuluj</Button>
          </DialogClose>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditMode ? 'Zapisz zmiany' : 'Zapisz ćwiczenie'}
          </Button>
        </DialogFooter>
      </form>
    </>
  );

  return (
    <AlertDialog>
      <div className="container mx-auto p-4 md:p-8">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <h1 className="font-headline text-3xl font-bold">Biblioteka Ćwiczeń</h1>
          <div className="flex gap-2">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Szukaj ćwiczeń..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={(isOpen) => { setAddDialogOpen(isOpen); if(!isOpen) setSelectedExercise(null); }}>
              <DialogTrigger asChild>
                <Button>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Dodaj ćwiczenie
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <ExerciseDialogContent isEditMode={false} />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {isLoading ? (
            Array.from({ length: 8 }).map((_, index) => (
              <Card key={index} className="overflow-hidden">
                <Skeleton className="h-48 w-full" />
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/4" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full mt-2" />
                </CardContent>
              </Card>
            ))
          ) : filteredExercises && filteredExercises.length > 0 ? (
            filteredExercises.map((exercise) => (
              <Card key={exercise.id} className="overflow-hidden transition-all hover:shadow-lg flex flex-col">
                <div className="relative h-48 w-full">
                  <Image
                    src={exercise.image}
                    alt={exercise.name}
                    fill
                    className="object-cover"
                    data-ai-hint={exercise.imageHint}
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                </div>
                <CardHeader>
                  <div className="flex justify-between items-start">
                      <CardTitle className="font-headline">{exercise.name}</CardTitle>
                      {exercise.ownerId === user?.uid && (
                           <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 -mt-2 -mr-2">
                                      <MoreVertical className="h-4 w-4" />
                                  </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => openEditDialog(exercise)}>
                                      <Edit className="mr-2 h-4 w-4" />
                                      <span>Edytuj</span>
                                  </DropdownMenuItem>
                                   <AlertDialogTrigger asChild>
                                      <DropdownMenuItem onSelect={(e) => e.preventDefault()} onClick={() => setSelectedExercise(exercise)}>
                                          <Trash2 className="mr-2 h-4 w-4 text-destructive" />
                                          <span className="text-destructive">Usuń</span>
                                      </DropdownMenuItem>
                                  </AlertDialogTrigger>
                              </DropdownMenuContent>
                          </DropdownMenu>
                      )}
                  </div>
                  <div className="flex justify-between items-center pt-1">
                    <Badge variant="secondary">{exercise.muscleGroup}</Badge>
                    {exercise.ownerId === user?.uid && <Badge variant="outline">Własne</Badge>}
                    {exercise.ownerId !== 'public' && exercise.ownerId !== user?.uid && <Badge variant="default" className='bg-green-600'>Z planu</Badge>}
                  </div>
                </CardHeader>
                <CardContent className="flex-grow">
                  <CardDescription>{exercise.description}</CardDescription>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="sm:col-span-2 lg:col-span-3 xl:col-span-4 flex flex-col items-center justify-center border-dashed py-20">
              <CardContent className="text-center">
                <Dumbbell className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-headline text-xl font-semibold mb-2">Brak ćwiczeń</h3>
                <p className="text-muted-foreground mb-4">Nie znaleziono żadnych ćwiczeń. Dodaj swoje pierwsze ćwiczenie, aby zacząć.</p>
                <Button variant="outline" onClick={() => { setSelectedExercise(null); setAddDialogOpen(true); }}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Dodaj Ćwiczenie
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={(isOpen) => { setEditDialogOpen(isOpen); if(!isOpen) setSelectedExercise(null); }}>
          <DialogContent className="sm:max-w-[425px]">
            <ExerciseDialogContent isEditMode={true} />
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog Content */}
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Czy na pewno chcesz usunąć to ćwiczenie?</AlertDialogTitle>
            <AlertDialogDescription>
                Tej operacji nie można cofnąć. To spowoduje trwałe usunięcie ćwiczenia
                <span className="font-semibold"> "{selectedExercise?.name}" </span>
                z bazy danych.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedExercise(null)} disabled={isSubmitting}>Anuluj</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteExercise} disabled={isSubmitting} className="bg-destructive hover:bg-destructive/90">
                 {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Usuń
            </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </div>
    </AlertDialog>
  );
}

