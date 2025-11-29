'use client';

import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrainingLevel, SetType, Exercise, Workout } from '@/lib/types';
import { useCollection, useCreateDoc, useUser } from '@/lib/db-hooks';
import { Loader2, Plus, Trash2, Dumbbell, Repeat, Timer, ChevronUp, ChevronDown, Copy, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { SetTypeButton } from '@/components/workout/SetTypeModal';
import { type ExerciseType, getExerciseTypeConfig } from '@/lib/set-type-config';
import { Combobox } from '@/components/ui/combobox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

// --- SCHEMA ---
const workoutSetSchema = z.object({
    type: z.nativeEnum(SetType),
    reps: z.coerce.number().min(0).optional(),
    weight: z.coerce.number().min(0).optional(),
    duration: z.coerce.number().min(0).optional(),
    restTimeSeconds: z.coerce.number().min(0),
});

const exerciseSeriesSchema = z.object({
    exerciseId: z.string().min(1, 'Wybierz ćwiczenie'),
    tempo: z.string().optional(),
    tip: z.string().optional(),
    sets: z.array(workoutSetSchema).min(1, 'Dodaj przynajmniej jedną serię'),
});

const workoutSchema = z.object({
    name: z.string().min(1, 'Nazwa jest wymagana'),
    imageUrl: z.string().url().optional().or(z.literal('')),
    level: z.nativeEnum(TrainingLevel),
    durationMinutes: z.coerce.number().min(1, 'Czas trwania musi być większy od 0'),
    exerciseSeries: z.array(exerciseSeriesSchema).min(1, 'Dodaj przynajmniej jedno ćwiczenie'),
});

type WorkoutFormValues = z.infer<typeof workoutSchema>;

interface CreateWorkoutProps {
    onSuccess?: () => void;
    redirectPath?: string;
}

export function CreateWorkout({ onSuccess, redirectPath }: CreateWorkoutProps) {
    const { user } = useUser();
    const { toast } = useToast();
    const router = useRouter();
    const { createDoc, isLoading: isCreating } = useCreateDoc();
    const { data: exercises, isLoading: exercisesLoading } = useCollection<Exercise>('exercises');

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

    const { fields: exerciseFields, append: appendExercise, remove: removeExercise, move: moveExercise } = useFieldArray({
        control: form.control,
        name: 'exerciseSeries',
    });

    const onSubmit = async (data: WorkoutFormValues) => {
        if (!user) return;

        try {
            // Map form data to Workout structure
            // We need to fetch full exercise objects based on IDs
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

            const newWorkout: Omit<Workout, 'id'> & { ownerId: string } = {
                name: data.name,
                imageUrl: data.imageUrl,
                level: data.level,
                durationMinutes: data.durationMinutes,
                exerciseSeries: fullExerciseSeries,
                ownerId: user.uid,
            };

            await createDoc('workouts', newWorkout);

            toast({ title: 'Sukces', description: 'Trening został utworzony.' });

            if (onSuccess) onSuccess();
            if (redirectPath) router.push(redirectPath);

        } catch (error) {
            console.error(error);
            toast({
                title: 'Błąd',
                description: 'Nie udało się utworzyć treningu.',
                variant: 'destructive'
            });
        }
    };

    if (exercisesLoading) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
    }

    return (
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 max-w-4xl mx-auto pb-20">
            <Card>
                <CardHeader>
                    <CardTitle>Szczegóły Treningu</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Nazwa Treningu</Label>
                            <Input {...form.register('name')} placeholder="np. Full Body Workout A" />
                            {form.formState.errors.name && <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label>Poziom</Label>
                            <Select
                                onValueChange={(val) => form.setValue('level', val as TrainingLevel)}
                                defaultValue={form.getValues('level')}
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
                        </div>
                        <div className="space-y-2">
                            <Label>Czas trwania (min)</Label>
                            <Input type="number" {...form.register('durationMinutes')} />
                        </div>
                        <div className="space-y-2">
                            <Label>URL Obrazka (opcjonalnie)</Label>
                            <Input {...form.register('imageUrl')} placeholder="https://..." />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold font-headline">Ćwiczenia</h2>
                    <Button type="button" onClick={() => appendExercise({ exerciseId: '', sets: [{ type: SetType.WorkingSet, reps: 10, weight: 0, restTimeSeconds: 60 }] })}>
                        <Plus className="mr-2 h-4 w-4" /> Dodaj Ćwiczenie
                    </Button>
                </div>

                {exerciseFields.map((field, index) => (
                    <ExerciseSeriesItem
                        key={field.id}
                        index={index}
                        form={form}
                        remove={removeExercise}
                        move={moveExercise}
                        isFirst={index === 0}
                        isLast={index === exerciseFields.length - 1}
                        exercises={exercises || []}
                    />
                ))}
            </div>

            <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t flex justify-end container mx-auto z-10">
                <Button type="submit" size="lg" disabled={isCreating}>
                    {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Utwórz Trening
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
    exercises
}: {
    index: number,
    form: any,
    remove: (index: number) => void,
    move: (from: number, to: number) => void,
    isFirst: boolean,
    isLast: boolean,
    exercises: Exercise[]
}) {
    const [isOpen, setIsOpen] = useState(true);
    const { fields: setFields, append: appendSet, remove: removeSet } = useFieldArray({
        control: form.control,
        name: `exerciseSeries.${index}.sets`,
    });

    // Get the selected exercise ID and find the exercise type
    const selectedExerciseId = form.watch(`exerciseSeries.${index}.exerciseId`);
    const selectedExercise = exercises.find(e => e.id === selectedExerciseId);
    const exerciseType: ExerciseType = selectedExercise?.type || 'weight';

    const handleAddSet = () => {
        const sets = form.getValues(`exerciseSeries.${index}.sets`);
        const lastSet = sets[sets.length - 1];

        if (lastSet) {
            // Smart add: copy values from last set
            appendSet({ ...lastSet });
        } else {
            // Default new set
            appendSet({ type: SetType.WorkingSet, reps: 10, weight: 0, restTimeSeconds: 60 });
        }
    };

    const handleDuplicateSet = (setIndex: number) => {
        const set = form.getValues(`exerciseSeries.${index}.sets.${setIndex}`);
        // Insert after the current set
        // useFieldArray insert is not available in the destructured props above, so we just append for now or need to pull insert
        // Actually, append adds to the end. To insert at specific index we need 'insert' from useFieldArray
        // Let's just append a copy for simplicity or refactor to include insert if strictly needed next to it.
        // For better UX, let's just append a copy of the specific set to the end of the list
        appendSet({ ...set });
    };

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
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
                                <Label>Ćwiczenie</Label>
                                <Combobox
                                    options={exercises.map(ex => ({ value: ex.id, label: ex.name }))}
                                    value={selectedExerciseId}
                                    onSelect={(val) => form.setValue(`exerciseSeries.${index}.exerciseId`, val)}
                                    placeholder="Wybierz ćwiczenie..."
                                    searchPlaceholder="Szukaj ćwiczenia..."
                                    className="w-full"
                                />
                                {form.formState.errors.exerciseSeries?.[index]?.exerciseId && (
                                    <p className="text-sm text-destructive">{form.formState.errors.exerciseSeries[index].exerciseId.message}</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label>Tempo (np. 3-0-1-0)</Label>
                                <Input {...form.register(`exerciseSeries.${index}.tempo`)} placeholder="3-0-1-0" />
                            </div>
                            <div className="md:col-span-3 space-y-2">
                                <Label>Wskazówka (Tip)</Label>
                                <Input {...form.register(`exerciseSeries.${index}.tip`)} placeholder="Wskazówki dla ćwiczącego..." />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <Label className="text-xs uppercase text-muted-foreground">Serie</Label>
                                <Button type="button" variant="outline" size="sm" onClick={handleAddSet}>
                                    <Plus className="h-3 w-3 mr-1" /> Dodaj Serię
                                </Button>
                            </div>

                            <div className="space-y-2">
                                {/* Header row - Hidden on mobile, visible on md+ */}
                                <div className="hidden md:grid grid-cols-12 gap-2 items-center text-center">
                                    <Label className="col-span-1 text-[10px] text-muted-foreground">#</Label>
                                    <Label className="col-span-2 text-[10px] text-muted-foreground">Typ</Label>
                                    {exerciseType === 'weight' ? (
                                        <>
                                            <Label className="col-span-2 text-[10px] text-muted-foreground">kg</Label>
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
                                        {/* Set number - Mobile: Full width header */}
                                        <div className="col-span-2 md:col-span-1 flex justify-between md:justify-center items-center text-sm font-mono text-muted-foreground md:mb-0 mb-2">
                                            <span className="md:hidden text-xs font-bold">Seria {setIndex + 1}</span>
                                            <span className="hidden md:inline">{setIndex + 1}</span>
                                            <div className="flex md:hidden gap-1">
                                                <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDuplicateSet(setIndex)}>
                                                    <Copy className="h-3 w-3" />
                                                </Button>
                                                <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeSet(setIndex)}>
                                                    <Trash2 className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Set type button with modal */}
                                        <div className="col-span-2 md:col-span-2">
                                            <SetTypeButton
                                                value={form.watch(`exerciseSeries.${index}.sets.${setIndex}.type`) || SetType.WorkingSet}
                                                onChange={(val) => form.setValue(`exerciseSeries.${index}.sets.${setIndex}.type`, val)}
                                            />
                                        </div>

                                        {/* Conditional fields based on exercise type */}
                                        {exerciseType === 'weight' ? (
                                            <>
                                                <div className="col-span-1 md:col-span-2">
                                                    <div className="relative md:static">
                                                        <Input
                                                            type="number"
                                                            step="0.5"
                                                            className="h-8 text-xs text-center"
                                                            placeholder="0"
                                                            {...form.register(`exerciseSeries.${index}.sets.${setIndex}.weight`)}
                                                        />
                                                        <span className="md:hidden absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">kg</span>
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

                                        {/* Rest time */}
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

                                        {/* Actions - Desktop only */}
                                        <div className="hidden md:flex col-span-2 gap-1 justify-center">
                                            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => handleDuplicateSet(setIndex)} title="Duplikuj serię">
                                                <Copy className="h-3 w-3" />
                                            </Button>
                                            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => removeSet(setIndex)} title="Usuń serię">
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </CollapsibleContent>
            </Card>
        </Collapsible>
    );
}
