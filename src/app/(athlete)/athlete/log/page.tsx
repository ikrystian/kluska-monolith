
'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useForm, useFieldArray, FormProvider, useFormContext } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { PlusCircle, Trash2, Save, Loader2, Dumbbell, Upload, Search, ArrowLeft, ArrowRight, Play, Calendar, ChevronRight, Clock } from 'lucide-react';
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
import type { WorkoutPlan, Exercise, WorkoutLog, WorkoutDay } from '@/lib/types';
import { useCollection, useUser } from '@/lib/db-hooks';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, SheetFooter, SheetClose } from '@/components/ui/sheet';

// --- SCHEMA DEFINITIONS ---
const setSchema = z.object({
  reps: z.coerce.number().min(0, 'Powtórzenia muszą być dodatnie.'),
  weight: z.coerce.number().min(0, 'Ciężar musi być dodatni.').optional(),
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


// --- ADD EXERCISE DIALOG ---
// --- ADD EXERCISE SHEET ---
function AddExerciseSheet({ allExercises, onAddExercise, planExerciseIds }: { allExercises: Exercise[] | null; onAddExercise: (exerciseId: string) => void; planExerciseIds?: string[] }) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredExercises = useMemo(() => {
    if (!allExercises) return [];
    let exercises = allExercises;

    // If planExerciseIds is provided, filter to only those exercises
    if (planExerciseIds && planExerciseIds.length > 0) {
      exercises = exercises.filter(ex => planExerciseIds.includes(ex.id));
    }

    return exercises.filter(ex =>
      ex.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ex.muscleGroup.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [allExercises, searchTerm, planExerciseIds]);

  const handleSelectExercise = (exerciseId: string) => {
    onAddExercise(exerciseId);
    setOpen(false); // Close the sheet after adding
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


// --- ACTIVE WORKOUT VIEW ---
function ActiveWorkoutView({ initialWorkout, allExercises, onFinishWorkout, planExerciseIds }: { initialWorkout: LogFormValues; allExercises: Exercise[] | null; onFinishWorkout: () => void; planExerciseIds?: string[] }) {
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
    // If we're on a non-existent index (e.g., after deleting the last item), go to the new last item.
    if (fields.length > 0 && activeExerciseIndex >= fields.length) {
      setActiveExerciseIndex(fields.length - 1);
    }
  }, [fields.length, activeExerciseIndex]);

  // Effect to create the workout document on start
  useEffect(() => {
    if (!user || workoutLogId) return;

    const createInitialWorkoutLog = async () => {
      // Map exercises to include exerciseName
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
        onFinishWorkout(); // Go back if we can't create the log
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

    // Trigger animation for new exercise
    setNewExerciseId(exerciseId);
    setTimeout(() => setNewExerciseId(null), 300);
  };

  const handleRemoveExercise = (index: number) => {
    remove(index);
    // If we remove the current exercise, decide where to navigate
    if (index === activeExerciseIndex) {
      if (index > 0) {
        setActiveExerciseIndex(index - 1);
      } else {
        setActiveExerciseIndex(0);
      }
    } else if (index < activeExerciseIndex) {
      // If we remove an exercise before the current one, decrement the active index
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

    // Map exercises to include exerciseName
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
          <Button onClick={onFinishWorkout} variant="destructive" className="w-full">Anuluj Trening</Button>
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
                planExerciseIds={planExerciseIds}
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

function ExerciseCard({ index, exerciseDetails, onRemoveExercise }: { index: number, exerciseDetails: Exercise | undefined, onRemoveExercise: () => void }) {
  const { control, watch } = useFormContext<LogFormValues>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: `exercises.${index}.sets`
  });
  const [newSetId, setNewSetId] = useState<string | null>(null);

  const handleAddSet = () => {
    // Clone values from the last set if it exists, otherwise use defaults
    if (fields.length > 0) {
      const lastSetIndex = fields.length - 1;
      const lastReps = watch(`exercises.${index}.sets.${lastSetIndex}.reps`);
      const lastWeight = watch(`exercises.${index}.sets.${lastSetIndex}.weight`);
      append({ reps: lastReps, weight: lastWeight });
    } else {
      append({ reps: 0, weight: 0 });
    }
  };

  return (
    <Card className="bg-secondary/50">
      <CardHeader className="flex-row items-center justify-between pb-4">
        <CardTitle className="text-lg font-semibold">{exerciseDetails?.name || "Wybierz ćwiczenie"}</CardTitle>
        <Button variant="ghost" size="icon" onClick={onRemoveExercise}><Trash2 className="h-4 w-4 text-destructive" /></Button>
      </CardHeader>
      <CardContent>
        {exerciseDetails?.type === 'duration' ? (
          <FormField
            control={control}
            name={`exercises.${index}.duration`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Czas trwania (sekundy)</FormLabel>
                <FormControl><Input type="number" placeholder="np. 60" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-12 gap-2 items-center">
              <Label className="col-span-1 text-sm text-muted-foreground"></Label>
              <Label className="col-span-5 text-sm text-muted-foreground">Powtórzenia</Label>
              {exerciseDetails?.type === 'weight' && <Label className="col-span-5 text-sm text-muted-foreground">Ciężar (kg)</Label>}
            </div>
            {fields.map((setField, setIndex) => (
              <div
                key={setField.id}
                className={`grid grid-cols-12 gap-2 items-center ${newSetId === setField.id ? 'animate-fade-in' : ''
                  }`}
              >
                <p className="font-medium text-sm text-center col-span-1">{setIndex + 1}</p>
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
        )}
      </CardContent>
    </Card>
  )
}

// --- FROM TEMPLATE COMPONENT ---
// --- SELECTION VIEW COMPONENT ---
function WorkoutSelectionView({ onStartEmpty, onStartFromPlan, allExercises }: { onStartEmpty: (name: string) => void; onStartFromPlan: (template: LogFormValues, exerciseIds?: string[]) => void; allExercises: Exercise[] | null }) {
  const { user } = useUser();
  const [selectedPlan, setSelectedPlan] = useState<WorkoutPlan | null>(null);

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
        sets: ex.sets?.map(s => ({ reps: s.reps, weight: s.weight })) || [],
        duration: ex.duration || 0,
      })),
    };
    const exerciseIds = workoutDay.exercises.map(ex => ex.exerciseId);
    onStartFromPlan(workoutData, exerciseIds);
  };

  const isLoading = assignedPlansLoading || myPlansLoading;

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-lg font-semibold mb-3">Szybki Start</h2>
        <Card
          className="cursor-pointer hover:bg-secondary/50 transition-colors border-dashed"
          onClick={() => onStartEmpty(`Trening ${format(new Date(), 'd.MM')}`)}
        >
          <CardContent className="flex items-center p-6 gap-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <PlusCircle className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Pusty Trening</h3>
              <p className="text-sm text-muted-foreground">Rozpocznij bez planu i dodawaj ćwiczenia</p>
            </div>
            <ChevronRight className="ml-auto h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Twoje Plany</h2>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="h-24 rounded-lg bg-secondary animate-pulse" />
            ))}
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
                                Rozpocznij <Play className="ml-2 h-3 w-3" />
                              </Button>
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="pb-3">
                            <div className="space-y-1">
                              {day.exercises.map((ex, i) => {
                                const exDetails = allExercises?.find(e => e.id === ex.exerciseId);
                                return (
                                  <div key={i} className="text-sm text-muted-foreground flex justify-between">
                                    <span>{i + 1}. {exDetails?.name || 'Ćwiczenie'}</span>
                                    <span>{ex.sets?.length || 0} serii</span>
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
      </section>
    </div>
  );
}

// --- MAIN PAGE COMPONENT ---
export default function LogWorkoutPage() {
  const [activeWorkout, setActiveWorkout] = useState<LogFormValues | null>(null);
  const [planExerciseIds, setPlanExerciseIds] = useState<string[] | undefined>(undefined);
  const { user } = useUser();

  // Fetch exercises (public and user's own)
  const { data: allExercises } = useCollection<Exercise>(
    'exercises',
    user?.uid ? { ownerId: { $in: ['public', user.uid] } } : undefined
  );

  const handleStartWorkout = (data: LogFormValues, exerciseIds?: string[]) => {
    setActiveWorkout(data);
    setPlanExerciseIds(exerciseIds);
  };

  const handleFinishWorkout = () => {
    setActiveWorkout(null);
    setPlanExerciseIds(undefined);
  }

  const startFromScratch = (workoutName: string) => {
    handleStartWorkout({ workoutName, exercises: [] }, undefined);
  }

  if (activeWorkout) {
    return (
      <div className="container mx-auto p-4 md:p-8 flex justify-center">
        <div className="w-full max-w-lg">
          <div className="w-full max-w-lg">
            <ActiveWorkoutView initialWorkout={activeWorkout} onFinishWorkout={handleFinishWorkout} allExercises={allExercises} planExerciseIds={planExerciseIds} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <h1 className="mb-6 font-headline text-3xl font-bold">Zapisz Trening</h1>
      <WorkoutSelectionView
        onStartEmpty={startFromScratch}
        onStartFromPlan={handleStartWorkout}
        allExercises={allExercises}
      />
    </div>
  );
}
