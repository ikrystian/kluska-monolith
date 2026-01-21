import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCollection } from '@/hooks/useCollection';
import { useCreateDoc } from '@/hooks/useMutation';
import { Exercise, WorkoutLog, Workout } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import {
  PlusCircle,
  Loader2,
  Dumbbell,
  Search,
  Play,
  Clock,
  Save,
  Trash2,
  CheckCircle2,
  ArrowLeft,
} from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { useNavigate, useSearchParams } from 'react-router-dom';

interface WorkoutSet {
  number: number;
  reps: number;
  weight: number;
  completed: boolean;
}

interface ExerciseEntry {
  exerciseId: string;
  exerciseName: string;
  sets: WorkoutSet[];
}

export default function LogPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const workoutIdParam = searchParams.get('workoutId');

  const [isActive, setIsActive] = useState(false);
  const [workoutName, setWorkoutName] = useState('Mój Trening');
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [exercises, setExercises] = useState<ExerciseEntry[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showFinishDialog, setShowFinishDialog] = useState(false);

  // Fetch exercises list
  const { data: allExercises, isLoading: exercisesLoading } = useCollection<Exercise>(
    'exercises',
    { limit: 200 }
  );

  // Fetch workout template if workoutId provided
  const { data: workouts } = useCollection<Workout>(
    workoutIdParam ? 'workouts' : null,
    { query: { _id: workoutIdParam } }
  );

  const { mutate: createLog } = useCreateDoc<WorkoutLog>('workoutLogs');

  // Load workout template
  useEffect(() => {
    if (workouts && workouts.length > 0 && !isActive) {
      const workout = workouts[0] as Workout & { exercises?: { exerciseId?: string; id?: string; name?: string; sets?: number }[] };
      setWorkoutName(workout.name);
      if (workout.exercises) {
        const initialExercises: ExerciseEntry[] = workout.exercises.map((ex) => ({
          exerciseId: ex.exerciseId || ex.id || '',
          exerciseName: ex.name || getExerciseName(ex.exerciseId || ex.id || ''),
          sets: Array.from({ length: ex.sets || 3 }, (_, i) => ({
            number: i + 1,
            reps: 0,
            weight: 0,
            completed: false,
          })),
        }));
        setExercises(initialExercises);
      }
    }
  }, [workouts, isActive]);

  const getExerciseName = (exerciseId: string): string => {
    return allExercises?.find(e => e.id === exerciseId)?.name || 'Nieznane ćwiczenie';
  };

  const handleStartWorkout = () => {
    setStartTime(new Date());
    setIsActive(true);
    toast.success('Trening rozpoczęty!');
  };

  const handleAddExercise = (exerciseId: string) => {
    const exercise = allExercises?.find(e => e.id === exerciseId);
    if (!exercise) return;

    setExercises(prev => [...prev, {
      exerciseId,
      exerciseName: exercise.name,
      sets: [
        { number: 1, reps: 0, weight: 0, completed: false },
        { number: 2, reps: 0, weight: 0, completed: false },
        { number: 3, reps: 0, weight: 0, completed: false },
      ],
    }]);
  };

  const handleRemoveExercise = (index: number) => {
    setExercises(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddSet = (exerciseIndex: number) => {
    setExercises(prev => prev.map((ex, i) => {
      if (i !== exerciseIndex) return ex;
      return {
        ...ex,
        sets: [...ex.sets, { number: ex.sets.length + 1, reps: 0, weight: 0, completed: false }],
      };
    }));
  };

  const handleUpdateSet = (exerciseIndex: number, setIndex: number, field: 'reps' | 'weight', value: number) => {
    setExercises(prev => prev.map((ex, i) => {
      if (i !== exerciseIndex) return ex;
      return {
        ...ex,
        sets: ex.sets.map((set, j) => j === setIndex ? { ...set, [field]: value } : set),
      };
    }));
  };

  const handleToggleSetComplete = (exerciseIndex: number, setIndex: number) => {
    setExercises(prev => prev.map((ex, i) => {
      if (i !== exerciseIndex) return ex;
      return {
        ...ex,
        sets: ex.sets.map((set, j) => j === setIndex ? { ...set, completed: !set.completed } : set),
      };
    }));
  };

  const handleFinishWorkout = () => {
    if (!user?.id || !startTime) return;

    setIsSaving(true);
    const endTime = new Date();
    const duration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));

    const logData: Partial<WorkoutLog> = {
      workoutName,
      athleteId: user.id,
      exercises: exercises.map(ex => ({
        exerciseId: ex.exerciseId,
        exercise: {
          id: ex.exerciseId,
          name: ex.exerciseName,
          mainMuscleGroups: [],
          secondaryMuscleGroups: [],
        },
        sets: ex.sets as unknown as import('@/types').WorkoutSet[],
        tempo: '2-0-2-0',
      })),
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      duration,
      status: 'completed',
    };

    createLog(logData as WorkoutLog, {
      onSuccess: (result) => {
        toast.success('Trening zapisany!');
        navigate(`/athlete/history/${result.id}`);
      },
      onError: () => {
        toast.error('Nie udało się zapisać treningu.');
        setIsSaving(false);
      },
    });
  };

  const elapsedMinutes = startTime ? Math.round((new Date().getTime() - startTime.getTime()) / (1000 * 60)) : 0;

  // Not started view - workout builder
  if (!isActive) {
    return (
      <div className="container mx-auto p-4 md:p-8">
        <div className="mb-6 flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Wróć
          </Button>
          <h1 className="font-headline text-2xl font-bold">Przygotuj Trening</h1>
          <div className="w-10" />
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Szczegóły</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="workoutName">Nazwa Treningu</Label>
              <Input
                id="workoutName"
                value={workoutName}
                onChange={(e) => setWorkoutName(e.target.value)}
                placeholder="np. Poniedziałkowa Klata"
                className="text-lg font-semibold"
              />
            </div>
          </CardContent>
        </Card>

        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-lg">Lista Ćwiczeń</h2>
          <span className="text-sm text-muted-foreground">{exercises.length} ćwiczeń</span>
        </div>

        {exercises.length === 0 ? (
          <Card className="text-center py-12 mb-6">
            <CardContent>
              <Dumbbell className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">Brak ćwiczeń. Dodaj pierwsze ćwiczenie!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3 mb-6">
            {exercises.map((ex, index) => (
              <Card key={index}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-semibold">{ex.exerciseName}</p>
                      <p className="text-xs text-muted-foreground">{ex.sets.length} serii</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleRemoveExercise(index)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="flex gap-4">
          <AddExerciseSheet
            exercises={allExercises ?? null}
            isLoading={exercisesLoading}
            onAdd={handleAddExercise}
          />
          <Button
            className="flex-1"
            size="lg"
            onClick={handleStartWorkout}
            disabled={exercises.length === 0}
          >
            <Play className="mr-2 h-4 w-4" /> Rozpocznij Trening
          </Button>
        </div>
      </div>
    );
  }

  // Active workout view
  return (
    <div className="container mx-auto p-4 md:p-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-headline text-2xl font-bold">{workoutName}</h1>
          <p className="text-xs text-muted-foreground">
            {startTime && format(startTime, "EEEE, d MMMM, HH:mm", { locale: pl })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {elapsedMinutes}m
          </Badge>
          <Button size="sm" onClick={() => setShowFinishDialog(true)}>
            Zakończ
          </Button>
        </div>
      </div>

      {/* Exercises */}
      <div className="space-y-4 mb-20">
        {exercises.map((ex, exerciseIndex) => (
          <Card key={exerciseIndex}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{ex.exerciseName}</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => handleAddSet(exerciseIndex)}>
                  <PlusCircle className="h-4 w-4 mr-1" /> Seria
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {/* Header */}
                <div className="grid grid-cols-[40px,1fr,1fr,40px] gap-2 text-xs text-muted-foreground px-1">
                  <span>Seria</span>
                  <span>Powt.</span>
                  <span>Ciężar (kg)</span>
                  <span></span>
                </div>
                {/* Sets */}
                {ex.sets.map((set, setIndex) => (
                  <div key={setIndex} className={`grid grid-cols-[40px,1fr,1fr,40px] gap-2 items-center ${set.completed ? 'opacity-60' : ''}`}>
                    <span className="text-sm font-medium text-center">{set.number}</span>
                    <Input
                      type="number"
                      value={set.reps || ''}
                      onChange={(e) => handleUpdateSet(exerciseIndex, setIndex, 'reps', parseInt(e.target.value) || 0)}
                      placeholder="0"
                      className="h-10"
                    />
                    <Input
                      type="number"
                      step="0.5"
                      value={set.weight || ''}
                      onChange={(e) => handleUpdateSet(exerciseIndex, setIndex, 'weight', parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      className="h-10"
                    />
                    <Button
                      variant={set.completed ? "default" : "outline"}
                      size="icon"
                      className="h-10 w-10"
                      onClick={() => handleToggleSetComplete(exerciseIndex, setIndex)}
                    >
                      <CheckCircle2 className={`h-4 w-4 ${set.completed ? 'text-white' : ''}`} />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add Exercise FAB */}
      <div className="fixed bottom-20 right-4 z-50">
        <AddExerciseSheet
          exercises={allExercises ?? null}
          isLoading={exercisesLoading}
          onAdd={handleAddExercise}
        />
      </div>

      {/* Finish Dialog */}
      <Dialog open={showFinishDialog} onOpenChange={setShowFinishDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Zakończyć Trening?</DialogTitle>
            <DialogDescription>
              Przejrzyj podsumowanie i zapisz swoją sesję.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2 text-center">
            <p><span className="font-semibold">Nazwa:</span> {workoutName}</p>
            <p><span className="font-semibold">Ćwiczenia:</span> {exercises.length}</p>
            <p><span className="font-semibold">Czas trwania:</span> {elapsedMinutes} minut</p>
          </div>
          <DialogFooter className="flex-col gap-2">
            <Button onClick={handleFinishWorkout} disabled={isSaving} className="w-full">
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Zapisz i Zakończ
            </Button>
            <Button variant="ghost" onClick={() => setShowFinishDialog(false)} className="w-full">
              Wróć do treningu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Add Exercise Sheet Component
function AddExerciseSheet({
  exercises,
  isLoading,
  onAdd,
}: {
  exercises: Exercise[] | null;
  isLoading: boolean;
  onAdd: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!exercises) return [];
    return exercises.filter(ex =>
      ex.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [exercises, search]);

  const handleSelect = (id: string) => {
    onAdd(id);
    setOpen(false);
    setSearch('');
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
          <div className="flex items-center gap-2 mb-4">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Szukaj ćwiczenia..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <ScrollArea className="h-[60vh]">
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
              </div>
            ) : (
              <div className="space-y-2 pr-4">
                {filtered.map(ex => (
                  <div
                    key={ex.id}
                    onClick={() => handleSelect(ex.id)}
                    className="flex justify-between items-center p-3 rounded-md border cursor-pointer hover:bg-secondary"
                  >
                    <div>
                      <p className="font-semibold">{ex.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {ex.mainMuscleGroups?.map(mg => typeof mg === 'string' ? mg : mg.name).join(', ') || 'Ogólnorozwojowe'}
                      </p>
                    </div>
                    <PlusCircle className="h-5 w-5 text-primary" />
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}
