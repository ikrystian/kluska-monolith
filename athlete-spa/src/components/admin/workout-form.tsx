'use client';

import { useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Workout, TrainingLevel, SetType, Exercise } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Plus, Trash2, GripVertical, Loader2 } from 'lucide-react';
import { noteExercises, useExercisesByIds } from '@/hooks/useExercisesByIds';
import { AddExerciseSheet } from '@/components/workout/AddExerciseSheet';
import { cn } from '@/lib/utils';

const workoutSchema = z.object({
    name: z.string().min(1, 'Nazwa jest wymagana.'),
    level: z.nativeEnum(TrainingLevel, { required_error: 'Poziom jest wymagany.' }),
    durationMinutes: z.coerce.number().min(1, 'Czas trwania musi być większy od 0.'),
    description: z.string().optional(),
    exerciseSeries: z.array(z.object({
        exerciseId: z.string().min(1, 'Ćwiczenie jest wymagane.'), // We store ID in form, map to object on submit
        tempo: z.string().min(1, 'Tempo jest wymagane (np. 3-0-1-0).'),
        tip: z.string().optional(),
        sets: z.array(z.object({
            number: z.coerce.number(),
            type: z.nativeEnum(SetType),
            reps: z.coerce.number().min(0),
            weight: z.coerce.number().min(0),
            restTimeSeconds: z.coerce.number().min(0),
        })).min(1, 'Przynajmniej jedna seria jest wymagana.'),
    })).min(1, 'Przynajmniej jedno ćwiczenie jest wymagane.'),
});

type WorkoutFormValues = z.infer<typeof workoutSchema>;

interface WorkoutFormProps {
    initialData?: Workout;
    onSubmit: (data: Workout) => Promise<void>;
    isLoading?: boolean;
}

export function WorkoutForm({ initialData, onSubmit, isLoading }: WorkoutFormProps) {
    const form = useForm<WorkoutFormValues>({
        resolver: zodResolver(workoutSchema),
        defaultValues: {
            name: initialData?.name || '',
            level: initialData?.level || TrainingLevel.Beginner,
            durationMinutes: initialData?.durationMinutes || 60,
            description: initialData?.description || '',
            exerciseSeries: initialData?.exerciseSeries?.map(series => ({
                exerciseId: series.exercise.id,
                tempo: series.tempo,
                tip: series.tip,
                sets: series.sets,
            })) || [],
        },
    });

    const { fields: seriesFields, append: appendSeries, remove: removeSeries } = useFieldArray({
        control: form.control,
        name: 'exerciseSeries',
    });

    // A template being edited carries a copy of each of its exercises: usable
    // at once, before (or without) asking the server.
    useEffect(() => {
        noteExercises(initialData?.exerciseSeries?.map(series => series.exercise) ?? []);
    }, [initialData]);

    // Only the exercises in this template. The form used to download the whole
    // library (5 600 exercises, 12 MB) and render every one of them as an
    // option of each "Ćwiczenie" dropdown.
    const { exercises, remember: rememberExercise } = useExercisesByIds(
        (form.watch('exerciseSeries') ?? []).map(series => series.exerciseId)
    );

    const handleSubmit = async (data: WorkoutFormValues) => {
        // Map form data back to Workout structure
        const mappedSeries = [];
        for (const [index, series] of data.exerciseSeries.entries()) {
            const exercise = exercises?.find(e => e.id === series.exerciseId);
            if (!exercise) {
                // Not loaded (e.g. offline) — say so instead of failing silently.
                form.setError(`exerciseSeries.${index}.exerciseId`, {
                    message: 'Nie udało się wczytać tego ćwiczenia. Wybierz je ponownie.',
                });
                return;
            }

            mappedSeries.push({
                exercise,
                tempo: series.tempo,
                tip: series.tip,
                sets: series.sets.map((set, idx) => ({ ...set, number: idx + 1 })),
            });
        }

        const workoutData: any = { // using any to bypass strict ID check which is handled by db hook or parent
            ...initialData,
            name: data.name,
            level: data.level,
            durationMinutes: data.durationMinutes,
            description: data.description,
            exerciseSeries: mappedSeries,
        };

        await onSubmit(workoutData);
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Szczegóły Treningu</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nazwa Treningu</FormLabel>
                                    <FormControl><Input {...field} disabled={isLoading} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="level"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Poziom</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Wybierz poziom" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {Object.values(TrainingLevel).map((level) => (
                                                <SelectItem key={level} value={level}>{level}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="durationMinutes"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Czas trwania (min)</FormLabel>
                                    <FormControl><Input type="number" {...field} disabled={isLoading} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem >
                                    <FormLabel>Opis (opcjonalny)</FormLabel>
                                    <FormControl><Textarea {...field} disabled={isLoading} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </CardContent>
                </Card>

                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold">Seria Ćwiczeń</h2>
                        <Button type="button" onClick={() => appendSeries({ exerciseId: '', tempo: '3-0-1-0', tip: '', sets: [{ number: 1, type: SetType.WorkingSet, reps: 10, weight: 0, restTimeSeconds: 60 }] })} variant="outline">
                            <Plus className="mr-2 h-4 w-4" /> Dodaj Ćwiczenie
                        </Button>
                    </div>

                    {seriesFields.map((field, index) => (
                        <ExerciseSeriesItem
                            key={field.id}
                            index={index}
                            form={form}
                            removeSeries={removeSeries}
                            exercises={exercises || []}
                            onExercisePicked={rememberExercise}
                            isLoading={isLoading}
                        />
                    ))}
                </div>

                <div className="flex justify-end">
                    <Button type="submit" size="lg" disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Zapisz Trening
                    </Button>
                </div>
            </form>
        </Form>
    );
}

