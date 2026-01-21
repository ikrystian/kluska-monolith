import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCollection } from '@/hooks/useCollection';
import { useCreateDoc } from '@/hooks/useMutation';
import { Exercise, Workout } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
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
  ArrowLeft,
  Trash2,
  Save,
  GripVertical,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ExerciseEntry {
  exerciseId: string;
  exerciseName: string;
  sets: number;
  reps: number;
  restSeconds: number;
}

export default function WorkoutCreatePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [exercises, setExercises] = useState<ExerciseEntry[]>([]);

  const { data: allExercises, isLoading: exercisesLoading } = useCollection<Exercise>(
    'exercises',
    { limit: 200 }
  );

  const { mutate: createWorkout, isPending: isSaving } = useCreateDoc<Workout>('workouts');

  const handleAddExercise = (exerciseId: string) => {
    const exercise = allExercises?.find(e => e.id === exerciseId);
    if (!exercise) return;

    setExercises(prev => [...prev, {
      exerciseId,
      exerciseName: exercise.name,
      sets: 3,
      reps: 10,
      restSeconds: 60,
    }]);
  };

  const handleRemoveExercise = (index: number) => {
    setExercises(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpdateExercise = (index: number, field: keyof ExerciseEntry, value: string | number) => {
    setExercises(prev => prev.map((ex, i) =>
      i === index ? { ...ex, [field]: value } : ex
    ));
  };

  const handleSave = () => {
    if (!user?.id || !name.trim()) {
      toast.error('Podaj nazwę treningu');
      return;
    }

    const workoutData: Partial<Workout> = {
      name: name.trim(),
      description: description.trim(),
      ownerId: user.id,
      exerciseSeries: exercises.map(ex => ({
        exerciseId: ex.exerciseId,
        exercise: { id: ex.exerciseId, name: ex.exerciseName, mainMuscleGroups: [], secondaryMuscleGroups: [] },
        sets: [],
        tempo: '2-0-2-0',
      })) as Workout['exerciseSeries'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    createWorkout(workoutData as Workout, {
      onSuccess: (result) => {
        toast.success('Trening utworzony!');
        navigate(`/athlete/workouts/${result.id}`);
      },
      onError: () => toast.error('Nie udało się utworzyć treningu'),
    });
  };

  return (
    <div className="container mx-auto p-4 md:p-8">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate('/athlete/workouts')} className="mb-4 pl-0">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Powrót do listy
        </Button>
        <h1 className="font-headline text-3xl font-bold">Nowy Trening</h1>
        <p className="text-muted-foreground">Skomponuj swój własny plan treningowy.</p>
      </div>

      {/* Form */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column - Details */}
        <Card>
          <CardHeader>
            <CardTitle>Szczegóły treningu</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nazwa treningu *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="np. Trening klatki piersiowej"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Opis (opcjonalnie)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Dodaj opis treningu..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Right Column - Exercises */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Ćwiczenia ({exercises.length})</CardTitle>
              <AddExerciseSheet
                exercises={allExercises ?? null}
                isLoading={exercisesLoading}
                onAdd={handleAddExercise}
              />
            </div>
          </CardHeader>
          <CardContent>
            {exercises.length === 0 ? (
              <div className="text-center py-8">
                <Dumbbell className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground">Dodaj ćwiczenia do treningu</p>
              </div>
            ) : (
              <div className="space-y-3">
                {exercises.map((ex, index) => (
                  <div key={index} className="flex items-center gap-2 p-3 rounded-lg border bg-secondary/30">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{ex.exerciseName}</p>
                      <div className="flex gap-2 mt-2">
                        <div className="flex-1">
                          <Label className="text-xs">Serie</Label>
                          <Input
                            type="number"
                            min={1}
                            value={ex.sets}
                            onChange={(e) => handleUpdateExercise(index, 'sets', parseInt(e.target.value) || 1)}
                            className="h-8"
                          />
                        </div>
                        <div className="flex-1">
                          <Label className="text-xs">Powt.</Label>
                          <Input
                            type="number"
                            min={1}
                            value={ex.reps}
                            onChange={(e) => handleUpdateExercise(index, 'reps', parseInt(e.target.value) || 1)}
                            className="h-8"
                          />
                        </div>
                        <div className="flex-1">
                          <Label className="text-xs">Przerwa (s)</Label>
                          <Input
                            type="number"
                            min={0}
                            value={ex.restSeconds}
                            onChange={(e) => handleUpdateExercise(index, 'restSeconds', parseInt(e.target.value) || 0)}
                            className="h-8"
                          />
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleRemoveExercise(index)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Save Button */}
      <div className="mt-6 flex justify-end">
        <Button onClick={handleSave} disabled={isSaving || !name.trim()}>
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Zapisz trening
        </Button>
      </div>
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
        <Button variant="outline" size="sm">
          <PlusCircle className="h-4 w-4 mr-2" />
          Dodaj
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Dodaj ćwiczenie</SheetTitle>
          <SheetDescription>Wybierz ćwiczenie z listy</SheetDescription>
        </SheetHeader>
        <div className="py-4">
          <div className="flex items-center gap-2 mb-4">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Szukaj..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <ScrollArea className="h-[calc(100vh-200px)]">
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
                    className="flex items-center justify-between p-3 rounded-md border cursor-pointer hover:bg-secondary"
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
