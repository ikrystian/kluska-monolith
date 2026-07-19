'use client';

import { apiFetch } from '@/lib/api-client';
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useForm, useFieldArray, FormProvider, useFormContext } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { PlusCircle, Trash2, Save, Loader2, Dumbbell, Upload, Search, ArrowLeft, ArrowRight, Play, Calendar, ChevronRight, Clock, History, LayoutList, RotateCcw, CheckCircle2, Circle, Layers, Timer, AlertCircle } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
  type TrainingPlan,
  type Workout,
  type Exercise,
  type WorkoutLog,
  type UserProfile,
  SetType,
  TrainingLevel,
  type ExerciseSeries,
  type WorkoutSet,
  type DayPlan
} from '@/lib/types';
import { useCollection, useUser, useDoc } from '@/lib/db-hooks';
import { useActiveWorkout } from '@/hooks/useActiveWorkout';
import { useExerciseHistory } from '@/hooks/useExerciseHistory';
import { ExerciseProgressIndicator, ExerciseHistoryBadge } from '@/components/workout/ExerciseProgressIndicator';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, SheetFooter, SheetClose } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { CarouselWorkoutView } from '@/components/workout/CarouselWorkoutView';
import { SetTypeButton } from '@/components/workout/SetTypeModal';
import { type ExerciseType } from '@/lib/set-type-config';
import { AnimatePresence, motion, listItemMotion } from '@/components/motion';


// --- HELPER FUNCTIONS ---
/**
 * Extracts exercise ID from various possible locations in an exercise object.
 * Handles cases where ID might be in 'id', '_id', or as an ObjectId.
 */
const getExerciseId = (exercise: any): string => {
  // Try multiple possible ID locations
  const id = exercise?.id || exercise?._id || exercise?.exerciseId;

  if (id) {
    // Handle ObjectId objects
    return typeof id === 'object' && id.toString ? id.toString() : String(id);
  }

  return '';
};

// --- SCHEMA DEFINITIONS ---
const setSchema = z.object({
  number: z.number().optional(),
  type: z.nativeEnum(SetType).default(SetType.WorkingSet),
  reps: z.coerce.number().min(0, 'Powtórzenia muszą być dodatnie.').optional(),
  weight: z.coerce.number().min(0, 'Ciężar musi być dodatni.').optional(),
  restTimeSeconds: z.coerce.number().min(0).default(60),
  duration: z.coerce.number().min(0, 'Czas musi być dodatni.').optional(),
  completed: z.boolean().optional(),
});

const exerciseSeriesSchema = z.object({
  exerciseId: z.string().min(1, 'Proszę wybrać ćwiczenie.'),
  sets: z.array(setSchema).default([]),
  tempo: z.string().default("2-0-2-0"),
  tip: z.string().optional(),
});

