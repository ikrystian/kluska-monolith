'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
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
import { Exercise, MuscleGroupName, MuscleGroup, WorkoutPlan, WorkoutLog } from '@/lib/types';
import { Search, Loader2, Dumbbell, MoreVertical, Edit, Trash2, LineChart as ChartIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useCollection, useUser, useUpdateDoc, useDeleteDoc } from '@/lib/db-hooks';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { MultiSelect } from '@/components/ui/multi-select';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

// --- SCHEMA ---
const exerciseSchema = z.object({
  name: z.string().min(1, 'Nazwa jest wymagana.'),
  mainMuscleGroups: z.array(z.string()).min(1, 'Przynajmniej jedna główna grupa mięśniowa jest wymagana.'),
  secondaryMuscleGroups: z.array(z.string()).optional(),
  instructions: z.string().optional(),
  mediaUrl: z.string().url('Nieprawidłowy URL multimediów.').optional().or(z.literal('')),
  type: z.enum(['weight', 'duration', 'reps'], { required_error: "Typ ćwiczenia jest wymagany." }).optional(),
  description: z.string().optional(),
});

type ExerciseFormValues = z.infer<typeof exerciseSchema>;

// --- PROGRESS DIALOG ---
function ProgressDialog({ exercise, userId, open, onOpenChange }: { exercise: Exercise | null, userId: string | undefined, open: boolean, onOpenChange: (open: boolean) => void }) {
  const { data: logs, isLoading } = useCollection<WorkoutLog>(
    userId ? 'workoutLogs' : null,
    userId ? { athleteId: userId, status: 'completed' } : undefined
  );

  const chartData = useMemo(() => {
    if (!logs || !exercise) return [];

    return logs
      .filter(log => log.exercises.some(ex => ex.exercise?.id === exercise.id))
      .map(log => {
        const exLog = log.exercises.find(ex => ex.exercise?.id === exercise.id);
        // Calculate max weight for weight-based, or max reps/duration
        let value = 0;
        if (exercise.type === 'weight' || !exercise.type) {
          value = Math.max(...(exLog?.sets.map(s => s.weight || 0) || [0]));
        } else if (exercise.type === 'reps') {
          value = Math.max(...(exLog?.sets.map(s => s.reps || 0) || [0]));
        } else if (exercise.type === 'duration') {
          value = Math.max(...(exLog?.sets.map(s => s.duration || 0) || [0]));
        }

        return {
          rawDate: new Date(log.endTime),
          date: format(new Date(log.endTime), 'd MMM', { locale: pl }),
          value: value
        };
      })
      .sort((a, b) => a.rawDate.getTime() - b.rawDate.getTime());
  }, [logs, exercise]);

  if (!exercise) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="font-headline">Postęp: {exercise.name}</DialogTitle>
          <DialogDescription>
            Twoje najlepsze wyniki w czasie.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="h-[300px] flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : chartData.length < 2 ? (
          <div className="h-[300px] flex flex-col items-center justify-center text-center p-4 border-2 border-dashed rounded-lg">
            <ChartIcon className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Za mało danych, aby wyświetlić wykres.</p>
            <p className="text-sm text-muted-foreground">Wykonaj to ćwiczenie w co najmniej dwóch treningach.</p>
          </div>
        ) : (
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={10} />
                <YAxis tickLine={false} axisLine={false} tickMargin={10} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  formatter={(value: number) => [`${value} ${exercise.type === 'duration' ? 's' : (exercise.type === 'reps' ? 'powt.' : 'kg')}`, 'Wynik']}
                />
                <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 4, fill: "hsl(var(--primary))" }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function ExercisesPage() {
  const { user } = useUser();
  const { toast } = useToast();
  const { updateDoc } = useUpdateDoc();
  const { deleteDoc } = useDeleteDoc();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<string>('all');
  const [isEditDialogOpen, setEditDialogOpen] = useState(false);
  const [isProgressDialogOpen, setProgressDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);

  // Fetch assigned workout plans
  const { data: assignedPlans } = useCollection<WorkoutPlan>(
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

  const isLoading = assignedLoading || publicAndUserLoading;

  const filteredExercises = allExercises?.filter(
    (exercise) => {
      const matchesSearch = exercise.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exercise.mainMuscleGroups?.some(mg => mg.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        exercise.muscleGroup?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesMuscleGroup = selectedMuscleGroup === 'all' ||
        exercise.mainMuscleGroups?.some(mg => mg.name === selectedMuscleGroup) ||
        exercise.muscleGroup === selectedMuscleGroup;

      return matchesSearch && matchesMuscleGroup;
    }
  );

  const form = useForm<ExerciseFormValues>({
    resolver: zodResolver(exerciseSchema),
    defaultValues: {
      name: '',
      mainMuscleGroups: [],
      secondaryMuscleGroups: [],
      instructions: '',
      mediaUrl: '',
      type: 'weight',
      description: '',
    }
  });

  const handleFormSubmit = async (data: ExerciseFormValues) => {
    if (!user) return;
    setIsSubmitting(true);

    // Map strings back to MuscleGroup objects
    const mainMuscleGroups: MuscleGroup[] = data.mainMuscleGroups.map(name => ({ name: name as MuscleGroupName }));
    const secondaryMuscleGroups: MuscleGroup[] = (data.secondaryMuscleGroups || []).map(name => ({ name: name as MuscleGroupName }));

    try {
      if (selectedExercise) {
        // Update existing exercise
        const updatedData = {
          name: data.name,
          mainMuscleGroups,
          secondaryMuscleGroups,
          instructions: data.instructions,
          mediaUrl: data.mediaUrl,
          type: data.type,
          description: data.description,
          // Legacy support
          muscleGroup: data.mainMuscleGroups[0],
          image: data.mediaUrl,
        };
        await updateDoc('exercises', selectedExercise.id, updatedData);
        toast({ title: "Sukces!", description: "Ćwiczenie zostało zaktualizowane." });
        setEditDialogOpen(false);
        setSelectedExercise(null);
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
    form.reset({
      name: exercise.name,
      mainMuscleGroups: exercise.mainMuscleGroups?.map(mg => mg.name) || (exercise.muscleGroup ? [exercise.muscleGroup] : []),
      secondaryMuscleGroups: exercise.secondaryMuscleGroups?.map(mg => mg.name) || [],
      instructions: exercise.instructions || '',
      mediaUrl: exercise.mediaUrl || exercise.image || '',
      type: exercise.type || 'weight',
      description: exercise.description || '',
    });
    setEditDialogOpen(true);
  };

  const openProgressDialog = (exercise: Exercise) => {
    setSelectedExercise(exercise);
    setProgressDialogOpen(true);
  }

  const handleDeleteExercise = async () => {
    if (!selectedExercise) return;
    setIsSubmitting(true);

    try {
      await deleteDoc('exercises', selectedExercise.id);
      toast({ title: "Sukces!", description: "Ćwiczenie zostało usunięte." });
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

  const muscleGroupOptions = Object.values(MuscleGroupName).map(name => ({ label: name, value: name }));

  const ExerciseFormContent = ({ isEditMode }: { isEditMode: boolean }) => (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 py-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nazwa</FormLabel>
              <FormControl><Input {...field} disabled={isSubmitting} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="mainMuscleGroups"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Główne grupy mięśniowe</FormLabel>
              <FormControl>
                <MultiSelect
                  selected={field.value}
                  options={muscleGroupOptions}
                  onChange={field.onChange}
                  placeholder="Wybierz grupy mięśniowe"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="secondaryMuscleGroups"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Poboczne grupy mięśniowe</FormLabel>
              <FormControl>
                <MultiSelect
                  selected={field.value || []}
                  options={muscleGroupOptions}
                  onChange={field.onChange}
                  placeholder="Wybierz poboczne grupy"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Typ ćwiczenia</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSubmitting}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Wybierz typ ćwiczenia" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="weight">Na ciężar</SelectItem>
                  <SelectItem value="duration">Na czas</SelectItem>
                  <SelectItem value="reps">Na powtórzenia</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Opis (opcjonalnie)</FormLabel>
              <FormControl><Textarea {...field} disabled={isSubmitting} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
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
    </Form>
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
            <Select value={selectedMuscleGroup} onValueChange={setSelectedMuscleGroup}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Partia mięśniowa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszystkie</SelectItem>
                {Object.values(MuscleGroupName).map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                <div className="relative h-48 w-full bg-muted flex items-center justify-center">
                  {(exercise.mediaUrl || exercise.image) ? (
                    <Image
                      src={exercise.mediaUrl || exercise.image || ''}
                      alt={exercise.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                  ) : (
                    <Dumbbell className="h-12 w-12 text-muted-foreground opacity-20" />
                  )}
                </div>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="font-headline line-clamp-1">{exercise.name}</CardTitle>
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
                  <div className="flex flex-wrap gap-1 pt-1">
                    {exercise.mainMuscleGroups?.map((mg, idx) => (
                      <Badge key={idx} variant="secondary" className="text-[10px]">{mg.name}</Badge>
                    ))}
                    {!exercise.mainMuscleGroups?.length && exercise.muscleGroup && (
                      <Badge variant="secondary" className="text-[10px]">{exercise.muscleGroup}</Badge>
                    )}
                    {exercise.ownerId === user?.uid && <Badge variant="outline" className="text-[10px]">Własne</Badge>}
                  </div>
                </CardHeader>
                <CardContent className="flex-grow">
                  <CardDescription className="line-clamp-2">{exercise.description || exercise.instructions}</CardDescription>
                </CardContent>
                <CardFooter>
                  <Button variant="ghost" className="w-full" onClick={() => openProgressDialog(exercise)}>
                    <ChartIcon className="mr-2 h-4 w-4" />
                    Zobacz Postęp
                  </Button>
                </CardFooter>
              </Card>
            ))
          ) : (
            <Card className="sm:col-span-2 lg:col-span-3 xl:col-span-4 flex flex-col items-center justify-center border-dashed py-20">
              <CardContent className="text-center">
                <Dumbbell className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-headline text-xl font-semibold mb-2">Brak ćwiczeń</h3>
                <p className="text-muted-foreground mb-4">Nie znaleziono żadnych ćwiczeń.</p>
                <p className="text-muted-foreground mb-4">Nie znaleziono żadnych ćwiczeń.</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={(isOpen) => { setEditDialogOpen(isOpen); if (!isOpen) setSelectedExercise(null); }}>
          <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-headline">Edytuj Ćwiczenie</DialogTitle>
              <DialogDescription>Zaktualizuj szczegóły ćwiczenia.</DialogDescription>
            </DialogHeader>
            <ExerciseFormContent isEditMode={true} />
          </DialogContent>
        </Dialog>

        {/* Progress Dialog */}
        <ProgressDialog
          exercise={selectedExercise}
          userId={user?.uid}
          open={isProgressDialogOpen}
          onOpenChange={setProgressDialogOpen}
        />

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
    </AlertDialog >
  );
}
