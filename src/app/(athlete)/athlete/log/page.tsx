'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useForm, useFieldArray, FormProvider, useFormContext } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { PlusCircle, Trash2, Save, Loader2, Dumbbell, Upload, Search, ArrowLeft, ArrowRight, Play, Calendar, ChevronRight, Clock, History, LayoutList, RotateCcw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import type { WorkoutPlan, Exercise, WorkoutLog, WorkoutDay, UserProfile } from '@/lib/types';
import { useCollection, useUser, useDoc } from '@/lib/db-hooks';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, SheetFooter, SheetClose } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';


// --- SCHEMA DEFINITIONS ---
const setSchema = z.object({
  reps: z.coerce.number().min(0, 'Powtórzenia muszą być dodatnie.').optional(),
  weight: z.coerce.number().min(0, 'Ciężar musi być dodatni.').optional(),
  duration: z.coerce.number().min(0, 'Czas musi być dodatni.').optional(),
});

const exerciseLogSchema = z.object({
  exerciseId: z.string().min(1, 'Proszę wybrać ćwiczenie.'),
  sets: z.array(setSchema).optional(),
  duration: z.coerce.number().min(0, "Czas trwania musi być dodatni.").optional(),
});

const logSchema = z.object({
  workoutName: z.string().min(1, 'Nazwa treningu jest wymagana.'),
  exercises: z.array(exerciseLogSchema),
});

type LogFormValues = z.infer<typeof logSchema>;