const logSchema = z.object({
  workoutName: z.string().min(1, 'Nazwa treningu jest wymagana.'),
  exerciseSeries: z.array(exerciseSeriesSchema),
  level: z.nativeEnum(TrainingLevel).default(TrainingLevel.Beginner),
  durationMinutes: z.number().optional(),
  startTime: z.any().optional(), // Allow passing start time for resume
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
      ex.mainMuscleGroups?.some(mg => mg.name.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [allExercises, searchTerm]);

  // Sections by muscle group; an exercise with several main muscle groups
  // shows up under each of them, so it's findable whichever part you browse.
  const groupedExercises = useMemo(() => {
    const groups = new Map<string, Exercise[]>();
    for (const ex of filteredExercises) {
      const names = ex.mainMuscleGroups?.length
        ? ex.mainMuscleGroups.map(mg => mg.name)
        : ['Ogólnorozwojowe'];
      for (const name of names) {
        const list = groups.get(name);
        if (list) {
          list.push(ex);
        } else {
          groups.set(name, [ex]);
        }
      }
    }
    return [...groups.entries()]
      .sort(([a], [b]) => a.localeCompare(b, 'pl'))
      .map(([name, exercises]) => ({
        name,
        exercises: [...exercises].sort((a, b) => a.name.localeCompare(b.name, 'pl')),
      }));
  }, [filteredExercises]);

  const handleSelectExercise = (exerciseId: string) => {
    onAddExercise(exerciseId);
    setOpen(false);
    setSearchTerm('');
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="icon" className="hero-ember h-12 w-12 rounded-full text-white shadow-glow transition-transform hover:opacity-95 active:scale-90">
          <PlusCircle className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-[2rem]">
        <SheetHeader>
          <SheetTitle className="font-headline">Wybierz ćwiczenie</SheetTitle>
          <SheetDescription>Znajdź i dodaj ćwiczenie do swojego treningu.</SheetDescription>
        </SheetHeader>
        <div className="py-4">
          <div className="relative mb-4">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Szukaj ćwiczenia..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="rounded-full pl-11"
            />
          </div>
          <ScrollArea className="h-[60vh]">
            <div className="space-y-4 pr-4">
              {groupedExercises.map(group => (
                <div key={group.name}>
                  <p className="sticky top-0 z-10 -mx-1 bg-background/95 px-1 py-2 text-xs font-bold uppercase tracking-[0.14em] text-primary backdrop-blur-sm">
                    {group.name}
                    <span className="ml-2 font-semibold text-muted-foreground">{group.exercises.length}</span>
                  </p>
                  <div className="space-y-2">
                    {group.exercises.map(ex => (
                      <div
                        key={ex.id}
                        onClick={() => handleSelectExercise(ex.id)}
                        className="flex cursor-pointer items-center justify-between rounded-2xl border border-border/60 bg-card p-3.5 transition-all hover:border-primary/30 active:scale-[0.99]"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-semibold">{ex.name}</p>
                          <p className="truncate text-sm text-muted-foreground">
                            {ex.mainMuscleGroups?.map(mg => mg.name).join(', ') || 'Ogólnorozwojowe'}
                          </p>
                        </div>
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-secondary text-primary">
                          <PlusCircle className="h-5 w-5" />
                        </span>
                      </div>
                    ))}
                  </div>
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
    name: "exerciseSeries",
  });

  const handleAddExercise = (exerciseId: string) => {
    const exerciseDef = allExercises?.find(e => e.id === exerciseId);
    // Add default sets based on exercise type
    let defaultSets: WorkoutSet[] = [];
    // Default to 3 working sets
    defaultSets = [
      { number: 1, type: SetType.WorkingSet, reps: 0, weight: 0, restTimeSeconds: 60, completed: false },
      { number: 2, type: SetType.WorkingSet, reps: 0, weight: 0, restTimeSeconds: 60, completed: false },
      { number: 3, type: SetType.WorkingSet, reps: 0, weight: 0, restTimeSeconds: 60, completed: false }
    ];

    append({ exerciseId, sets: defaultSets, tempo: "2-0-2-0" });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] md:h-[calc(100vh-2rem)]  relative">
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" onClick={onCancel} className="p-0 hover:bg-transparent">
          <ArrowLeft className="mr-2 h-4 w-4" /> Wróć
        </Button>
        <h2 className="text-xl font-bold">Przygotuj Trening</h2>
        <div className="w-10"></div> {/* Spacer */}
      </div>

      <FormProvider {...form}>
        <form onSubmit={form.handleSubmit(onStart)} className="flex flex-col h-full space-y-6">
          <Card className="hidden">
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
              <div className="flex h-48 flex-col items-center justify-center rounded-[1.75rem] border border-dashed border-border bg-card/50 p-8 text-center">
                <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-secondary text-primary">
                  <Dumbbell className="h-6 w-6" />
                </span>
                <p className="text-sm text-muted-foreground">Brak ćwiczeń. Dodaj pierwsze ćwiczenie!</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                <AnimatePresence initial={false}>
                {fields.map((field, index) => {
                  const exerciseDetails = allExercises?.find(ex => ex.id === field.exerciseId);
                  return (
                    <motion.div key={field.id} {...listItemMotion}>
                    <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-card p-3.5 shadow-soft">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-secondary font-headline text-sm font-bold text-primary">
                          {index + 1}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-semibold">{exerciseDetails?.name || (isLoadingExercises ? 'Ładowanie...' : 'Nieznane ćwiczenie')}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {exerciseDetails?.mainMuscleGroups?.map(mg => mg.name).join(', ') || 'Ogólnorozwojowe'}
                          </p>
                        </div>
                      </div>
                      <Button type="button" variant="ghost" size="icon" className="shrink-0" onClick={() => remove(index)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                    </motion.div>
                  );
                })}
                </AnimatePresence>
              </div>
            )}
          </div>

          <div className="glass fixed inset-x-4 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-40 mx-auto flex max-w-lg items-center gap-3 rounded-[2rem] p-3 md:absolute md:inset-x-0 md:bottom-4 md:rounded-2xl">
            <AddExerciseSheet allExercises={allExercises} onAddExercise={handleAddExercise} />
            <Button type="submit" className="h-12 flex-1 text-base font-bold shadow-glow">
              <Play className="mr-2 h-4 w-4 fill-current" /> Rozpocznij trening
            </Button>
          </div>
        </form>
      </FormProvider>
    </div>
  );
}


// --- ACTIVE WORKOUT VIEW ---
type ViewMode = 'list' | 'carousel';

function ActiveWorkoutView({ initialWorkout, allExercises, onFinishWorkout, isLoadingExercises, initialLogId, sourceWorkoutId }: { initialWorkout: LogFormValues; allExercises: Exercise[] | null; onFinishWorkout: () => void; isLoadingExercises: boolean; initialLogId?: string | null; sourceWorkoutId?: string | null }) {
  const [startTime] = useState(initialWorkout.startTime ? new Date(initialWorkout.startTime) : new Date());
  const [workoutLogId, setWorkoutLogId] = useState<string | null>(initialLogId || null);
  const isCreatingWorkoutRef = useRef(false);
  const [isFinished, setIsFinished] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user } = useUser();
  const { refetch: refetchActiveWorkout } = useActiveWorkout();

  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [activeExerciseIndex, setActiveExerciseIndex] = useState(0);
  const [newExerciseId, setNewExerciseId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  const form = useForm<LogFormValues>({
    resolver: zodResolver(logSchema),
    defaultValues: initialWorkout,
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "exerciseSeries",
  });

  useEffect(() => {
    if (fields.length > 0 && activeExerciseIndex >= fields.length) {
      setActiveExerciseIndex(fields.length - 1);
    }
  }, [fields.length, activeExerciseIndex]);

  // Check for finish param
  useEffect(() => {
    if (searchParams.get('finish') === 'true') {
      setIsFinished(true);
    }
  }, [searchParams]);

  // Effect to create the workout document on start (only if not resuming)
  useEffect(() => {
    if (!user || workoutLogId || isCreatingWorkoutRef.current) return;

    const createInitialWorkoutLog = async () => {
      isCreatingWorkoutRef.current = true;

      // Validate that all exercises have valid IDs before creating the log
      const invalidExercises = initialWorkout.exerciseSeries.filter(
        series => !series.exerciseId || series.exerciseId === '' || series.exerciseId.startsWith('temp-')
      );

      if (invalidExercises.length > 0) {
        console.error('Invalid exercises found (missing exerciseId):', invalidExercises);
        toast({
          title: 'Błąd',
          description: 'Niektóre ćwiczenia nie mają prawidłowych identyfikatorów. Spróbuj dodać je ponownie.',
          variant: 'destructive',
        });
        isCreatingWorkoutRef.current = false;
        onFinishWorkout();
        return;
      }

      // Map form data to WorkoutLog structure
      const exercisesWithNames = initialWorkout.exerciseSeries.map(series => {
        const exerciseDetails = allExercises?.find(ex => ex.id === series.exerciseId);

        const exerciseSnapshot: Exercise = exerciseDetails || {
          id: series.exerciseId,
          name: 'Unknown Exercise',
          mainMuscleGroups: [],
          secondaryMuscleGroups: [],
          type: 'weight' // Default
        };

        return {
          exerciseId: series.exerciseId,
          exercise: exerciseSnapshot,
          sets: series.sets || [],
          tempo: series.tempo,
          tip: series.tip
        };
      });

      const initialLogData = {
        workoutName: initialWorkout.workoutName,
        exercises: exercisesWithNames,
        status: 'in-progress',
        startTime: startTime,
        athleteId: user.uid,
        ...(sourceWorkoutId && { sourceWorkoutId }), // Track the original workout template
      };

      try {
        const response = await apiFetch('/api/db/workoutLogs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(initialLogData),
        });

        if (!response.ok) {
          throw new Error('Failed to create workout log');
        }

        const result = await response.json();
        setWorkoutLogId(result.data.id);

        // Notify the ActiveWorkoutContext that a workout has started
        refetchActiveWorkout();
      } catch (error) {
        isCreatingWorkoutRef.current = false;
        console.error('Error creating workout log:', error);
        toast({ title: 'Błąd', description: 'Nie udało się rozpocząć sesji treningowej.', variant: 'destructive' });
        onFinishWorkout();
      }
    };

    createInitialWorkoutLog();
  }, [user, initialWorkout, onFinishWorkout, workoutLogId, startTime, toast, allExercises]);

  // Effect to update URL with logId
  useEffect(() => {
    if (workoutLogId) {
      const currentLogId = searchParams.get('logId');
      if (currentLogId !== workoutLogId) {
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev);
          next.set('logId', workoutLogId);
          // Clean up workoutId if present as we are now in a specific log
          next.delete('workoutId');
          return next;
        }, { replace: true });
      }
    }
  }, [workoutLogId, searchParams, setSearchParams]);

  // Auto-save effect
  useEffect(() => {
    if (!workoutLogId || !user || isFinished) return;

    const saveTimeout = setTimeout(async () => {
      const currentData = form.getValues();
      const exercisesWithNames = currentData.exerciseSeries.map(series => {
        const exerciseDetails = allExercises?.find(ex => ex.id === series.exerciseId);
        const exerciseSnapshot: Exercise = exerciseDetails || {
          id: series.exerciseId,
          name: 'Unknown Exercise',
          mainMuscleGroups: [],
          secondaryMuscleGroups: [],
          type: 'weight'
        };
        return {
          exerciseId: series.exerciseId,
          exercise: exerciseSnapshot,
          sets: series.sets || [],
          tempo: series.tempo,
          tip: series.tip
        };
      });

      const updateData = {
        exercises: exercisesWithNames,
        // Don't update status or endTime here
      };

      try {
        await apiFetch(`/api/db/workoutLogs/${workoutLogId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData),
        });
        console.log('Auto-saved workout progress');
      } catch (error) {
        console.error('Error auto-saving workout:', error);
      }
    }, 2000); // Debounce for 2 seconds

    return () => clearTimeout(saveTimeout);
  }, [form.watch(), workoutLogId, user, allExercises, isFinished]);


  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleAddExercise = (exerciseId: string) => {
    const defaultSets: WorkoutSet[] = [
      { number: 1, type: SetType.WorkingSet, reps: 0, weight: 0, restTimeSeconds: 60, completed: false },
      { number: 2, type: SetType.WorkingSet, reps: 0, weight: 0, restTimeSeconds: 60, completed: false },
      { number: 3, type: SetType.WorkingSet, reps: 0, weight: 0, restTimeSeconds: 60, completed: false }
    ];
    const newExercise = { exerciseId, sets: defaultSets, tempo: "2-0-2-0" };
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

  // Handle set completion from carousel view
  const handleSetComplete = useCallback((exerciseIndex: number, setIndex: number) => {
    form.setValue(`exerciseSeries.${exerciseIndex}.sets.${setIndex}.completed`, true);
  }, [form]);


  const handleSaveWorkout = async (data: LogFormValues) => {
    if (!user || !workoutLogId) return;

    setIsSaving(true);

    let photoURL: string | undefined = undefined;
    if (photoFile) {
      try {
        const formData = new FormData();
        formData.append('file', photoFile);
        formData.append('userId', user.uid);

        const uploadResponse = await apiFetch('/api/upload', {
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

    const exercisesWithNames = data.exerciseSeries.map(series => {
      const exerciseDetails = allExercises?.find(ex => ex.id === series.exerciseId);
      const exerciseSnapshot: Exercise = exerciseDetails || {
        id: series.exerciseId,
        name: 'Unknown Exercise',
        mainMuscleGroups: [],
        secondaryMuscleGroups: [],
        type: 'weight'
      };
      return {
        exerciseId: series.exerciseId,
        exercise: exerciseSnapshot,
        sets: series.sets || [],
        tempo: series.tempo,
        tip: series.tip
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
      const response = await apiFetch(`/api/db/workoutLogs/${workoutLogId}`, {
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

      // Notify the ActiveWorkoutContext that the workout has been completed
      refetchActiveWorkout();

      navigate(`/athlete/history/${workoutLogId}`);
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

  const handleDiscardWorkout = async () => {
    if (!workoutLogId) return;

    setIsSaving(true);
    try {
      const response = await apiFetch(`/api/db/workoutLogs/${workoutLogId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete workout');
      }

      toast({
        title: 'Trening odrzucony',
        description: 'Twój trening został usunięty.',
      });

      refetchActiveWorkout();
      navigate('/athlete/dashboard');
    } catch (error) {
      console.error('Error discarding workout:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się odrzucić treningu.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isFinished) {
    const finishedSeries = form.getValues('exerciseSeries');
    const loggedSetsCount = finishedSeries.reduce(
      (acc, series) => acc + (series.sets?.filter((set) => set.completed).length ?? 0),
      0
    );
    const elapsedMinutes = Math.round((new Date().getTime() - startTime.getTime()) / (1000 * 60));

    return (
      <Card className="overflow-hidden rounded-[2rem]">
        <div className="hero-ember texture-grain relative p-6 text-center text-white">
          <div aria-hidden className="pointer-events-none absolute -right-10 -top-14 h-36 w-36 rounded-full border-[1rem] border-white/10" />
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/75">Dobra robota!</p>
          <h2 className="mt-1.5 font-display text-2xl font-extrabold uppercase leading-tight">Zakończyć trening?</h2>
          <p className="mt-1 text-sm text-white/80">Przejrzyj podsumowanie i zapisz swoją sesję.</p>
        </div>
        <CardContent className="space-y-4 pt-5 text-center">
          <div className="grid grid-cols-3 gap-2.5">
            <div className="rounded-2xl border border-border/60 bg-secondary/40 p-3">
              <p className="truncate font-headline text-sm font-bold">{form.getValues('workoutName')}</p>
              <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">nazwa</p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-secondary/40 p-3">
              <p className="font-headline text-sm font-bold tabular-nums">{form.getValues('exerciseSeries').length}</p>
              <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">ćwiczenia</p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-secondary/40 p-3">
              <p className="font-headline text-sm font-bold tabular-nums">{elapsedMinutes} min</p>
              <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">czas</p>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            {photoPreview && (
              <div className="relative w-full aspect-video rounded-md overflow-hidden mb-2">
                <img src={photoPreview} alt="Podgląd zdjęcia" className="absolute inset-0 w-full h-full object-cover" />
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
          <Button onClick={form.handleSubmit(handleSaveWorkout)} className="h-12 w-full text-base font-bold shadow-glow" disabled={isSaving}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Zapisz i Zakończ
          </Button>
          <Button onClick={() => setIsFinished(false)} variant="ghost" className="w-full">Wróć do treningu</Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" className="w-full text-destructive hover:text-destructive hover:bg-destructive/10">Odrzuć trening (bez zapisywania)</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Odrzucić trening?</AlertDialogTitle>
                <AlertDialogDescription>
                  {loggedSetsCount > 0
                    ? `Stracisz bezpowrotnie ${loggedSetsCount} ukończonych serii i ${elapsedMinutes} minut pracy. Tego nie da się cofnąć.`
                    : 'Sesja zostanie usunięta bez zapisu. Tego nie da się cofnąć.'}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Wróć do treningu</AlertDialogCancel>
                <AlertDialogAction onClick={handleDiscardWorkout} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  {loggedSetsCount > 0 ? 'Zaryzykuję — odrzuć' : 'Odrzuć'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardFooter>
      </Card>
    )
  }

  const currentExercise = fields[activeExerciseIndex];
  const selectedExerciseId = form.watch(`exerciseSeries.${activeExerciseIndex}.exerciseId`);
  const exerciseDetails = allExercises?.find(ex => ex.id === selectedExerciseId);

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      <FormProvider {...form}>
        <form onSubmit={form.handleSubmit(() => setIsFinished(true), (errors) => {
          console.error("Validation errors:", errors);
          toast({
            title: "Błąd walidacji",
            description: "Sprawdź czy wszystkie wymagane pola są wypełnione poprawnie.",
            variant: "destructive",
          });
        })} className="flex flex-col h-full">

          {/* Header Section */}
          <div className="flex justify-between items-center mb-4 px-1">
            <div className="flex-1 min-w-0">
              <FormField
                control={form.control}
                name="workoutName"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input {...field} className="h-auto rounded-none border-0 bg-transparent p-0 font-headline text-xl font-bold shadow-none focus-visible:ring-0" />
                    </FormControl>
                  </FormItem>
                )}
              />
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                {format(startTime, "EEEE, d MMM · HH:mm", { locale: pl })}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <div className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 font-headline text-sm font-bold tabular-nums">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-volt" />
                {Math.round((new Date().getTime() - startTime.getTime()) / (1000 * 60))} min
              </div>
              <Button type="submit" size="sm" disabled={fields.length === 0}>
                Zakończ
              </Button>
            </div>
          </div>

          {/* View Mode Toggle */}
          <div className="mb-4 flex items-center justify-center gap-3 rounded-full bg-secondary/50 p-2">
            <div className="flex items-center gap-2">
              <LayoutList className={`h-4 w-4 ${viewMode === 'list' ? 'text-primary' : 'text-muted-foreground'}`} />
              <span className={`text-xs font-bold uppercase tracking-wider ${viewMode === 'list' ? 'text-foreground' : 'text-muted-foreground'}`}>Lista</span>
            </div>
            <Switch
              checked={viewMode === 'carousel'}
              onCheckedChange={(checked) => setViewMode(checked ? 'carousel' : 'list')}
            />
            <div className="flex items-center gap-2">
              <Timer className={`h-4 w-4 ${viewMode === 'carousel' ? 'text-primary' : 'text-muted-foreground'}`} />
              <span className={`text-xs font-bold uppercase tracking-wider ${viewMode === 'carousel' ? 'text-foreground' : 'text-muted-foreground'}`}>Karuzela</span>
            </div>
          </div>

          {/* Main Content - Conditional based on view mode */}
          {viewMode === 'carousel' ? (
            <div className="flex-1 overflow-hidden pb-2">
              <CarouselWorkoutView
                allExercises={allExercises}
                isLoadingExercises={isLoadingExercises}
                onSetComplete={handleSetComplete}
              />
            </div>
          ) : (
            <>
              {/* List View - Scrollable */}
              <div className="flex-1 overflow-y-auto pb-0 px-1 scrollbar-hide">
                {currentExercise ? (
                  <div className={newExerciseId === currentExercise.exerciseId ? 'animate-slide-in-up' : ''}>
                    <ExerciseCard
                      key={currentExercise.id}
                      index={activeExerciseIndex}
                      exerciseDetails={exerciseDetails}
                      onRemoveExercise={() => handleRemoveExercise(activeExerciseIndex)}
                      isLoadingExercises={isLoadingExercises}
                      userId={user?.uid || null}
                    />
                  </div>
                ) : (
                  <div className="flex h-64 flex-col items-center justify-center rounded-[1.75rem] border border-dashed border-border bg-card/50 p-8 text-center">
                    <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-secondary text-primary">
                      <Dumbbell className="h-7 w-7" />
                    </span>
                    <h3 className="mt-4 font-headline text-lg font-bold">Rozpocznij trening</h3>
                    <p className="mt-1 text-sm text-muted-foreground">Dodaj pierwsze ćwiczenie, aby zacząć.</p>
                  </div>
                )}

                {/* Spacer for bottom bar */}
                <div className="h-24"></div>
              </div>

              {/* Bottom Navigation Bar - Only for list view */}
              <div className="glass fixed inset-x-4 bottom-[calc(1.25rem+env(safe-area-inset-bottom))] z-40 mx-auto flex max-w-lg items-center justify-between rounded-[2rem] px-4 py-3 md:relative md:inset-x-auto md:bottom-auto md:rounded-2xl">
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
            </>
          )}

        </form>
      </FormProvider>
    </div>
  )
}

function ExerciseCard({ index, exerciseDetails, onRemoveExercise, isLoadingExercises, userId }: { index: number, exerciseDetails: Exercise | undefined, onRemoveExercise: () => void, isLoadingExercises: boolean, userId: string | null }) {
  const { control, watch, setValue } = useFormContext<LogFormValues>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: `exerciseSeries.${index}.sets`
  });
  const [validationErrors, setValidationErrors] = useState<Record<number, string>>({});
  const { toast } = useToast();

  // Get exercise type from exercise details
  const exerciseType: ExerciseType = exerciseDetails?.type || 'weight';

  // Fetch exercise history for progress comparison
  const exerciseId = watch(`exerciseSeries.${index}.exerciseId`);
  const { data: exerciseHistory, isLoading: isHistoryLoading } = useExerciseHistory(
    exerciseId || exerciseDetails?.id || null,
    userId
  );

  // Validation function for a set - depends on exercise type
  const validateSet = (setIndex: number): { valid: boolean; error?: string } => {
    const reps = watch(`exerciseSeries.${index}.sets.${setIndex}.reps`);
    const weight = watch(`exerciseSeries.${index}.sets.${setIndex}.weight`);
    const duration = watch(`exerciseSeries.${index}.sets.${setIndex}.duration`);

    if (exerciseType === 'weight') {
      // Weight exercises need both reps and weight
      if (!reps || reps <= 0) {
        return { valid: false, error: 'Uzupełnij liczbę powtórzeń' };
      }
      if (weight === undefined || weight === null || weight === '' as any) {
        return { valid: false, error: 'Uzupełnij ciężar' };
      }
    } else if (exerciseType === 'reps') {
      // Reps-only exercises just need reps
      if (!reps || reps <= 0) {
        return { valid: false, error: 'Uzupełnij liczbę powtórzeń' };
      }
    } else if (exerciseType === 'duration') {
      // Duration exercises need duration
      if (!duration || duration <= 0) {
        return { valid: false, error: 'Uzupełnij czas trwania' };
      }
    }

    return { valid: true };
  };

  // Handle set completion with validation
  const handleSetCompletion = (setIndex: number, currentValue: boolean) => {
    // If trying to mark as complete (not unchecking), validate first
    if (!currentValue) {
      const validation = validateSet(setIndex);
      if (!validation.valid) {
        setValidationErrors(prev => ({ ...prev, [setIndex]: validation.error || 'Uzupełnij wymagane pola' }));
        toast({
          title: "Uzupełnij dane",
          description: validation.error || "Wprowadź wymagane dane przed zatwierdzeniem serii.",
          variant: "destructive",
        });
        return;
      }
    }

    // Clear validation error for this set
    setValidationErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[setIndex];
      return newErrors;
    });

    // Toggle the completion status
    setValue(`exerciseSeries.${index}.sets.${setIndex}.completed`, !currentValue);
  };

  // Clear validation error when user changes input
  const clearValidationError = (setIndex: number) => {
    if (validationErrors[setIndex]) {
      const validation = validateSet(setIndex);
      if (validation.valid) {
        setValidationErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[setIndex];
          return newErrors;
        });
      }
    }
  };

  const handleAddSet = () => {
    if (fields.length > 0) {
      const lastSetIndex = fields.length - 1;
      const lastReps = watch(`exerciseSeries.${index}.sets.${lastSetIndex}.reps`);
      const lastWeight = watch(`exerciseSeries.${index}.sets.${lastSetIndex}.weight`);
      const lastType = watch(`exerciseSeries.${index}.sets.${lastSetIndex}.type`);

      append({
        number: fields.length + 1,
        type: lastType || SetType.WorkingSet,
        reps: lastReps,
        weight: lastWeight,
        restTimeSeconds: 60,
        completed: false
      });
    } else {
      append({
        number: 1,
        type: SetType.WorkingSet,
        reps: 0,
        weight: 0,
        restTimeSeconds: 60,
        completed: false
      });
    }
  };

  const tempo = watch(`exerciseSeries.${index}.tempo`);
  const tip = watch(`exerciseSeries.${index}.tip`);

  return (
    <Card className="rounded-[1.75rem]">
      <CardHeader className="flex-row items-center justify-between pb-4">
        <div>
          <CardTitle className="font-headline text-lg font-bold">{exerciseDetails?.name || (isLoadingExercises ? "Ładowanie..." : "Wybierz ćwiczenie")}</CardTitle>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mt-1.5">
            {tempo && <Badge variant="outline">Tempo: {tempo}</Badge>}
            {tip && <Badge variant="outline" className="border-[hsl(var(--chart-5)/0.3)] bg-[hsl(var(--chart-5)/0.12)] text-[hsl(var(--chart-5))]">Tip</Badge>}
            {exerciseHistory && (
              <ExerciseHistoryBadge lastWorkoutDate={exerciseHistory.lastWorkoutDate} lastWorkoutName={exerciseHistory.lastWorkoutName} />
            )}
          </div>
          {tip && <p className="text-xs text-muted-foreground mt-1 italic">{tip}</p>}
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Usuń ćwiczenie</AlertDialogTitle>
              <AlertDialogDescription>
                Czy na pewno chcesz usunąć to ćwiczenie? Wszystkie serie zostaną utracone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Anuluj</AlertDialogCancel>
              <AlertDialogAction onClick={onRemoveExercise} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Usuń
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {/* Dynamic header based on exercise type */}
          <div className="grid grid-cols-12 gap-2 items-center text-center">
            <Label className="col-span-1 text-xs text-muted-foreground">#</Label>
            <Label className="col-span-2 text-xs text-muted-foreground">Typ</Label>
            {exerciseType === 'weight' ? (
              <>
                <Label className="col-span-2 text-xs text-muted-foreground">kg</Label>
                <Label className="col-span-2 text-xs text-muted-foreground">Powt.</Label>
              </>
            ) : exerciseType === 'reps' ? (
              <Label className="col-span-4 text-xs text-muted-foreground">Powtórzenia</Label>
            ) : (
              <Label className="col-span-4 text-xs text-muted-foreground">Czas (sek.)</Label>
            )}
            <Label className="col-span-3 text-xs text-muted-foreground">Przerwa</Label>
            <Label className="col-span-2 text-xs text-muted-foreground">✓</Label>
          </div>
          <AnimatePresence initial={false}>
          {fields.map((setField, setIndex) => {
            const isCompleted = watch(`exerciseSeries.${index}.sets.${setIndex}.completed`);
            const sets = watch(`exerciseSeries.${index}.sets`);
            // Find the first uncompleted set to mark as active
            const firstUncompletedIndex = sets?.findIndex((s: any) => !s.completed);
            const isActive = firstUncompletedIndex === setIndex;

            return (
              <motion.div key={setField.id} {...listItemMotion}>
              <div
                className={`grid grid-cols-12 gap-2 items-center p-2 rounded-xl transition-all ${isCompleted
                    ? 'opacity-55 bg-volt/[0.06]'
                    : isActive
                      ? 'ring-1 ring-primary/60 bg-primary/10 shadow-soft'
                      : 'bg-transparent'
                  }`}
              >
                <div className="col-span-1 flex justify-center text-sm font-mono text-muted-foreground">
                  {setIndex + 1}
                </div>

                {/* Set type button with modal */}
                <div className="col-span-2">
                  <FormField
                    control={control}
                    name={`exerciseSeries.${index}.sets.${setIndex}.type`}
                    render={({ field }) => (
                      <FormItem className="space-y-0">
                        <FormControl>
                          <SetTypeButton
                            value={field.value || SetType.WorkingSet}
                            onChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                {/* Conditional fields based on exercise type */}
                {exerciseType === 'weight' ? (
                  <>
                    <FormField
                      control={control}
                      name={`exerciseSeries.${index}.sets.${setIndex}.weight`}
                      render={({ field }) => (
                        <FormItem className="col-span-2 space-y-0">
                          <FormControl>
                            <Input
                              type="number"
                              step="0.5"
                              placeholder="0"
                              {...field}
                              onChange={(e) => {
                                field.onChange(e);
                                clearValidationError(setIndex);
                              }}
                              className={`h-9 rounded-lg text-center tabular-nums ${isActive ? "border-primary font-semibold" : ""} ${validationErrors[setIndex] && (field.value === undefined || field.value === null || field.value === '') ? "border-destructive ring-destructive/20 ring-1" : ""}`}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={control}
                      name={`exerciseSeries.${index}.sets.${setIndex}.reps`}
                      render={({ field }) => (
                        <FormItem className="col-span-2 space-y-0">
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="0"
                              {...field}
                              onChange={(e) => {
                                field.onChange(e);
                                clearValidationError(setIndex);
                              }}
                              className={`h-9 rounded-lg text-center tabular-nums ${isActive ? "border-primary font-semibold" : ""} ${validationErrors[setIndex] && (!field.value || field.value <= 0) ? "border-destructive ring-destructive/20 ring-1" : ""}`}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </>
                ) : exerciseType === 'reps' ? (
                  <FormField
                    control={control}
                    name={`exerciseSeries.${index}.sets.${setIndex}.reps`}
                    render={({ field }) => (
                      <FormItem className="col-span-4 space-y-0">
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="0"
                            {...field}
                            onChange={(e) => {
                              field.onChange(e);
                              clearValidationError(setIndex);
                            }}
                            className={`h-9 rounded-lg text-center tabular-nums ${isActive ? "border-primary font-semibold" : ""} ${validationErrors[setIndex] && (!field.value || field.value <= 0) ? "border-destructive ring-destructive/20 ring-1" : ""}`}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                ) : (
                  <FormField
                    control={control}
                    name={`exerciseSeries.${index}.sets.${setIndex}.duration`}
                    render={({ field }) => (
                      <FormItem className="col-span-4 space-y-0">
                        <FormControl>
                          <div className="relative">
                            <Input
                              type="number"
                              placeholder="0"
                              {...field}
                              onChange={(e) => {
                                field.onChange(e);
                                clearValidationError(setIndex);
                              }}
                              className={`h-9 rounded-lg text-center tabular-nums pr-6 ${isActive ? "border-primary font-semibold" : ""} ${validationErrors[setIndex] && (!field.value || field.value <= 0) ? "border-destructive ring-destructive/20 ring-1" : ""}`}
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">s</span>
                          </div>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={control}
                  name={`exerciseSeries.${index}.sets.${setIndex}.restTimeSeconds`}
                  render={({ field }) => (
                    <FormItem className="col-span-3 space-y-0">
                      <FormControl>
                        <div className="relative">
                          <Input type="number" placeholder="60" {...field} className={`h-9 rounded-lg text-center tabular-nums pr-6 ${isActive ? "border-primary font-semibold" : ""}`} />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">s</span>
                        </div>
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="col-span-2 flex flex-col items-center justify-center">
                  <FormField
                    control={control}
                    name={`exerciseSeries.${index}.sets.${setIndex}.completed`}
                    render={({ field }) => (
                      <FormItem className="space-y-0">
                        <FormControl>
                          <button
                            type="button"
                            onClick={() => handleSetCompletion(setIndex, field.value)}
                            className={`focus:outline-none transition-transform ${isActive ? 'scale-110' : ''} ${validationErrors[setIndex] ? 'animate-shake' : ''}`}
                          >
                            {field.value ? (
                              <CheckCircle2 className="h-6 w-6 text-volt" />
                            ) : validationErrors[setIndex] ? (
                              <AlertCircle className="h-6 w-6 text-destructive" />
                            ) : (
                              <Circle className={`h-6 w-6 ${isActive ? 'text-primary fill-primary/20' : 'text-muted-foreground'}`} />
                            )}
                          </button>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  {validationErrors[setIndex] && (
                    <span className="text-[10px] text-destructive mt-0.5 text-center leading-tight max-w-[60px]">
                      {validationErrors[setIndex]}
                    </span>
                  )}
                </div>
                {/* Progress comparison row */}
                {exerciseHistory && exerciseHistory.sets[setIndex] && (
                  <div className="col-span-12 flex justify-center -mt-1 mb-1">
                    <ExerciseProgressIndicator
                      currentWeight={watch(`exerciseSeries.${index}.sets.${setIndex}.weight`) || 0}
                      currentReps={watch(`exerciseSeries.${index}.sets.${setIndex}.reps`) || 0}
                      currentDuration={watch(`exerciseSeries.${index}.sets.${setIndex}.duration`) || 0}
                      previousWeight={exerciseHistory.sets[setIndex]?.weight}
                      previousReps={exerciseHistory.sets[setIndex]?.reps}
                      previousDuration={exerciseHistory.sets[setIndex]?.duration}
                      exerciseType={exerciseType}
                      compact
                    />
                  </div>
                )}
              </div>
              </motion.div>
            )
          })}
          </AnimatePresence>
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" className="h-10 flex-1 border-dashed" onClick={handleAddSet}>
              <PlusCircle className="mr-2 h-4 w-4" /> Dodaj serię
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// --- SELECTION VIEW COMPONENT ---
function WorkoutSelectionView({ onStartBuilder, allExercises }: { onStartBuilder: (data: LogFormValues) => void; allExercises: Exercise[] | null }) {
  const { user } = useUser();

  // Fetch plans assigned to the athlete
  const { data: assignedPlans, isLoading: assignedPlansLoading } = useCollection<TrainingPlan>(
    user?.uid ? 'workoutPlans' : null,
    user?.uid ? { assignedAthleteIds: { $in: [user.uid] } } : undefined
  );

  // Fetch plans created by the athlete (if they're also a trainer)
  const { data: myPlans, isLoading: myPlansLoading } = useCollection<TrainingPlan>(
    user?.uid ? 'workoutPlans' : null,
    user?.uid ? { trainerId: user.uid } : undefined
  );

  // Fetch workout templates (user's own + public)
  const { data: workoutTemplates, isLoading: templatesLoading } = useCollection<Workout>(
    user?.uid ? 'workouts' : null,
    user?.uid ? { $or: [{ ownerId: 'public' }, { ownerId: user.uid }] } : undefined
  );

  // Fetch history logs
  const { data: historyLogs, isLoading: historyLoading } = useCollection<WorkoutLog>(
    user?.uid ? 'workoutLogs' : null,
    user?.uid ? { athleteId: user.uid, status: 'completed' } : undefined,
    { sort: { endTime: -1 }, limit: 10 }
  );

  const workoutPlans = useMemo(() => {
    const plansMap = new Map<string, TrainingPlan>();
    assignedPlans?.forEach(plan => plansMap.set(plan.id, plan));
    myPlans?.forEach(plan => plansMap.set(plan.id, plan));
    return Array.from(plansMap.values());
  }, [assignedPlans, myPlans]);

  const handleStartWorkout = (workout: Workout) => {
    const workoutData: LogFormValues = {
      workoutName: workout.name,
      exerciseSeries: workout.exerciseSeries.map(series => ({
        exerciseId: getExerciseId(series.exercise),
        sets: series.sets.map((s, i) => ({
          number: i + 1,
          type: s.type || SetType.WorkingSet,
          reps: s.reps || 0,
          weight: s.weight || 0,
          restTimeSeconds: s.restTimeSeconds || 60,
          duration: undefined, // WorkoutSet doesn't have duration in data.ts, but ExerciseSeries might? No.
          completed: false
        })),
        tempo: series.tempo || "2-0-2-0",
        tip: series.tip
      })),
      level: workout.level || TrainingLevel.Intermediate
    };
    onStartBuilder(workoutData);
  };

  const handleRepeatWorkout = (log: WorkoutLog) => {
    const workoutData: LogFormValues = {
      workoutName: log.workoutName,
      exerciseSeries: log.exercises.map(ex => ({
        exerciseId: getExerciseId(ex.exercise) || ex.exerciseId || '',
        sets: ex.sets.map((s, i) => ({
          number: s.number || i + 1,
          type: s.type || SetType.WorkingSet,
          reps: s.reps,
          weight: s.weight,
          restTimeSeconds: s.restTimeSeconds || 60,
          duration: s.duration,
          completed: false
        })),
        tempo: ex.tempo || "2-0-2-0",
        tip: ex.tip
      })),
      level: TrainingLevel.Intermediate
    };
    onStartBuilder(workoutData);
  }

  const handleStartEmpty = () => {
    onStartBuilder({
      workoutName: `Trening ${format(new Date(), 'd.MM')}`,
      exerciseSeries: [],
      level: TrainingLevel.Intermediate
    });
  }

  const isLoading = assignedPlansLoading || myPlansLoading || historyLoading || templatesLoading;

  return (
    <div className="space-y-6">
      <Tabs defaultValue="quick" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="quick">Start</TabsTrigger>
          <TabsTrigger value="plans">Plany</TabsTrigger>
          <TabsTrigger value="history">Historia</TabsTrigger>
        </TabsList>

        <TabsContent value="quick" className="space-y-4 mt-4">
          <button
            type="button"
            onClick={handleStartEmpty}
            className="hero-ember texture-grain group relative flex w-full items-center gap-4 overflow-hidden rounded-[1.75rem] p-5 text-left text-white shadow-glow transition-transform duration-200 active:scale-[0.98]"
          >
            <div aria-hidden className="pointer-events-none absolute -right-10 -top-14 h-36 w-36 rounded-full border-[1rem] border-white/10" />
            <span className="relative grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white text-primary shadow-lg transition-transform duration-200 group-active:scale-95">
              <PlusCircle className="h-6 w-6" />
            </span>
            <span className="relative min-w-0">
              <span className="block text-[10px] font-bold uppercase tracking-[0.25em] text-white/75">Szybki start</span>
              <span className="mt-0.5 block font-display text-lg font-extrabold uppercase leading-tight">Pusty trening</span>
              <span className="block text-xs text-white/80">Stwórz trening od zera</span>
            </span>
            <ChevronRight className="relative ml-auto h-5 w-5 shrink-0 text-white/70" />
          </button>

          {/* Workout Templates Section */}
          {workoutTemplates && workoutTemplates.length > 0 && (
            <>
              <p className="mt-6 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Szablony treningowe</p>
              <div className="space-y-2.5">
                {workoutTemplates.map(template => (
                  <AlertDialog key={template.id}>
                    <AlertDialogTrigger asChild>
                      <div className="flex cursor-pointer items-center gap-3.5 rounded-2xl border border-border/60 bg-card p-3.5 shadow-soft transition-all hover:border-primary/30 hover:shadow-lifted active:scale-[0.99]">
                        <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-secondary">
                          {template.imageUrl ? (
                            <img
                              src={template.imageUrl}
                              alt={template.name}
                              width={48}
                              height={48}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <Dumbbell className="h-6 w-6 text-primary" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate font-semibold">{template.name}</h3>
                          <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {template.durationMinutes} min
                            </span>
                            <span className="flex items-center gap-1">
                              <Dumbbell className="h-3 w-3" />
                              {template.exerciseSeries?.length || 0} ćwiczeń
                            </span>
                            {template.ownerId === 'public' && (
                              <Badge variant="secondary">Publiczny</Badge>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="ml-auto h-5 w-5 shrink-0 text-muted-foreground" />
                      </div>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Rozpocząć trening?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Czy chcesz rozpocząć trening "{template.name}"? Zostaną załadowane wszystkie ćwiczenia z tego szablonu.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Anuluj</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleStartWorkout(template)}>
                          Rozpocznij
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                ))}
              </div>
            </>
          )}
        </TabsContent>


        <TabsContent value="plans" className="space-y-4 mt-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2].map(i => <div key={i} className="h-24 rounded-lg bg-secondary animate-pulse" />)}
            </div>
          ) : workoutPlans.length === 0 ? (
            <div className="rounded-[1.75rem] border border-dashed border-border bg-card/50 p-8 text-center">
              <p className="text-sm text-muted-foreground">Nie masz jeszcze żadnych planów.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {workoutPlans.map(plan => (
                <Sheet key={plan.id}>
                  <SheetTrigger asChild>
                    <div className="flex cursor-pointer items-center gap-3.5 rounded-2xl border border-border/60 bg-card p-4 shadow-soft transition-all hover:border-primary/30 hover:shadow-lifted active:scale-[0.99]">
                      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
                        <Calendar className="h-6 w-6" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate font-semibold">{plan.name}</h3>
                        <p className="text-xs text-muted-foreground">{plan.stages?.length || 0} etapów</p>
                      </div>
                      <ChevronRight className="ml-auto h-5 w-5 shrink-0 text-muted-foreground" />
                    </div>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="h-[85vh]">
                    <SheetHeader className="text-left mb-4">
                      <SheetTitle>{plan.name}</SheetTitle>
                      <SheetDescription>Wybierz trening z planu.</SheetDescription>
                    </SheetHeader>
                    <ScrollArea className="h-full pb-20">
                      <Accordion type="single" collapsible className="w-full">
                        {plan.stages?.map((stage, stageIndex) => (
                          <AccordionItem value={`stage-${stageIndex}`} key={stageIndex}>
                            <AccordionTrigger className="font-semibold">{stage.name}</AccordionTrigger>
                            <AccordionContent>
                              <div className="space-y-4 pl-2">
                                {stage.weeks?.map((week, weekIndex) => (
                                  <div key={weekIndex} className="border-l-2 pl-4">
                                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Tydzień {weekIndex + 1}</h4>
                                    <div className="grid gap-2">
                                      {week.days?.map((day, dayIndex) => {
                                        if (day === 'Rest Day') {
                                          return (
                                            <div key={dayIndex} className="p-2 rounded bg-secondary/20 text-sm text-muted-foreground flex justify-between">
                                              <span>Dzień {dayIndex + 1}</span>
                                              <span>Rest Day</span>
                                            </div>
                                          )
                                        }
                                        // It's a Workout object
                                        return (
                                          <Card key={dayIndex} className="cursor-pointer hover:bg-secondary/50" onClick={() => handleStartWorkout(day)}>
                                            <CardContent className="p-3 flex justify-between items-center">
                                              <div>
                                                <p className="font-medium text-sm">Dzień {dayIndex + 1}: {day.name}</p>
                                                <p className="text-xs text-muted-foreground">{day.exerciseSeries?.length || 0} ćwiczeń</p>
                                              </div>
                                              <Play className="h-4 w-4 text-primary" />
                                            </CardContent>
                                          </Card>
                                        )
                                      })}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
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
            <div className="rounded-[1.75rem] border border-dashed border-border bg-card/50 p-8 text-center">
              <p className="text-sm text-muted-foreground">Brak historii treningów.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {historyLogs.map(log => (
                <div
                  key={log.id}
                  onClick={() => handleRepeatWorkout(log)}
                  className="flex cursor-pointer items-center gap-3.5 rounded-2xl border border-border/60 bg-card p-3.5 shadow-soft transition-all hover:border-primary/30 hover:shadow-lifted active:scale-[0.99]"
                >
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-volt/15 text-volt">
                    <RotateCcw className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-semibold">{log.workoutName}</h3>
                    <p className="text-xs text-muted-foreground">{format(new Date(log.endTime as unknown as string | number | Date), 'd MMMM yyyy', { locale: pl })}</p>
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-primary">Powtórz</span>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div >
  );
}

// --- MAIN PAGE COMPONENT ---
export default function LogWorkoutPage() {
  const [view, setView] = useState<'selection' | 'builder' | 'active'>('selection');
  const [builderData, setBuilderData] = useState<LogFormValues | null>(null);
  const [activeLogId, setActiveLogId] = useState<string | null>(null);
  const { user } = useUser();
  const { data: userProfile } = useDoc<UserProfile>('users', user?.uid || null);

  const ownerIds = useMemo(() => {
    const ids = ['public'];
    if (user?.uid) ids.push(user.uid);
    if (userProfile?.trainerId) ids.push(userProfile.trainerId);
    return ids;
  }, [user?.uid, userProfile?.trainerId]);

  // Fetch exercises (public, user's own, and trainer's + legacy exercises with no owner)
  const { data: allExercises, isLoading: exercisesLoading } = useCollection<Exercise>(
    'exercises',
    user?.uid ? {
      $or: [
        { ownerId: { $in: ownerIds } },
        { ownerId: { $exists: false } },
        { ownerId: null }
      ]
    } : undefined
  );

  // Check for active workout
  const { data: activeWorkouts, isLoading: isLoadingActive } = useCollection<WorkoutLog>(
    user?.uid ? 'workoutLogs' : null,
    user?.uid ? { athleteId: user.uid, status: 'in-progress' } : undefined
  );

  const [searchParams] = useSearchParams();
  const workoutId = searchParams.get('workoutId');
  const logId = searchParams.get('logId');
  const { data: preselectedWorkout, isLoading: isLoadingPreselected } = useDoc<Workout>('workouts', workoutId);
  const { toast } = useToast();

  // Handle Active Workout Resume
  useEffect(() => {
    if (activeWorkouts && activeWorkouts.length > 0) {
      const activeLog = logId
        ? activeWorkouts.find(l => l.id === logId) || activeWorkouts[0]
        : activeWorkouts[0];

      // If user tried to start a new workout via URL but has an active one
      if (workoutId && activeLog.id !== workoutId) { // Note: workoutId param is a Workout ID, activeLog.id is Log ID. We can't easily compare, but existence of activeLog takes precedence.
        // Ideally we'd check if they are trying to start the SAME workout, but for now strict single-session policy.
        // We can show a toast only if we haven't already set up the view
        if (view !== 'active') {
          toast({
            title: "Wznowiono trening",
            description: "Masz niezakończony trening. Został on przywrócony.",
          });
        }
      }

      const resumedData: LogFormValues = {
        workoutName: activeLog.workoutName,
        exerciseSeries: activeLog.exercises.map(ex => ({
          exerciseId: getExerciseId(ex.exercise) || ex.exerciseId || '',
          sets: ex.sets.map(s => ({
            number: s.number,
            type: s.type,
            reps: s.reps,
            weight: s.weight,
            restTimeSeconds: s.restTimeSeconds || 60,
            completed: s.completed,
            duration: s.duration
          })),
          tempo: ex.tempo || "2-0-2-0",
          tip: ex.tip
        })),
        level: TrainingLevel.Intermediate, // Default or fetch from somewhere if needed
        // We might want to pass startTime too if we want correct timer
      };
      // Hack to pass start time via the form values or separate prop?
      // Let's add it to LogFormValues temporarily or handle in ActiveWorkoutView
      // For now, let's assume we can pass it via a hidden field or just use the prop in ActiveWorkoutView

      setActiveLogId(activeLog.id);
      setBuilderData({ ...resumedData, startTime: activeLog.startTime } as any); // Type assertion if we don't update schema yet
      setView('active');
    }
  }, [activeWorkouts, workoutId, view]);

  // Auto-start builder if workoutId is present and workout is loaded AND NO ACTIVE WORKOUT
  useEffect(() => {
    if (activeWorkouts && activeWorkouts.length > 0) return; // Don't auto-start if active exists

    if (workoutId && preselectedWorkout && !builderData && view === 'selection') {
      const workoutData: LogFormValues = {
        workoutName: preselectedWorkout.name,
        exerciseSeries: preselectedWorkout.exerciseSeries.map(series => {
          let exerciseId = getExerciseId(series.exercise);

          // Try to find by name if ID is missing
          if (!exerciseId && allExercises) {
            const found = allExercises.find(e => e.name === series.exercise.name);
            if (found) exerciseId = found.id;
          }

          // Log warning if still missing (but don't generate temp ID - let validation catch it)
          if (!exerciseId) {
            console.warn(`Missing ID for exercise: ${series.exercise.name}`);
          }

          return {
            exerciseId: exerciseId || '',
            sets: series.sets.map((s, i) => ({
              number: i + 1,
              type: s.type || SetType.WorkingSet,
              reps: s.reps || 0,
              weight: s.weight || 0,
              restTimeSeconds: s.restTimeSeconds || 60,
              duration: undefined,
              completed: false
            })),
            tempo: series.tempo || "2-0-2-0",
            tip: series.tip
          };
        }),
        level: preselectedWorkout.level || TrainingLevel.Intermediate
      };
      handleStartBuilder(workoutData);
    }
  }, [workoutId, preselectedWorkout, builderData, view, activeWorkouts, allExercises]);

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
      <div className="container mx-auto flex h-full justify-center p-4 md:p-8">
        <div className="flex h-full w-full max-w-lg flex-col">
          <ActiveWorkoutView
            initialWorkout={builderData}
            onFinishWorkout={handleFinishWorkout}
            allExercises={allExercises}
            isLoadingExercises={exercisesLoading}
            initialLogId={activeLogId}
            sourceWorkoutId={workoutId} // Pass the workout template ID
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
      <div className="mb-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-muted-foreground">
          {format(new Date(), 'EEEE · d MMMM', { locale: pl })}
        </p>
        <h1 className="mt-2 font-display text-3xl font-extrabold uppercase tracking-tight md:text-4xl">
          Trenuj <span className="text-gradient-ember">teraz</span>
        </h1>
      </div>
      <WorkoutSelectionView
        onStartBuilder={handleStartBuilder}
        allExercises={allExercises}
      />
    </div>
  );
}
