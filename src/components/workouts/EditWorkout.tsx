'use client';

import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrainingLevel, SetType, Exercise, Workout } from '@/lib/types';
import { useCollection, useDoc, useUpdateDoc, useUser } from '@/lib/db-hooks';
import { Loader2, Plus, Trash2, ChevronUp, ChevronDown, Copy, ChevronRight, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { SetTypeButton } from '@/components/workout/SetTypeModal';
import { type ExerciseType } from '@/lib/set-type-config';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { FormFieldWithValidation } from '@/components/workout/FormFieldWithValidation';
import { FormProgressIndicator } from '@/components/workout/FormProgressIndicator';
import { SetTemplateSelector } from '@/components/workout/SetTemplateSelector';
import { QuickSetActions } from '@/components/workout/QuickSetActions';
import { SetTemplate } from '@/lib/set-templates';
import { ExerciseSelector } from '@/components/workout/ExerciseSelector';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';

// --- SCHEMA ---
const workoutSetSchema = z.object({
    type: z.nativeEnum(SetType),
    reps: z.coerce.number()
        .min(0, 'Minimum 0 powtórzeń')
        .max(100, 'Maksymalnie 100 powtórzeń')
        .optional(),
    weight: z.coerce.number()
        .min(0, 'Ciężar nie może być ujemny')
        .max(500, 'Maksymalnie 500 kg')
        .optional(),
    weightUnit: z.enum(['kg', 'rpe']).optional(),
    rpe: z.coerce.number()
        .min(1, 'RPE minimum 1')
        .max(10, 'RPE maksimum 10')
        .optional(),
    duration: z.coerce.number()
        .min(0, 'Minimum 0 sekund')
        .max(3600, 'Maksymalnie 1 godzina')
        .optional(),
    restTimeSeconds: z.coerce.number()
        .min(0, 'Przerwa nie może być ujemna')
        .max(600, 'Maksymalnie 10 minut przerwy'),
}).refine(data => {
    // If weightUnit is 'rpe', ensure rpe is provided
    if (data.weightUnit === 'rpe' && !data.rpe) {
        return false;
    }
    // If weightUnit is 'kg', ensure weight is provided
    if (data.weightUnit === 'kg' && data.weight === undefined) {
        return false;
    }
    return true;
}, {
    message: 'Podaj wartość dla wybranej jednostki (kg lub RPE)',
});

const exerciseSeriesSchema = z.object({
    exerciseId: z.string().min(1, 'Wybierz ćwiczenie'),
    tempo: z.string().max(20, 'Tempo zbyt długie').optional(),
    tip: z.string().max(100, 'Wskazówka zbyt długa').optional(),
    sets: z.array(workoutSetSchema).min(1, 'Dodaj przynajmniej jedną serię'),
});

const workoutSchema = z.object({
    name: z.string()
        .min(3, 'Nazwa musi mieć minimum 3 znaki')
        .max(100, 'Nazwa może mieć maksymalnie 100 znaków'),
    description: z.string()
        .max(500, 'Opis może mieć maksymalnie 500 znaków')
        .optional(),
    imageUrl: z.string()
        .url('Nieprawidłowy format URL')
        .optional()
        .or(z.literal('')),
    level: z.nativeEnum(TrainingLevel),
    durationMinutes: z.coerce.number()
        .min(5, 'Minimalny czas to 5 minut')
        .max(300, 'Maksymalny czas to 300 minut'),
    exerciseSeries: z.array(exerciseSeriesSchema)
        .min(1, 'Dodaj przynajmniej jedno ćwiczenie')
        .max(20, 'Maksymalnie 20 ćwiczeń w treningu'),
});

type WorkoutFormValues = z.infer<typeof workoutSchema>;

interface EditWorkoutProps {
    workoutId: string;
    onSuccess?: () => void;
    redirectPath?: string;
}

export function EditWorkout({ workoutId, onSuccess, redirectPath }: EditWorkoutProps) {
    const { user } = useUser();
    const { toast } = useToast();
    const router = useRouter();
    const { updateDoc, isLoading: isUpdating } = useUpdateDoc();
    const { data: workout, isLoading: workoutLoading, error: workoutError } = useDoc<Workout>('workouts', workoutId);
    const { data: exercises, isLoading: exercisesLoading } = useCollection<Exercise>('exercises');
    const [openExerciseIndex, setOpenExerciseIndex] = useState<number | null>(0);
    const [isInitialized, setIsInitialized] = useState(false);

    const form = useForm<WorkoutFormValues>({
        resolver: zodResolver(workoutSchema),
        defaultValues: {
            name: '',
            imageUrl: '',
            level: TrainingLevel.Beginner,
            durationMinutes: 60,
            exerciseSeries: [],
        },
    });

    // Initialize form with workout data when loaded
    useEffect(() => {
        if (workout && !isInitialized) {
            const formData: WorkoutFormValues = {
                name: workout.name,
                description: workout.description || '',
                imageUrl: workout.imageUrl || '',
                level: workout.level,
                durationMinutes: workout.durationMinutes,
                exerciseSeries: workout.exerciseSeries.map(series => ({
                    exerciseId: series.exercise.id,
                    tempo: series.tempo || '',
                    tip: series.tip || '',
                    sets: series.sets.map(set => ({
                        type: set.type || SetType.WorkingSet,
                        reps: set.reps,
                        weight: set.weight,
                        duration: set.duration,
                        restTimeSeconds: set.restTimeSeconds || 60,
                        weightUnit: set.weightUnit || 'kg',
                        rpe: set.rpe,
                    })),
                })),
            };
            form.reset(formData);
            setIsInitialized(true);
        }
    }, [workout, form, isInitialized]);

    // Auto-calculate duration
    const exerciseSeries = form.watch('exerciseSeries');
    useEffect(() => {
        if (!exerciseSeries || !isInitialized) return;

        let totalSeconds = 0;
        const EXERCISE_TRANSITION_SECONDS = 120;
        const AVG_REP_SECONDS = 4;

        exerciseSeries.forEach(series => {
            totalSeconds += EXERCISE_TRANSITION_SECONDS;

            if (series.sets) {
                series.sets.forEach(set => {
                    totalSeconds += Number(set.restTimeSeconds || 0);

                    if (set.duration) {
                        totalSeconds += Number(set.duration);
                    } else if (set.reps) {
                        totalSeconds += Number(set.reps) * AVG_REP_SECONDS;
                    } else {
                        totalSeconds += 30;
                    }
                });
            }
        });

        const minutes = Math.max(5, Math.ceil(totalSeconds / 60 / 5) * 5);
        const currentDuration = form.getValues('durationMinutes');
        if (currentDuration !== minutes) {
            form.setValue('durationMinutes', minutes, { shouldValidate: true, shouldDirty: true });
        }
    }, [exerciseSeries, form, isInitialized]);

    // Calculate progress
    const values = form.watch();
    const steps = [
        {
            label: 'Szczegóły',
            isComplete: !!(values.name && values.level && values.durationMinutes),
            isActive: true
        },
        {
            label: 'Ćwiczenia',
            isComplete: values.exerciseSeries?.length > 0,
            isActive: !!(values.name && values.level)
        },
        {
            label: 'Serie',
            isComplete: values.exerciseSeries?.length > 0 && values.exerciseSeries.every(s => s.sets?.length > 0),
            isActive: values.exerciseSeries?.length > 0
        }
    ];

    const { fields: exerciseFields, append: appendExercise, remove: removeExercise, move: moveExercise } = useFieldArray({
        control: form.control,
        name: 'exerciseSeries',
    });

    const handleSubmit = async (data: WorkoutFormValues) => {
        if (!user || !workout) return;

        try {
            const fullExerciseSeries = data.exerciseSeries.map(series => {
                const exercise = exercises?.find(e => e.id === series.exerciseId);
                if (!exercise) throw new Error(`Exercise not found: ${series.exerciseId}`);

                return {
                    exercise,
                    tempo: series.tempo || '',
                    tip: series.tip,
                    sets: series.sets.map((set, index) => ({ ...set, number: index + 1 })),
                };
            });

            const updatedWorkout: Partial<Workout> = {
                name: data.name,
                imageUrl: data.imageUrl || undefined,
                level: data.level,
                durationMinutes: data.durationMinutes,
                exerciseSeries: fullExerciseSeries,
                description: data.description,
            };

            await updateDoc('workouts', workoutId, updatedWorkout);

            toast({ title: 'Sukces', description: 'Trening został zaktualizowany.' });
            if (onSuccess) onSuccess();
            if (redirectPath) router.push(redirectPath);

        } catch (error) {
            console.error(error);
            toast({
                title: 'Błąd',
                description: 'Nie udało się zaktualizować treningu.',
                variant: 'destructive'
            });
        }
    };

    const handleAddExercise = async () => {
        const isHeaderValid = await form.trigger(['name', 'level', 'durationMinutes']);
        if (!isHeaderValid) {
            toast({
                title: "Błąd walidacji",
                description: "Uzupełnij szczegóły treningu (nazwa, poziom, czas) przed dodaniem ćwiczeń.",
                variant: "destructive"
            });
            return;
        }

        if (exerciseFields.length > 0) {
            const isExercisesValid = await form.trigger('exerciseSeries');
            if (!isExercisesValid) {
                toast({
                    title: "Błąd walidacji",
                    description: "Uzupełnij poprzednie ćwiczenie przed dodaniem kolejnego.",
                    variant: "destructive"
                });
                return;
            }
        }

        appendExercise({ exerciseId: '', sets: [{ type: SetType.WorkingSet, reps: 10, weight: 0, restTimeSeconds: 60 }] });
        setOpenExerciseIndex(exerciseFields.length);
    };

    const handleRemoveExercise = (index: number) => {
        if (window.confirm("Czy na pewno chcesz usunąć to ćwiczenie?")) {
            removeExercise(index);
            if (openExerciseIndex === index) {
                setOpenExerciseIndex(null);
            }
        }
    };

    if (workoutLoading || exercisesLoading) {
        return (
            <div className="space-y-8 max-w-4xl mx-auto">
                <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-48" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                    </CardContent>
                </Card>
                <Skeleton className="h-48 w-full" />
            </div>
        );
    }

    if (workoutError || !workout) {
        return (
            <div className="text-center py-12">
                <h2 className="text-2xl font-bold mb-4">Nie znaleziono treningu</h2>
                <p className="text-muted-foreground mb-6">Trening o podanym ID nie istnieje lub został usunięty.</p>
                <Button onClick={() => router.back()}>Wróć</Button>
            </div>
        );
    }

    return (
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8 max-w-4xl mx-auto pb-20">
            <Card>
                <CardHeader>
                    <CardTitle>Szczegóły Treningu</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <FormProgressIndicator steps={steps} />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormFieldWithValidation
                            label="Nazwa Treningu"
                            error={form.formState.errors.name?.message}
                            touched={form.formState.touchedFields.name}
                            required
                        >
                            <Input {...form.register('name')} placeholder="np. Full Body Workout A" />
                        </FormFieldWithValidation>

                        <FormFieldWithValidation
                            label="Opis"
                            error={form.formState.errors.description?.message}
                            touched={form.formState.touchedFields.description}
                        >
                            <Textarea {...form.register('description')} placeholder="Krótki opis treningu..." />
                        </FormFieldWithValidation>

                        <FormFieldWithValidation
                            label="Poziom"
                            error={form.formState.errors.level?.message}
                            touched={form.formState.touchedFields.level}
                            required
                        >
                            <Select
                                onValueChange={(val) => form.setValue('level', val as TrainingLevel)}
                                value={form.watch('level')}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Wybierz poziom" />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.values(TrainingLevel).map(level => (
                                        <SelectItem key={level} value={level}>{level}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </FormFieldWithValidation>

                        <FormFieldWithValidation
                            label="Szacowany czas (min)"
                            error={form.formState.errors.durationMinutes?.message}
                            touched={form.formState.touchedFields.durationMinutes}
                            required
                        >
                            <Input type="number" {...form.register('durationMinutes')} readOnly className="bg-muted" />
                        </FormFieldWithValidation>

                        <FormFieldWithValidation
                            label="URL Obrazka (opcjonalnie)"
                            error={form.formState.errors.imageUrl?.message}
                            touched={form.formState.touchedFields.imageUrl}
                        >
                            <Input {...form.register('imageUrl')} placeholder="https://..." />
                        </FormFieldWithValidation>
                    </div>
                </CardContent>
            </Card>

            <div className="space-y-4">
                {exerciseFields.map((field, index) => (
                    <ExerciseSeriesItem
                        key={field.id}
                        index={index}
                        form={form}
                        remove={handleRemoveExercise}
                        move={moveExercise}
                        isFirst={index === 0}
                        isLast={index === exerciseFields.length - 1}
                        exercises={exercises || []}
                        isOpen={openExerciseIndex === index}
                        onToggle={() => setOpenExerciseIndex(openExerciseIndex === index ? null : index)}
                    />
                ))}
                <div className="flex justify-end">
                    <Button type="button" onClick={handleAddExercise}>
                        <Plus className="mr-2 h-4 w-4" /> Dodaj Ćwiczenie
                    </Button>
                </div>
            </div>

            <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t flex justify-end container mx-auto z-10">
                <Button type="submit" size="lg" disabled={isUpdating}>
                    {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Zapisz Zmiany
                </Button>
            </div>
        </form>
    );
}

function ExerciseSeriesItem({
    index,
    form,
    remove,
    move,
    isFirst,
    isLast,
    exercises,
    isOpen,
    onToggle
}: {
    index: number,
    form: any,
    remove: (index: number) => void,
    move: (from: number, to: number) => void,
    isFirst: boolean,
    isLast: boolean,
    exercises: Exercise[],
    isOpen: boolean,
    onToggle: () => void
}) {
    const [exerciseDialogOpen, setExerciseDialogOpen] = useState(false);
    const [weightUnit, setWeightUnit] = useState<'kg' | 'rpe'>('kg');
    const { toast } = useToast();
    const { fields: setFields, append: appendSet, remove: removeSet } = useFieldArray({
        control: form.control,
        name: `exerciseSeries.${index}.sets`,
    });

    const selectedExerciseId = form.watch(`exerciseSeries.${index}.exerciseId`);
    const selectedExercise = exercises.find(e => e.id === selectedExerciseId);
    const exerciseType: ExerciseType = selectedExercise?.type || 'weight';

    const handleAddSet = (type: SetType = SetType.WorkingSet) => {
        const sets = form.getValues(`exerciseSeries.${index}.sets`);
        const lastSet = sets[sets.length - 1];

        if (lastSet) {
            appendSet({ ...lastSet, type });
        } else {
            const defaultSet: any = {
                type,
                reps: 10,
                restTimeSeconds: 60,
                weightUnit
            };

            if (weightUnit === 'kg') {
                defaultSet.weight = 0;
            } else {
                defaultSet.rpe = 7;
            }

            appendSet(defaultSet);
        }
    };

    const handleDuplicateLastSet = () => {
        const sets = form.getValues(`exerciseSeries.${index}.sets`);
        const lastSet = sets[sets.length - 1];
        if (lastSet) {
            appendSet({ ...lastSet });
        }
    };

    const handleClearSets = () => {
        if (window.confirm("Czy na pewno chcesz usunąć wszystkie serie?")) {
            removeSet();
        }
    };

    const handleRemoveSet = (setIndex: number) => {
        if (window.confirm("Czy na pewno chcesz usunąć tę serię?")) {
            removeSet(setIndex);
        }
    };

    const handleApplyTemplate = (template: SetTemplate) => {
        removeSet();
        const newSets = template.sets.map(s => ({
            ...s,
            reps: s.reps ?? 0,
            weight: s.weight ?? 0,
            restTimeSeconds: s.restTimeSeconds ?? 60,
            duration: 0
        }));
        appendSet(newSets);
        toast({ title: 'Szablon zastosowany', description: `Zastosowano szablon: ${template.name}` });
    };

    const handleDuplicateSet = (setIndex: number) => {
        const set = form.getValues(`exerciseSeries.${index}.sets.${setIndex}`);
        appendSet({ ...set });
    };

    return (
        <Collapsible open={isOpen} onOpenChange={onToggle}>
            <Card className="relative">
                <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-1">
                            <CollapsibleTrigger asChild>
                                <Button variant="ghost" size="sm" className="p-0 h-6 w-6 hover:bg-transparent">
                                    <ChevronRight className={cn("h-4 w-4 transition-transform", isOpen && "rotate-90")} />
                                </Button>
                            </CollapsibleTrigger>
                            <span className="bg-muted w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">{index + 1}</span>
                            <CardTitle className="text-lg truncate">
                                {selectedExercise ? selectedExercise.name : "Nowe ćwiczenie"}
                            </CardTitle>
                        </div>
                        <div className="flex items-center gap-1">
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                disabled={isFirst}
                                onClick={() => move(index, index - 1)}
                                title="Przesuń w górę"
                            >
                                <ChevronUp className="h-4 w-4" />
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                disabled={isLast}
                                onClick={() => move(index, index + 1)}
                                title="Przesuń w dół"
                            >
                                <ChevronDown className="h-4 w-4" />
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive"
                                onClick={() => remove(index)}
                                title="Usuń ćwiczenie"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CollapsibleContent>
                    <CardContent className="space-y-4 pt-2">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="md:col-span-2 space-y-2">
                                <FormFieldWithValidation
                                    label="Ćwiczenie"
                                    error={form.formState.errors.exerciseSeries?.[index]?.exerciseId?.message}
                                    touched={form.formState.touchedFields.exerciseSeries?.[index]?.exerciseId}
                                    required
                                >
                                    <Dialog open={exerciseDialogOpen} onOpenChange={setExerciseDialogOpen}>
                                        <DialogTrigger asChild>
                                            <Button variant="outline" role="combobox" className={cn("w-full justify-between", !selectedExerciseId && "text-muted-foreground")}>
                                                {selectedExercise ? selectedExercise.name : "Wybierz ćwiczenie..."}
                                                <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                                            <DialogHeader>
                                                <DialogTitle>Wybierz ćwiczenie</DialogTitle>
                                            </DialogHeader>
                                            <ExerciseSelector
                                                exercises={exercises}
                                                selectedId={selectedExerciseId}
                                                onSelect={(val) => {
                                                    form.setValue(`exerciseSeries.${index}.exerciseId`, val, { shouldValidate: true, shouldDirty: true });
                                                    setExerciseDialogOpen(false);
                                                }}
                                            />
                                        </DialogContent>
                                    </Dialog>
                                </FormFieldWithValidation>
                            </div>
                            <div className="space-y-2">
                                <FormFieldWithValidation
                                    label="Tempo (np. 3-0-1-0)"
                                    error={form.formState.errors.exerciseSeries?.[index]?.tempo?.message}
                                    touched={form.formState.touchedFields.exerciseSeries?.[index]?.tempo}
                                >
                                    <Input {...form.register(`exerciseSeries.${index}.tempo`)} placeholder="3-0-1-0" />
                                </FormFieldWithValidation>
                            </div>
                            <div className="md:col-span-3 space-y-2">
                                <FormFieldWithValidation
                                    label="Wskazówka (Tip)"
                                    error={form.formState.errors.exerciseSeries?.[index]?.tip?.message}
                                    touched={form.formState.touchedFields.exerciseSeries?.[index]?.tip}
                                >
                                    <Input {...form.register(`exerciseSeries.${index}.tip`)} placeholder="Wskazówki dla ćwiczącego..." />
                                </FormFieldWithValidation>
                            </div>
                        </div>

                        {selectedExerciseId && exerciseType === 'weight' && (
                            <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-md">
                                <Label className="text-xs text-muted-foreground">Jednostka:</Label>
                                <div className="flex gap-1">
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant={weightUnit === 'kg' ? 'default' : 'outline'}
                                        onClick={() => {
                                            setWeightUnit('kg');
                                            // Update all existing sets to use kg
                                            const sets = form.getValues(`exerciseSeries.${index}.sets`);
                                            sets.forEach((_: any, setIndex: number) => {
                                                form.setValue(`exerciseSeries.${index}.sets.${setIndex}.weightUnit`, 'kg');
                                            });
                                        }}
                                        className="h-7 px-3"
                                    >
                                        kg
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant={weightUnit === 'rpe' ? 'default' : 'outline'}
                                        onClick={() => {
                                            setWeightUnit('rpe');
                                            // Update all existing sets to use RPE
                                            const sets = form.getValues(`exerciseSeries.${index}.sets`);
                                            sets.forEach((_: any, setIndex: number) => {
                                                form.setValue(`exerciseSeries.${index}.sets.${setIndex}.weightUnit`, 'rpe');
                                            });
                                        }}
                                        className="h-7 px-3"
                                    >
                                        RPE
                                    </Button>
                                </div>
                                <span className="text-xs text-muted-foreground ml-2">
                                    {weightUnit === 'kg' ? 'Kilogramy' : 'Rate of Perceived Exertion (1-10)'}
                                </span>
                            </div>
                        )}

                        {selectedExerciseId && (
                            <div className="space-y-2">
                                <div className="flex justify-between items-center flex-wrap gap-2">
                                    <Label className="text-xs uppercase text-muted-foreground">Serie</Label>
                                    <div className="flex items-center gap-2">
                                        <SetTemplateSelector onSelect={handleApplyTemplate} />
                                        <QuickSetActions
                                            onAddSet={handleAddSet}
                                            onDuplicateLast={handleDuplicateLastSet}
                                            onClearAll={handleClearSets}
                                            setsCount={setFields.length}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="hidden md:grid grid-cols-12 gap-2 items-center text-center">
                                        <Label className="col-span-1 text-[10px] text-muted-foreground">#</Label>
                                        <Label className="col-span-2 text-[10px] text-muted-foreground">Typ</Label>
                                        {exerciseType === 'weight' ? (
                                            <>
                                                <Label className="col-span-2 text-[10px] text-muted-foreground">
                                                    {weightUnit === 'kg' ? 'kg' : 'RPE'}
                                                </Label>
                                                <Label className="col-span-2 text-[10px] text-muted-foreground">Powt.</Label>
                                            </>
                                        ) : exerciseType === 'reps' ? (
                                            <Label className="col-span-4 text-[10px] text-muted-foreground">Powtórzenia</Label>
                                        ) : (
                                            <Label className="col-span-4 text-[10px] text-muted-foreground">Czas (sek.)</Label>
                                        )}
                                        <Label className="col-span-3 text-[10px] text-muted-foreground">Przerwa</Label>
                                        <Label className="col-span-2 text-[10px] text-muted-foreground">Akcje</Label>
                                    </div>

                                    {setFields.map((setField: any, setIndex: number) => (
                                        <div key={setField.id} className="grid grid-cols-2 md:grid-cols-12 gap-2 items-center border rounded-md p-2 md:border-0 md:p-0 bg-muted/20 md:bg-transparent">
                                            <div className="col-span-2 md:col-span-1 flex justify-between md:justify-center items-center text-sm font-mono text-muted-foreground md:mb-0 mb-2">
                                                <span className="md:hidden text-xs font-bold">Seria {setIndex + 1}</span>
                                                <span className="hidden md:inline">{setIndex + 1}</span>
                                                <div className="flex md:hidden gap-1">
                                                    <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDuplicateSet(setIndex)}>
                                                        <Copy className="h-3 w-3" />
                                                    </Button>
                                                    <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleRemoveSet(setIndex)}>
                                                        <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            </div>

                                            <div className="col-span-2 md:col-span-2">
                                                <SetTypeButton
                                                    value={form.watch(`exerciseSeries.${index}.sets.${setIndex}.type`) || SetType.WorkingSet}
                                                    onChange={(val) => form.setValue(`exerciseSeries.${index}.sets.${setIndex}.type`, val)}
                                                />
                                            </div>

                                            {exerciseType === 'weight' ? (
                                                <>
                                                    <div className="col-span-1 md:col-span-2">
                                                        <div className="relative md:static">
                                                            {weightUnit === 'kg' ? (
                                                                <>
                                                                    <Input
                                                                        type="number"
                                                                        step="0.5"
                                                                        className="h-8 text-xs text-center"
                                                                        placeholder="0"
                                                                        {...form.register(`exerciseSeries.${index}.sets.${setIndex}.weight`)}
                                                                    />
                                                                    <span className="md:hidden absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">kg</span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Input
                                                                        type="number"
                                                                        step="0.5"
                                                                        min="1"
                                                                        max="10"
                                                                        className="h-8 text-xs text-center"
                                                                        placeholder="7"
                                                                        {...form.register(`exerciseSeries.${index}.sets.${setIndex}.rpe`)}
                                                                    />
                                                                    <span className="md:hidden absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">RPE</span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="col-span-1 md:col-span-2">
                                                        <div className="relative md:static">
                                                            <Input
                                                                type="number"
                                                                className="h-8 text-xs text-center"
                                                                placeholder="0"
                                                                {...form.register(`exerciseSeries.${index}.sets.${setIndex}.reps`)}
                                                            />
                                                            <span className="md:hidden absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">powt.</span>
                                                        </div>
                                                    </div>
                                                </>
                                            ) : exerciseType === 'reps' ? (
                                                <div className="col-span-2 md:col-span-4">
                                                    <Input
                                                        type="number"
                                                        className="h-8 text-xs text-center"
                                                        placeholder="0"
                                                        {...form.register(`exerciseSeries.${index}.sets.${setIndex}.reps`)}
                                                    />
                                                </div>
                                            ) : (
                                                <div className="col-span-2 md:col-span-4">
                                                    <div className="relative">
                                                        <Input
                                                            type="number"
                                                            className="h-8 text-xs text-center pr-6"
                                                            placeholder="0"
                                                            {...form.register(`exerciseSeries.${index}.sets.${setIndex}.duration`)}
                                                        />
                                                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">s</span>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="col-span-2 md:col-span-3">
                                                <div className="relative">
                                                    <Input
                                                        type="number"
                                                        className="h-8 text-xs text-center pr-6"
                                                        placeholder="60"
                                                        {...form.register(`exerciseSeries.${index}.sets.${setIndex}.restTimeSeconds`)}
                                                    />
                                                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">s</span>
                                                    <span className="md:hidden absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">Przerwa</span>
                                                </div>
                                            </div>

                                            <div className="hidden md:flex col-span-2 gap-1 justify-center">
                                                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => handleDuplicateSet(setIndex)} title="Duplikuj serię">
                                                    <Copy className="h-3 w-3" />
                                                </Button>
                                                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleRemoveSet(setIndex)} title="Usuń serię">
                                                    <Trash2 className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </CollapsibleContent>
            </Card>
        </Collapsible>
    );
}