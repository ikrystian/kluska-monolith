'use client';

import { useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { useForm, useFieldArray, type UseFormReturn } from 'react-hook-form';
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
import { useCollection } from '@/lib/db-hooks';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

// `z.coerce.number<number>()`: inputy liczbowe oddają tekst, a typ wejścia zawężamy
// do number, żeby wejście i wyjście schematu zgadzały się dla react-hook-form.
const workoutSchema = z.object({
    name: z.string().min(1, 'Nazwa jest wymagana.'),
    level: z.nativeEnum(TrainingLevel, { error: 'Poziom jest wymagany.' }),
    durationMinutes: z.coerce.number<number>().min(1, 'Czas trwania musi być większy od 0.'),
    description: z.string().optional(),
    exerciseSeries: z.array(z.object({
        exerciseId: z.string().min(1, 'Ćwiczenie jest wymagane.'), // We store ID in form, map to object on submit
        tempo: z.string().min(1, 'Tempo jest wymagane (np. 3-0-1-0).'),
        tip: z.string().optional(),
        sets: z.array(z.object({
            number: z.coerce.number<number>(),
            type: z.nativeEnum(SetType),
            reps: z.coerce.number<number>().min(0),
            weight: z.coerce.number<number>().min(0),
            restTimeSeconds: z.coerce.number<number>().min(0),
            // Nieedytowane tutaj, ale musi przetrwać zapis (serie na czas) — zod usuwa nieznane pola.
            duration: z.number().nullish(),
        })).min(1, 'Przynajmniej jedna seria jest wymagana.'),
    })).min(1, 'Przynajmniej jedno ćwiczenie jest wymagane.'),
});

type WorkoutFormValues = z.infer<typeof workoutSchema>;

interface WorkoutFormProps {
    initialData?: Workout;
    onSubmit: (data: Workout) => Promise<void>;
    isLoading?: boolean;
}

/** Id ćwiczenia zapisanego w treningu (starsze kopie mają tylko `_id`). */
const exerciseIdOf = (exercise: Exercise): string =>
    exercise?.id ?? (exercise as Exercise & { _id?: string })?._id ?? '';

export function WorkoutForm({ initialData, onSubmit, isLoading }: WorkoutFormProps) {
    const { data: exercises, isLoading: exercisesLoading } = useCollection<Exercise>('exercises');
    const [openCombobox, setOpenCombobox] = useState<Record<number, boolean>>({});

    // Trening przechowuje pełne kopie ćwiczeń. Ćwiczenie mogło już zniknąć z biblioteki —
    // wtedy używamy kopii z treningu, zamiast blokować zapis.
    const savedExercises = useMemo(() => {
        const saved = new Map<string, Exercise>();
        initialData?.exerciseSeries?.forEach(series => {
            const id = exerciseIdOf(series.exercise);
            if (id) saved.set(id, series.exercise);
        });
        return saved;
    }, [initialData]);

    const exerciseOptions = useMemo(() => {
        const library = exercises ?? [];
        const inLibrary = new Set(library.map(exercise => exercise.id));
        const missing = [...savedExercises].filter(([id]) => !inLibrary.has(id)).map(([id, exercise]) => ({ ...exercise, id }));
        return [...library, ...missing];
    }, [exercises, savedExercises]);

    const form = useForm<WorkoutFormValues>({
        resolver: zodResolver(workoutSchema),
        defaultValues: {
            name: initialData?.name || '',
            level: initialData?.level || TrainingLevel.Beginner,
            durationMinutes: initialData?.durationMinutes || 60,
            description: initialData?.description || '',
            exerciseSeries: initialData?.exerciseSeries?.map(series => ({
                exerciseId: exerciseIdOf(series.exercise),
                tempo: series.tempo,
                tip: series.tip ?? '',
                sets: series.sets.map(set => ({
                    number: set.number,
                    type: set.type,
                    reps: set.reps ?? 0,
                    weight: set.weight ?? 0,
                    restTimeSeconds: set.restTimeSeconds ?? 0,
                    duration: set.duration,
                })),
            })) || [],
        },
    });

    const { fields: seriesFields, append: appendSeries, remove: removeSeries } = useFieldArray({
        control: form.control,
        name: 'exerciseSeries',
    });

    const handleSubmit = async (data: WorkoutFormValues) => {
        if (!exercises) return;

        // Map form data back to Workout structure
        const mappedSeries = [];
        for (const [index, series] of data.exerciseSeries.entries()) {
            const exercise = exercises.find(e => e.id === series.exerciseId) ?? savedExercises.get(series.exerciseId);
            if (!exercise) {
                // Wyjątek rzucony tutaj nikt by nie złapał i zapis kończyłby się bez żadnego komunikatu.
                form.setError(`exerciseSeries.${index}.exerciseId`, { message: 'Wybierz ćwiczenie z listy.' });
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
                    <CardContent className="grid gap-4 sm:grid-cols-2">
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
                                <FormItem className="sm:col-span-2">
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
                            exercises={exerciseOptions}
                            openCombobox={openCombobox}
                            setOpenCombobox={setOpenCombobox}
                            isLoading={isLoading}
                        />
                    ))}
                </div>

                <div className="flex justify-end">
                    {/* Bez biblioteki ćwiczeń zapis nie ma z czego złożyć treningu, więc czekamy na jej wczytanie. */}
                    <Button type="submit" size="lg" disabled={isLoading || exercisesLoading || !exercises}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Zapisz Trening
                    </Button>
                </div>
            </form>
        </Form>
    );
}

