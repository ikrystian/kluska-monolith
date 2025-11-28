
'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useForm, useFieldArray, FormProvider, useFormContext } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { PlusCircle, Trash2, Save, Loader2, Dumbbell, Upload, Search, ArrowLeft, ArrowRight } from 'lucide-react';
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
function AddExerciseDialog({ allExercises, onAddExercise, planExerciseIds }: { allExercises: Exercise[] | null; onAddExercise: (exerciseId: string) => void; planExerciseIds?: string[] }) {
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
    setOpen(false); // Close the dialog after adding
    setSearchTerm('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full border-dashed">
          <PlusCircle className="mr-2 h-4 w-4" /> Dodaj ćwiczenie do treningu
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Wybierz Ćwiczenie</DialogTitle>
        </DialogHeader>
        <div className="flex items-center space-x-2">
          <Input
            placeholder="Szukaj ćwiczenia..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <ScrollArea className="h-72">
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
                <Button variant="ghost" size="icon"><PlusCircle className="h-5 w-5 text-primary"/></Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}


// --- ACTIVE WORKOUT - "FROM SCRATCH" ---
function ActiveWorkoutFromScratch({ initialWorkout, allExercises, onFinishWorkout, planExerciseIds }: { initialWorkout: LogFormValues; allExercises: Exercise[] | null; onFinishWorkout: () => void; planExerciseIds?: string[] }) {
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
          exercises: exercisesWithNames,
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
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />}
                Zapisz i Zakończ
            </Button>
            <Button onClick={() => setIsFinished(false)} variant="outline" className="w-full" disabled={isSaving}>Wróć do treningu</Button>
        </CardFooter>
      </Card>
    )
  }

  const currentExercise = fields[activeExerciseIndex];
  const selectedExerciseId = form.watch(`exercises.${activeExerciseIndex}.exerciseId`);
  const exerciseDetails = allExercises?.find(ex => ex.id === selectedExerciseId);

  return (
    <Card>
      <FormProvider {...form}>
        <form onSubmit={form.handleSubmit(() => setIsFinished(true))}>
          <CardHeader>
            <FormField
              control={form.control}
              name="workoutName"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input {...field} className="text-xl font-headline font-bold border-0 shadow-none p-0 focus-visible:ring-0" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <CardDescription>{format(new Date(), "EEEE, d MMMM", { locale: pl })}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
              <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center">
                <Dumbbell className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-xl font-semibold">Rozpocznij trening</h3>
                <p className="mt-1 text-sm text-muted-foreground mb-4">Dodaj pierwsze ćwiczenie, aby zacząć.</p>
              </div>
            )}

            <div className="flex items-center gap-2">
                <div className="flex-1">
                    <AddExerciseDialog
                        allExercises={allExercises}
                        onAddExercise={handleAddExercise}
                        planExerciseIds={planExerciseIds}
                    />
                </div>
                {fields.length > 0 && (
                    <>
                        <Button type="button" variant="outline" size="icon" disabled={activeExerciseIndex === 0} onClick={() => setActiveExerciseIndex(prev => prev - 1)}>
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm font-medium text-muted-foreground">
                            {activeExerciseIndex + 1} / {fields.length}
                        </span>
                        <Button type="button" variant="outline" size="icon" disabled={activeExerciseIndex === fields.length - 1} onClick={() => setActiveExerciseIndex(prev => prev + 1)}>
                            <ArrowRight className="h-4 w-4" />
                        </Button>
                    </>
                )}
            </div>

          </CardContent>
          <CardFooter className="flex-col gap-2">
            <Button type="submit" className="w-full" disabled={fields.length === 0}>Zakończ Trening</Button>
            <Button onClick={onFinishWorkout} variant="destructive" className="w-full">Anuluj Trening</Button>
          </CardFooter>
        </form>
      </FormProvider>
    </Card>
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
                className={`grid grid-cols-12 gap-2 items-center ${
                  newSetId === setField.id ? 'animate-fade-in' : ''
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
function FromTemplateForm({ onStartWorkout, allExercises }: { onStartWorkout: (template: LogFormValues, exerciseIds?: string[]) => void; allExercises: Exercise[] | null; }) {
    const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
    const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);

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

    const workoutPlans = useMemo(() => {
        const plansMap = new Map<string, WorkoutPlan>();
        assignedPlans?.forEach(plan => plansMap.set(plan.id, plan));
        myPlans?.forEach(plan => plansMap.set(plan.id, plan));
        return Array.from(plansMap.values());
    }, [assignedPlans, myPlans]);

    const handleSelectPlan = (planId: string) => {
        setSelectedPlanId(planId);
        setSelectedDayIndex(null); // Reset day selection when plan changes
    };

    const handleStartWorkout = () => {
        if (selectedPlanId === null || selectedDayIndex === null) return;
        const plan = workoutPlans?.find(p => p.id === selectedPlanId);
        if (!plan) return;

        const workoutDay = plan.workoutDays[selectedDayIndex];

        const workoutData: LogFormValues = {
            workoutName: workoutDay.dayName,
            exercises: workoutDay.exercises.map(ex => ({
                exerciseId: ex.exerciseId,
                sets: ex.sets?.map(s => ({ reps: s.reps, weight: s.weight })) || [],
                duration: ex.duration || 0,
            })),
        };

        // Extract exercise IDs from the plan
        const exerciseIds = workoutDay.exercises.map(ex => ex.exerciseId);

        onStartWorkout(workoutData, exerciseIds);
        setSelectedPlanId(null);
        setSelectedDayIndex(null);
    };

    const anyLoading = assignedPlansLoading || myPlansLoading;
    const selectedPlan = workoutPlans?.find(p => p.id === selectedPlanId);
    const selectedDay = selectedPlan && selectedDayIndex !== null ? selectedPlan.workoutDays[selectedDayIndex] : null;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline">Zaloguj z planu</CardTitle>
                <CardDescription>Wybierz jeden ze swoich planów i dzień treningowy, aby szybko rozpocząć.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 <Select onValueChange={handleSelectPlan} value={selectedPlanId || ''}>
                    <SelectTrigger>
                        <SelectValue placeholder="1. Wybierz plan treningu" />
                    </SelectTrigger>
                    <SelectContent>
                        {anyLoading && <SelectItem value="loading" disabled>Ładowanie planów...</SelectItem>}
                        {!anyLoading && workoutPlans && workoutPlans.map(plan => (
                            <SelectItem key={plan.id} value={plan.id}>{plan.name}</SelectItem>
                        ))}
                         {!anyLoading && workoutPlans?.length === 0 && (
                            <SelectItem value="no-plans" disabled>Brak dostępnych planów.</SelectItem>
                        )}
                    </SelectContent>
                </Select>

                {selectedPlan && (
                    <Select onValueChange={(val) => setSelectedDayIndex(Number(val))} value={selectedDayIndex !== null ? String(selectedDayIndex) : ''}>
                        <SelectTrigger>
                            <SelectValue placeholder="2. Wybierz dzień treningowy" />
                        </SelectTrigger>
                        <SelectContent>
                            {selectedPlan.workoutDays.map((day, index) => (
                                <SelectItem key={index} value={String(index)}>{day.dayName}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}

                {selectedDay && allExercises && (
                    <Card className="p-4 bg-secondary/50">
                        <CardHeader className="p-2">
                           <CardTitle className="text-lg">Podgląd ćwiczeń:</CardTitle>
                        </CardHeader>
                        <CardContent className="p-2 space-y-2">
                             {selectedDay.exercises.map((exercise, index) => {
                                 const exerciseDetails = allExercises.find(e => e.id === exercise.exerciseId);
                                 return (
                                    <div key={index} className="flex justify-between items-center text-sm">
                                        <span className="font-medium">{exerciseDetails?.name || 'Nieznane ćwiczenie'}</span>
                                        <span className="text-muted-foreground">
                                            {exercise.sets?.map(s => s.reps).join('/')}
                                        </span>
                                    </div>
                                 )
                             })}
                        </CardContent>
                    </Card>
                )}

            </CardContent>
            {selectedPlan && selectedDayIndex !== null && (
                 <CardFooter>
                    <Button onClick={handleStartWorkout} className="w-full">
                        Rozpocznij Trening: '{selectedPlan.workoutDays[selectedDayIndex].dayName}'
                    </Button>
                </CardFooter>
            )}
        </Card>
    )
}

// --- MAIN PAGE COMPONENT ---
export default function LogWorkoutPage() {
  const [activeWorkout, setActiveWorkout] = useState<LogFormValues | null>(null);
  const [planExerciseIds, setPlanExerciseIds] = useState<string[] | undefined>(undefined);
  const [currentTab, setCurrentTab] = useState("from-template");
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
                <ActiveWorkoutFromScratch initialWorkout={activeWorkout} onFinishWorkout={handleFinishWorkout} allExercises={allExercises} planExerciseIds={planExerciseIds} />
             </div>
          </div>
      )
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <h1 className="mb-6 font-headline text-3xl font-bold">Zapisz Trening</h1>
       <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:w-[400px]">
          <TabsTrigger value="from-template">Z Planu</TabsTrigger>
          <TabsTrigger value="from-scratch">Od Podstaw</TabsTrigger>
        </TabsList>
        <TabsContent value="from-template">
          <FromTemplateForm onStartWorkout={(data, exerciseIds) => handleStartWorkout(data, exerciseIds)} allExercises={allExercises} />
        </TabsContent>
        <TabsContent value="from-scratch">
            <Card>
              <CardHeader>
                <CardTitle className="font-headline">Rozpocznij Trening od Podstaw</CardTitle>
                <CardDescription>Nadaj nazwę swojej sesji i zacznij od razu, dodając ćwiczenia na bieżąco.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => startFromScratch(`Trening ${format(new Date(), 'd.MM')}`)} className="w-full">
                    Rozpocznij Pusty Trening
                </Button>
              </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