// --- ADD EXERCISE SHEET ---
function AddExerciseSheet({ allExercises, onAddExercise }: { allExercises: Exercise[] | null; onAddExercise: (exerciseId: string) => void }) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredExercises = useMemo(() => {
    if (!allExercises) return [];
    return allExercises.filter(ex =>
      ex.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ex.muscleGroup.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [allExercises, searchTerm]);

  const handleSelectExercise = (exerciseId: string) => {
    onAddExercise(exerciseId);
    setOpen(false);
    setSearchTerm('');
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="h-12 w-12 rounded-full shadow-lg bg-primary text-primary-foreground hover:bg-primary/90">
          <PlusCircle className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[85vh]">
        <SheetHeader>
          <SheetTitle>Wybierz Ćwiczenie</SheetTitle>
          <SheetDescription>Znajdź i dodaj ćwiczenie do swojego treningu.</SheetDescription>
        </SheetHeader>
        <div className="py-4">
          <div className="flex items-center space-x-2 mb-4">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Szukaj ćwiczenia..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
          </div>
          <ScrollArea className="h-[60vh]">
            <div className="space-y-2 pr-4">
              {filteredExercises?.map(ex => (
                <div
                  key={ex.id}
                  onClick={() => handleSelectExercise(ex.id)}
                  className="flex justify-between items-center p-3 rounded-md border cursor-pointer hover:bg-secondary"
                >
                  <div>
                    <p className="font-semibold">{ex.name}</p>
                    <p className="text-sm text-muted-foreground">{ex.muscleGroup}</p>
                  </div>
                  <Button variant="ghost" size="icon"><PlusCircle className="h-5 w-5 text-primary" /></Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// --- WORKOUT BUILDER VIEW ---
// Allows the user to prepare the workout before starting the timer
function WorkoutBuilderView({ initialData, onStart, onCancel, allExercises, isLoadingExercises }: { initialData: LogFormValues; onStart: (data: LogFormValues) => void; onCancel: () => void; allExercises: Exercise[] | null; isLoadingExercises: boolean }) {
  const form = useForm<LogFormValues>({
    resolver: zodResolver(logSchema),
    defaultValues: initialData,
  });

  const { fields, append, remove, move } = useFieldArray({
    control: form.control,
    name: "exercises",
  });

  const handleAddExercise = (exerciseId: string) => {
    const exerciseDef = allExercises?.find(e => e.id === exerciseId);
    // Add default sets based on exercise type
    let defaultSets = [];
    if (exerciseDef?.type === 'duration') {
      defaultSets = [{ duration: 0 }];
    } else if (exerciseDef?.type === 'weight') {
      defaultSets = [{ reps: 0, weight: 0 }];
    } else {
      defaultSets = [{ reps: 0 }];
    }

    append({ exerciseId, sets: defaultSets, duration: 0 });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] md:h-auto relative">
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" onClick={onCancel} className="p-0 hover:bg-transparent">
          <ArrowLeft className="mr-2 h-4 w-4" /> Wróć
        </Button>
        <h2 className="text-xl font-bold">Przygotuj Trening</h2>
        <div className="w-10"></div> {/* Spacer */}
      </div>

      <FormProvider {...form}>
        <form onSubmit={form.handleSubmit(onStart)} className="flex flex-col h-full space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Szczegóły</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="workoutName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nazwa Treningu</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="np. Poniedziałkowa Klata" className="text-lg font-semibold" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex-1 overflow-y-auto pb-24 scrollbar-hide space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-lg">Lista Ćwiczeń</h3>
              <span className="text-sm text-muted-foreground">{fields.length} ćwiczeń</span>
            </div>

            {fields.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 rounded-lg border-2 border-dashed p-8 text-center bg-secondary/20">
                <Dumbbell className="mx-auto h-10 w-10 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Brak ćwiczeń. Dodaj pierwsze ćwiczenie!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {fields.map((field, index) => {
                  const exerciseDetails = allExercises?.find(ex => ex.id === field.exerciseId);
                  return (
                    <Card key={field.id} className="relative overflow-hidden">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-semibold">{exerciseDetails?.name || (isLoadingExercises ? 'Ładowanie...' : 'Nieznane ćwiczenie')}</p>
                            <p className="text-xs text-muted-foreground">{exerciseDetails?.muscleGroup}</p>
                          </div>                 </div>
                        <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t p-4 flex justify-between items-center z-50 md:absolute md:rounded-b-lg gap-4">
            <div className="w-full">
              <AddExerciseSheet allExercises={allExercises} onAddExercise={handleAddExercise} />
            </div>
            <Button type="submit" className="w-full" size="lg">
              <Play className="mr-2 h-4 w-4" /> Rozpocznij Trening
            </Button>
          </div>
        </form>
      </FormProvider>
    </div>
  );
}


// --- ACTIVE WORKOUT VIEW ---
function ActiveWorkoutView({ initialWorkout, allExercises, onFinishWorkout, isLoadingExercises }: { initialWorkout: LogFormValues; allExercises: Exercise[] | null; onFinishWorkout: () => void; isLoadingExercises: boolean }) {
  const [startTime] = useState(new Date());
  const [workoutLogId, setWorkoutLogId] = useState<string | null>(null);
  const [isFinished, setIsFinished] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user } = useUser();
  const router = useRouter();

  const [activeExerciseIndex, setActiveExerciseIndex] = useState(0);
  const [newExerciseId, setNewExerciseId] = useState<string | null>(null);

  const form = useForm<LogFormValues>({
    resolver: zodResolver(logSchema),
    defaultValues: initialWorkout,
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "exercises",
  });

  useEffect(() => {
    if (fields.length > 0 && activeExerciseIndex >= fields.length) {
      setActiveExerciseIndex(fields.length - 1);
    }
  }, [fields.length, activeExerciseIndex]);

  // Effect to create the workout document on start
  useEffect(() => {
    if (!user || workoutLogId) return;

    const createInitialWorkoutLog = async () => {
      const exercisesWithNames = initialWorkout.exercises.map(exercise => {
        const exerciseDetails = allExercises?.find(ex => ex.id === exercise.exerciseId);
        return {
          exerciseId: exercise.exerciseId,
          exerciseName: exerciseDetails?.name || 'Unknown Exercise',
          sets: exercise.sets || [],
          duration: exercise.duration,
        };
      });

      const initialLogData = {
        workoutName: initialWorkout.workoutName,
        exercises: exercisesWithNames,
        status: 'in-progress',
        startTime: startTime,
        athleteId: user.uid,
      };

      try {
        const response = await fetch('/api/db/workoutLogs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(initialLogData),
        });

        if (!response.ok) {
          throw new Error('Failed to create workout log');
        }

        const result = await response.json();
        setWorkoutLogId(result.data.id);
      } catch (error) {
        console.error('Error creating workout log:', error);
        toast({ title: 'Błąd', description: 'Nie udało się rozpocząć sesji treningowej.', variant: 'destructive' });
        onFinishWorkout();
      }
    };

    createInitialWorkoutLog();
  }, [user, initialWorkout, onFinishWorkout, workoutLogId, startTime, toast, allExercises]);


  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleAddExercise = (exerciseId: string) => {
    const newExercise = { exerciseId, sets: [], duration: 0 };
    append(newExercise);
    setActiveExerciseIndex(fields.length); // Switch to the newly added exercise

    setNewExerciseId(exerciseId);
    setTimeout(() => setNewExerciseId(null), 300);
  };

  const handleRemoveExercise = (index: number) => {
    remove(index);
    if (index === activeExerciseIndex) {
      if (index > 0) {
        setActiveExerciseIndex(index - 1);
      } else {
        setActiveExerciseIndex(0);
      }
    } else if (index < activeExerciseIndex) {
      setActiveExerciseIndex(activeExerciseIndex - 1);
    }
  }


  const handleSaveWorkout = async (data: LogFormValues) => {
    if (!user || !workoutLogId) return;

    setIsSaving(true);

    let photoURL: string | undefined = undefined;
    if (photoFile) {
      try {
        const formData = new FormData();
        formData.append('file', photoFile);
        formData.append('userId', user.uid);

        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (uploadResponse.ok) {
          const uploadResult = await uploadResponse.json();
          photoURL = uploadResult.url;
        }
      } catch (error) {
        console.error("Error uploading photo: ", error);
        toast({
          title: 'Błąd przesyłania zdjęcia',
          description: 'Nie udało się przesłać zdjęcia. Trening zostanie zapisany bez niego.',
          variant: 'destructive',
        });
      }
    }

    const endTime = new Date();
    const duration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));

    const exercisesWithNames = data.exercises.map(exercise => {
      const exerciseDetails = allExercises?.find(ex => ex.id === exercise.exerciseId);
      return {
        exerciseId: exercise.exerciseId,
        exerciseName: exerciseDetails?.name || 'Unknown Exercise',
        sets: exercise.sets || [],
        duration: exercise.duration,
      };
    });

    const finalLogData = {
      workoutName: data.workoutName,
      exercises: data.exercises,
      duration: duration,
      endTime: endTime,
      status: 'completed',
      ...(photoURL && { photoURL }),
    };

    try {
      const response = await fetch(`/api/db/workoutLogs/${workoutLogId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalLogData),
      });

      if (!response.ok) {
        throw new Error('Failed to save workout');
      }

      toast({
        title: 'Trening Zapisany!',
        description: `${data.workoutName} został zapisany w Twojej historii.`,
      });
      router.push(`/athlete/history/${workoutLogId}`);
    } catch (error) {
      console.error('Error saving workout:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się zapisać treningu.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isFinished) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-center text-2xl text-primary">Zakończyć Trening?</CardTitle>
          <CardDescription className="text-center">Przejrzyj podsumowanie i zapisz swoją sesję.</CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p><span className="font-semibold">Nazwa:</span> {form.getValues('workoutName')}</p>
          <p><span className="font-semibold">Ćwiczenia:</span> {form.getValues('exercises').length}</p>
          <p><span className="font-semibold">Czas trwania:</span> {Math.round((new Date().getTime() - startTime.getTime()) / (1000 * 60))} minut</p>

          <div className="pt-4 space-y-4">
            {photoPreview && (
              <div className="relative w-full aspect-video rounded-md overflow-hidden mb-2">
                <Image src={photoPreview} alt="Podgląd zdjęcia" layout="fill" objectFit="cover" />
              </div>
            )}
            <Button variant="outline" className="w-full" onClick={() => photoInputRef.current?.click()}>
              <Upload className="mr-2 h-4 w-4" />
              {photoFile ? 'Zmień zdjęcie' : 'Dodaj zdjęcie'}
            </Button>
            <input type="file" ref={photoInputRef} accept="image/*" onChange={handlePhotoChange} className="hidden" />
          </div>

        </CardContent>
        <CardFooter className="flex-col gap-2">
          <Button onClick={form.handleSubmit(handleSaveWorkout)} className="w-full" disabled={isSaving}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Zapisz i Zakończ
          </Button>
          <Button onClick={() => setIsFinished(false)} variant="ghost" className="w-full">Wróć do treningu</Button>
        </CardFooter>
      </Card>
    )
  }

  const currentExercise = fields[activeExerciseIndex];
  const selectedExerciseId = form.watch(`exercises.${activeExerciseIndex}.exerciseId`);
  const exerciseDetails = allExercises?.find(ex => ex.id === selectedExerciseId);

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] md:h-auto relative">
      <FormProvider {...form}>
        <form onSubmit={form.handleSubmit(() => setIsFinished(true))} className="flex flex-col h-full">

          {/* Header Section */}
          <div className="flex justify-between items-center mb-4 px-1">
            <div className="flex-1">
              <FormField
                control={form.control}
                name="workoutName"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input {...field} className="text-xl font-headline font-bold border-0 shadow-none p-0 focus-visible:ring-0 bg-transparent" />
                    </FormControl>
                  </FormItem>
                )}
              />
              <p className="text-xs text-muted-foreground">{format(new Date(), "EEEE, d MMMM", { locale: pl })}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center text-sm font-mono bg-secondary px-2 py-1 rounded">
                <Clock className="h-3 w-3 mr-1" />
                {Math.round((new Date().getTime() - startTime.getTime()) / (1000 * 60))}m
              </div>
              <Button type="submit" size="sm" disabled={fields.length === 0}>
                Zakończ
              </Button>
            </div>
          </div>

          {/* Main Content - Scrollable */}
          <div className="flex-1 overflow-y-auto pb-24 px-1 scrollbar-hide">
            {currentExercise ? (
              <div className={newExerciseId === currentExercise.exerciseId ? 'animate-slide-in-up' : ''}>
                <ExerciseCard
                  key={currentExercise.id}
                  index={activeExerciseIndex}
                  exerciseDetails={exerciseDetails}
                  onRemoveExercise={() => handleRemoveExercise(activeExerciseIndex)}
                  isLoadingExercises={isLoadingExercises}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 rounded-lg border-2 border-dashed p-8 text-center">
                <Dumbbell className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-xl font-semibold">Rozpocznij trening</h3>
                <p className="mt-1 text-sm text-muted-foreground mb-4">Dodaj pierwsze ćwiczenie, aby zacząć.</p>
              </div>
            )}

            {/* Spacer for bottom bar */}
            <div className="h-20"></div>
          </div>

          {/* Bottom Navigation Bar */}
          <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t p-4 flex justify-between items-center z-50 md:absolute md:rounded-b-lg">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={activeExerciseIndex === 0 || fields.length === 0}
              onClick={() => setActiveExerciseIndex(prev => prev - 1)}
            >
              <ArrowLeft className="h-6 w-6" />
            </Button>

            <div className="-mt-8">
              <AddExerciseSheet
                allExercises={allExercises}
                onAddExercise={handleAddExercise}
              />
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={activeExerciseIndex === fields.length - 1 || fields.length === 0}
              onClick={() => setActiveExerciseIndex(prev => prev + 1)}
            >
              <ArrowRight className="h-6 w-6" />
            </Button>
          </div>

        </form>
      </FormProvider>
    </div>
  )
}

function ExerciseCard({ index, exerciseDetails, onRemoveExercise, isLoadingExercises }: { index: number, exerciseDetails: Exercise | undefined, onRemoveExercise: () => void, isLoadingExercises: boolean }) {
  const { control, watch } = useFormContext<LogFormValues>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: `exercises.${index}.sets`
  });
  const [newSetId, setNewSetId] = useState<string | null>(null);

  const handleAddSet = () => {
    if (fields.length > 0) {
      const lastSetIndex = fields.length - 1;
      const lastReps = watch(`exercises.${index}.sets.${lastSetIndex}.reps`);
      const lastWeight = watch(`exercises.${index}.sets.${lastSetIndex}.weight`);
      const lastDuration = watch(`exercises.${index}.sets.${lastSetIndex}.duration`);
      append({ reps: lastReps, weight: lastWeight, duration: lastDuration });
    } else {
      if (exerciseDetails?.type === 'duration') {
        append({ duration: 0 });
      } else if (exerciseDetails?.type === 'weight') {
        append({ reps: 0, weight: 0 });
      } else {
        append({ reps: 0 });
      }
    }
  };

  return (
    <Card className="bg-secondary/50">
      <CardHeader className="flex-row items-center justify-between pb-4">
        <CardTitle className="text-lg font-semibold">{exerciseDetails?.name || (isLoadingExercises ? "Ładowanie..." : "Wybierz ćwiczenie")}</CardTitle>
        <Button variant="ghost" size="icon" onClick={onRemoveExercise}><Trash2 className="h-4 w-4 text-destructive" /></Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="grid grid-cols-12 gap-2 items-center">
            <Label className="col-span-1 text-sm text-muted-foreground"></Label>
            {exerciseDetails?.type === 'duration' ? (
              <Label className="col-span-5 text-sm text-muted-foreground">Czas (s)</Label>
            ) : (
              <Label className="col-span-5 text-sm text-muted-foreground">Powtórzenia</Label>
            )}
            {exerciseDetails?.type === 'weight' && <Label className="col-span-5 text-sm text-muted-foreground">Ciężar (kg)</Label>}
          </div>
          {fields.map((setField, setIndex) => (
            <div
              key={setField.id}
              className={`grid grid-cols-12 gap-2 items-center ${newSetId === setField.id ? 'animate-fade-in' : ''
                }`}
            >
              <p className="font-medium text-sm text-center col-span-1">{setIndex + 1}</p>

              {exerciseDetails?.type === 'duration' ? (
                <FormField
                  control={control}
                  name={`exercises.${index}.sets.${setIndex}.duration`}
                  render={({ field }) => (
                    <FormItem className="col-span-5">
                      <FormControl><Input type="number" placeholder="0" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <FormField
                  control={control}
                  name={`exercises.${index}.sets.${setIndex}.reps`}
                  render={({ field }) => (
                    <FormItem className="col-span-5">
                      <FormControl><Input type="number" placeholder="0" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {exerciseDetails?.type === 'weight' && (
                <FormField
                  control={control}
                  name={`exercises.${index}.sets.${setIndex}.weight`}
                  render={({ field }) => (
                    <FormItem className="col-span-5">
                      <FormControl><Input type="number" step="0.5" placeholder="0" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <Button type="button" variant="ghost" size="icon" onClick={() => remove(setIndex)} className="col-span-1">
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" className="w-full" onClick={handleAddSet}>
            <PlusCircle className="mr-2 h-4 w-4" /> Dodaj serię
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// --- SELECTION VIEW COMPONENT ---
function WorkoutSelectionView({ onStartBuilder, allExercises }: { onStartBuilder: (data: LogFormValues) => void; allExercises: Exercise[] | null }) {
  const { user } = useUser();

  // Fetch plans assigned to the athlete
  const { data: assignedPlans, isLoading: assignedPlansLoading } = useCollection<WorkoutPlan>(
    user?.uid ? 'workoutPlans' : null,
    user?.uid ? { assignedAthleteIds: { $in: [user.uid] } } : undefined
  );

  // Fetch plans created by the athlete (if they're also a trainer)
  const { data: myPlans, isLoading: myPlansLoading } = useCollection<WorkoutPlan>(
    user?.uid ? 'workoutPlans' : null,
    user?.uid ? { trainerId: user.uid } : undefined
  );

  // Fetch history logs
  const { data: historyLogs, isLoading: historyLoading } = useCollection<WorkoutLog>(
    user?.uid ? 'workoutLogs' : null,
    user?.uid ? { athleteId: user.uid, status: 'completed' } : undefined,
    { sort: { endTime: -1 }, limit: 10 }
  );

  const workoutPlans = useMemo(() => {
    const plansMap = new Map<string, WorkoutPlan>();
    assignedPlans?.forEach(plan => plansMap.set(plan.id, plan));
    myPlans?.forEach(plan => plansMap.set(plan.id, plan));
    return Array.from(plansMap.values());
  }, [assignedPlans, myPlans]);

  const handleStartPlanDay = (plan: WorkoutPlan, dayIndex: number) => {
    const workoutDay = plan.workoutDays[dayIndex];
    const workoutData: LogFormValues = {
      workoutName: workoutDay.dayName,
      exercises: workoutDay.exercises.map(ex => ({
        exerciseId: ex.exerciseId,
        sets: ex.sets?.map(s => ({ reps: s.reps, weight: s.weight, duration: s.duration })) || [],
        duration: ex.duration || 0,
      })),
    };
    onStartBuilder(workoutData);
  };

  const handleRepeatWorkout = (log: WorkoutLog) => {
    const workoutData: LogFormValues = {
      workoutName: log.workoutName,
      exercises: log.exercises.map(ex => ({
        exerciseId: ex.exerciseId,
        sets: ex.sets.map(s => ({ reps: s.reps, weight: s.weight, duration: s.duration })),
        duration: ex.duration || 0
      }))
    };
    onStartBuilder(workoutData);
  }

  const handleStartEmpty = () => {
    onStartBuilder({
      workoutName: `Trening ${format(new Date(), 'd.MM')}`,
      exercises: []
    });
  }

  const isLoading = assignedPlansLoading || myPlansLoading || historyLoading;

  return (
    <div className="space-y-6">
      <Tabs defaultValue="quick" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="quick">Start</TabsTrigger>
          <TabsTrigger value="plans">Plany</TabsTrigger>
          <TabsTrigger value="history">Historia</TabsTrigger>
        </TabsList>

        <TabsContent value="quick" className="space-y-4 mt-4">
          <Card
            className="cursor-pointer hover:bg-secondary/50 transition-colors border-dashed"
            onClick={handleStartEmpty}
          >
            <CardContent className="flex items-center p-6 gap-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <PlusCircle className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Pusty Trening</h3>
                <p className="text-sm text-muted-foreground">Stwórz trening od zera</p>
              </div>
              <ChevronRight className="ml-auto h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="plans" className="space-y-4 mt-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2].map(i => <div key={i} className="h-24 rounded-lg bg-secondary animate-pulse" />)}
            </div>
          ) : workoutPlans.length === 0 ? (
            <div className="text-center p-8 border rounded-lg bg-secondary/20">
              <p className="text-muted-foreground">Nie masz jeszcze żadnych planów.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {workoutPlans.map(plan => (
                <Sheet key={plan.id}>
                  <SheetTrigger asChild>
                    <Card className="cursor-pointer hover:bg-secondary/50 transition-colors">
                      <CardContent className="flex items-center p-6 gap-4">
                        <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                          <Calendar className="h-6 w-6 text-blue-500" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">{plan.name}</h3>
                          <p className="text-sm text-muted-foreground">{plan.workoutDays.length} dni treningowych</p>
                        </div>
                        <ChevronRight className="ml-auto h-5 w-5 text-muted-foreground" />
                      </CardContent>
                    </Card>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="h-[85vh]">
                    <SheetHeader className="text-left mb-4">
                      <SheetTitle>{plan.name}</SheetTitle>
                      <SheetDescription>Wybierz dzień treningowy, aby rozpocząć.</SheetDescription>
                    </SheetHeader>
                    <ScrollArea className="h-full pb-20">
                      <div className="space-y-4">
                        {plan.workoutDays.map((day, index) => (
                          <Card key={index} className="overflow-hidden">
                            <CardHeader className="pb-2">
                              <CardTitle className="text-base flex justify-between items-center">
                                {day.dayName}
                                <Button size="sm" onClick={() => handleStartPlanDay(plan, index)}>
                                  Wybierz <Play className="ml-2 h-3 w-3" />
                                </Button>
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="pb-3">
                              <div className="space-y-1">
                                {day.exercises.map((ex, i) => {
                                  const exDetails = allExercises?.find(e => e.id === ex.exerciseId);
                                  return (
                                    <div key={i} className="flex flex-col gap-1 py-2 border-b last:border-0">
                                      <div className="flex justify-between items-center text-sm">
                                        <span className="font-medium">{i + 1}. {exDetails?.name || 'Ćwiczenie'}</span>
                                        <span className="text-xs text-muted-foreground">{ex.sets?.length || 0} serii</span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </ScrollArea>
                  </SheetContent>
                </Sheet>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4 mt-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2].map(i => <div key={i} className="h-24 rounded-lg bg-secondary animate-pulse" />)}
            </div>
          ) : !historyLogs || historyLogs.length === 0 ? (
            <div className="text-center p-8 border rounded-lg bg-secondary/20">
              <p className="text-muted-foreground">Brak historii treningów.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {historyLogs.map(log => (
                <Card key={log.id} className="cursor-pointer hover:bg-secondary/50 transition-colors" onClick={() => handleRepeatWorkout(log)}>
                  <CardContent className="flex items-center p-4 gap-4">
                    <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                      <RotateCcw className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{log.workoutName}</h3>
                      <p className="text-xs text-muted-foreground">{format(new Date(log.endTime), 'd MMMM yyyy', { locale: pl })}</p>
                    </div>
                    <Button size="sm" variant="ghost">Powtórz</Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// --- MAIN PAGE COMPONENT ---
export default function LogWorkoutPage() {
  const [view, setView] = useState<'selection' | 'builder' | 'active'>('selection');
  const [builderData, setBuilderData] = useState<LogFormValues | null>(null);
  const { user } = useUser();
  const { data: userProfile } = useDoc<UserProfile>('users', user?.uid || null);

  const ownerIds = useMemo(() => {
    const ids = ['public'];
    if (user?.uid) ids.push(user.uid);
    if (userProfile?.trainerId) ids.push(userProfile.trainerId);
    return ids;
  }, [user?.uid, userProfile?.trainerId]);

  // Fetch exercises (public, user's own, and trainer's)
  const { data: allExercises, isLoading: exercisesLoading } = useCollection<Exercise>(
    'exercises',
    user?.uid ? { ownerId: { $in: ownerIds } } : undefined
  );

  const handleStartBuilder = (data: LogFormValues) => {
    setBuilderData(data);
    setView('builder');
  };

  const handleStartActive = (data: LogFormValues) => {
    setBuilderData(data);
    setView('active');
  }

  const handleCancelBuilder = () => {
    setBuilderData(null);
    setView('selection');
  }

  const handleFinishWorkout = () => {
    setBuilderData(null);
    setView('selection');
  }

  if (view === 'active' && builderData) {
    return (
      <div className="container mx-auto p-4 md:p-8 flex justify-center">
        <div className="w-full max-w-lg">
          <ActiveWorkoutView
            initialWorkout={builderData}
            onFinishWorkout={handleFinishWorkout}
            allExercises={allExercises}
            isLoadingExercises={exercisesLoading}
          />
        </div>
      </div>
    )
  }

  if (view === 'builder' && builderData) {
    return (
      <div className="container mx-auto p-4 md:p-8 flex justify-center">
        <div className="w-full max-w-lg">
          <WorkoutBuilderView
            initialData={builderData}
            onStart={handleStartActive}
            onCancel={handleCancelBuilder}
            allExercises={allExercises}
            isLoadingExercises={exercisesLoading}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <h1 className="mb-6 font-headline text-3xl font-bold">Zapisz Trening</h1>
      <WorkoutSelectionView
        onStartBuilder={handleStartBuilder}
        allExercises={allExercises}
      />
    </div>
  );
}