interface ExerciseSeriesItemProps {
    index: number;
    form: UseFormReturn<WorkoutFormValues>;
    removeSeries: (index: number) => void;
    exercises: Exercise[];
    openCombobox: Record<number, boolean>;
    setOpenCombobox: Dispatch<SetStateAction<Record<number, boolean>>>;
    isLoading?: boolean;
}

function ExerciseSeriesItem({ index, form, removeSeries, exercises, openCombobox, setOpenCombobox, isLoading }: ExerciseSeriesItemProps) {
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
                <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                        control={form.control}
                        name={`exerciseSeries.${index}.exerciseId`}
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel>Ćwiczenie</FormLabel>
                                <Popover open={!!openCombobox[index]} onOpenChange={(open) => setOpenCombobox(prev => ({ ...prev, [index]: open }))}>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button
                                                variant="outline"
                                                role="combobox"
                                                className={cn(
                                                    "w-full justify-between",
                                                    !field.value && "text-muted-foreground"
                                                )}
                                                disabled={isLoading}
                                            >
                                                {field.value
                                                    ? exercises.find((exercise: Exercise) => exercise.id === field.value)?.name
                                                    : "Wybierz ćwiczenie"}
                                                <GripVertical className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                            </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[300px] p-0">
                                        <Command>
                                            <CommandInput placeholder="Szukaj ćwiczenia..." />
                                            <CommandList>
                                                <CommandEmpty>Nie znaleziono ćwiczenia.</CommandEmpty>
                                                <CommandGroup>
                                                    {exercises.map((exercise: Exercise) => (
                                                        <CommandItem
                                                            value={exercise.name}
                                                            key={exercise.id}
                                                            onSelect={() => {
                                                                form.setValue(`exerciseSeries.${index}.exerciseId`, exercise.id, { shouldValidate: true, shouldDirty: true });
                                                                setOpenCombobox(prev => ({ ...prev, [index]: false }));
                                                            }}
                                                        >
                                                            <Check
                                                                className={cn(
                                                                    "mr-2 h-4 w-4",
                                                                    exercise.id === field.value
                                                                        ? "opacity-100"
                                                                        : "opacity-0"
                                                                )}
                                                            />
                                                            {exercise.name}
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
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
                            <FormItem className="sm:col-span-2">
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
                        {setFields.map((setField, setIndex) => (
                            <div key={setField.id} className="grid grid-cols-12 gap-2 items-end">
                                <div className="col-span-3 sm:col-span-3">
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
                                <div className="col-span-2 sm:col-span-2">
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
                                <div className="col-span-2 sm:col-span-2">
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
                                <div className="col-span-3 sm:col-span-3">
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
                                <div className="col-span-2 sm:col-span-2 flex justify-end">
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