function ExerciseSeriesItem({ index, form, removeSeries, exercises, onExercisePicked, isLoading }: any) {
    const { fields: setFields, append: appendSet, remove: removeSet } = useFieldArray({
        control: form.control,
        name: `exerciseSeries.${index}.sets`,
    });

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base font-medium">Ćwiczenie #{index + 1}</CardTitle>
                <Button type="button" variant="ghost" size="sm" onClick={() => removeSeries(index)} disabled={isLoading}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid gap-4">
                    <FormField
                        control={form.control}
                        name={`exerciseSeries.${index}.exerciseId`}
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel>Ćwiczenie</FormLabel>
                                {/* The library sheet searches and pages on the server, 30 at a time. */}
                                <AddExerciseSheet
                                    title="Wybierz ćwiczenie"
                                    onAddExercise={(exerciseId, exercise) => {
                                        if (exercise) onExercisePicked(exercise);
                                        form.setValue(`exerciseSeries.${index}.exerciseId`, exerciseId, {
                                            shouldValidate: true,
                                            shouldDirty: true,
                                        });
                                    }}
                                    trigger={
                                        <FormControl>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                className={cn(
                                                    "w-full justify-between",
                                                    !field.value && "text-muted-foreground"
                                                )}
                                                disabled={isLoading}
                                            >
                                                <span className="truncate">
                                                    {field.value
                                                        ? exercises.find((exercise: Exercise) => exercise.id === field.value)?.name ?? 'Ładowanie…'
                                                        : "Wybierz ćwiczenie"}
                                                </span>
                                                <GripVertical className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                            </Button>
                                        </FormControl>
                                    }
                                />
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name={`exerciseSeries.${index}.tempo`}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Tempo</FormLabel>
                                <FormControl><Input {...field} placeholder="3-0-1-0" disabled={isLoading} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name={`exerciseSeries.${index}.tip`}
                        render={({ field }) => (
                            <FormItem >
                                <FormLabel>Wskazówka (opcjonalna)</FormLabel>
                                <FormControl><Input {...field} disabled={isLoading} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <Separator />

                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium">Serie</h4>
                        <Button type="button" variant="outline" size="sm" onClick={() => appendSet({ number: setFields.length + 1, type: SetType.WorkingSet, reps: 10, weight: 0, restTimeSeconds: 60 })} disabled={isLoading}>
                            <Plus className="mr-2 h-3 w-3" /> Dodaj Serię
                        </Button>
                    </div>
                    <div className="space-y-2">
                        {setFields.map((setField: any, setIndex: number) => (
                            <div key={setField.id} className="grid grid-cols-12 gap-2 items-end">
                                <div className="col-span-3">
                                    <FormField
                                        control={form.control}
                                        name={`exerciseSeries.${index}.sets.${setIndex}.type`}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs">Typ</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading}>
                                                    <FormControl>
                                                        <SelectTrigger className="h-8 text-xs">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {Object.values(SetType).map((type) => (
                                                            <SelectItem key={type} value={type} className="text-xs">{type}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                <div className="col-span-2">
                                    <FormField
                                        control={form.control}
                                        name={`exerciseSeries.${index}.sets.${setIndex}.reps`}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs">Powt.</FormLabel>
                                                <FormControl><Input type="number" className="h-8 text-xs" {...field} disabled={isLoading} /></FormControl>
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                <div className="col-span-2">
                                    <FormField
                                        control={form.control}
                                        name={`exerciseSeries.${index}.sets.${setIndex}.weight`}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs">Kg</FormLabel>
                                                <FormControl><Input type="number" className="h-8 text-xs" {...field} disabled={isLoading} /></FormControl>
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                <div className="col-span-3">
                                    <FormField
                                        control={form.control}
                                        name={`exerciseSeries.${index}.sets.${setIndex}.restTimeSeconds`}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs">Przerwa (s)</FormLabel>
                                                <FormControl><Input type="number" className="h-8 text-xs" {...field} disabled={isLoading} /></FormControl>
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                <div className="col-span-2 flex justify-end">
                                    <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => removeSet(setIndex)} disabled={isLoading}>
                                        <Trash2 className="h-3 w-3 text-destructive" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
