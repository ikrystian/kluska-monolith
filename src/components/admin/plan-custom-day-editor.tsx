'use client';

import { useState } from 'react';
import { useFieldArray, type UseFormReturn } from 'react-hook-form';
import { z } from 'zod';
import { Exercise } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, Trash2, Check, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCollection } from '@/lib/db-hooks';

/** Wartość w liście dni oznaczająca trening ułożony bezpośrednio w planie. */
export const CUSTOM_DAY_VALUE = '__custom__';
/** Prefiks id treningów tworzonych w planie — odróżnia je od treningów z biblioteki. */
export const CUSTOM_DAY_ID_PREFIX = 'plan-day-';

const setSchema = z.object({
    reps: z.coerce.number<number>().min(0),
    weight: z.coerce.number<number>().min(0),
    restTimeSeconds: z.coerce.number<number>().min(0),
});

const seriesSchema = z.object({
    // Pełna kopia ćwiczenia z biblioteki (jak w treningach), ustawiana przy wyborze z listy.
    exercise: z.any().refine(value => !!value, { message: 'Wybierz ćwiczenie z listy.' }),
    tempo: z.string().min(1, 'Tempo jest wymagane (np. 3-0-1-0).'),
    tip: z.string().optional(),
    sets: z.array(setSchema).min(1, 'Przynajmniej jedna seria jest wymagana.'),
});

export const customDaySchema = z.object({
    id: z.string(),
    name: z.string().min(1, 'Nazwa treningu jest wymagana.'),
    durationMinutes: z.coerce.number<number>().min(1, 'Czas trwania musi być większy od 0.'),
    exerciseSeries: z.array(seriesSchema).min(1, 'Dodaj przynajmniej jedno ćwiczenie.'),
}).nullable();

export type CustomDayValues = NonNullable<z.infer<typeof customDaySchema>>;

export function createCustomDay(name: string): CustomDayValues {
    return {
        id: `${CUSTOM_DAY_ID_PREFIX}${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        name,
        durationMinutes: 60,
        exerciseSeries: [],
    };
}

/** Odczyt zagnieżdżonej ścieżki (np. `a.b.0.c`) z obiektu błędów react-hook-form. */
const getPath = (source: unknown, path: string): any =>
    path.split('.').reduce<any>((acc, key) => (acc == null ? undefined : acc[key]), source);

interface CustomDayEditorProps {
    form: UseFormReturn<any>;
    /** Ścieżka do wartości dnia w formularzu, np. `stages.0.weeks.1.custom.2`. */
    basePath: string;
    title: string;
    isLoading?: boolean;
}

export function CustomDayEditor({ form, basePath, title, isLoading }: CustomDayEditorProps) {
    const { data: exercises } = useCollection<Exercise>('exercises');
    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: `${basePath}.exerciseSeries`,
    });
    const [openCombobox, setOpenCombobox] = useState<Record<string, boolean>>({});

    const seriesError = getPath(form.formState.errors, `${basePath}.exerciseSeries`);
    const seriesErrorMessage: string | undefined = seriesError?.root?.message ?? seriesError?.message;

    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">{title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                        control={form.control}
                        name={`${basePath}.name`}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Nazwa treningu</FormLabel>
                                <FormControl><Input {...field} disabled={isLoading} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name={`${basePath}.durationMinutes`}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Czas trwania (min)</FormLabel>
                                <FormControl><Input type="number" {...field} disabled={isLoading} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                {fields.map((field, index) => (
                    <ExerciseRow
                        key={field.id}
                        form={form}
                        basePath={basePath}
                        index={index}
                        exercises={exercises ?? []}
                        isOpen={!!openCombobox[field.id]}
                        setOpen={(open) => setOpenCombobox(prev => ({ ...prev, [field.id]: open }))}
                        onRemove={() => remove(index)}
                        isLoading={isLoading}
                    />
                ))}

                {seriesErrorMessage && <p className="text-sm font-medium text-destructive">{seriesErrorMessage}</p>}

                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => append({ exercise: null, tempo: '3-0-1-0', tip: '', sets: [{ reps: 10, weight: 0, restTimeSeconds: 60 }] })}
                    disabled={isLoading}
                >
                    <Plus className="mr-2 h-4 w-4" /> Dodaj ćwiczenie
                </Button>
            </CardContent>
        </Card>
    );
}

interface ExerciseRowProps {
    form: UseFormReturn<any>;
    basePath: string;
    index: number;
    exercises: Exercise[];
    isOpen: boolean;
    setOpen: (open: boolean) => void;
    onRemove: () => void;
    isLoading?: boolean;
}

function ExerciseRow({ form, basePath, index, exercises, isOpen, setOpen, onRemove, isLoading }: ExerciseRowProps) {
    const seriesPath = `${basePath}.exerciseSeries.${index}`;
    const { fields: setFields, append: appendSet, remove: removeSet } = useFieldArray({
        control: form.control,
        name: `${seriesPath}.sets`,
    });

    return (
        <Card className="border-dashed">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ćwiczenie #{index + 1}</CardTitle>
                <Button type="button" variant="ghost" size="sm" onClick={onRemove} disabled={isLoading}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                        control={form.control}
                        name={`${seriesPath}.exercise`}
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel>Ćwiczenie</FormLabel>
                                <Popover open={isOpen} onOpenChange={setOpen}>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button
                                                variant="outline"
                                                role="combobox"
                                                className={cn('w-full justify-between', !field.value && 'text-muted-foreground')}
                                                disabled={isLoading}
                                            >
                                                {field.value?.name ?? 'Wybierz ćwiczenie'}
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
                                                    {exercises.map((exercise) => (
                                                        <CommandItem
                                                            value={exercise.name}
                                                            key={exercise.id}
                                                            onSelect={() => {
                                                                form.setValue(`${seriesPath}.exercise`, exercise, { shouldValidate: true, shouldDirty: true });
                                                                setOpen(false);
                                                            }}
                                                        >
                                                            <Check className={cn('mr-2 h-4 w-4', exercise.id === field.value?.id ? 'opacity-100' : 'opacity-0')} />
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
                        name={`${seriesPath}.tempo`}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Tempo</FormLabel>
                                <FormControl><Input {...field} placeholder="3-0-1-0" disabled={isLoading} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <Separator />

                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium">Serie</h4>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => appendSet({ reps: 10, weight: 0, restTimeSeconds: 60 })}
                            disabled={isLoading}
                        >
                            <Plus className="mr-2 h-3 w-3" /> Dodaj serię
                        </Button>
                    </div>
                    {setFields.map((setField, setIndex) => (
                        <div key={setField.id} className="grid grid-cols-12 gap-2 items-end">
                            <div className="col-span-1 pb-2 text-xs text-muted-foreground">{setIndex + 1}.</div>
                            <div className="col-span-4">
                                <FormField
                                    control={form.control}
                                    name={`${seriesPath}.sets.${setIndex}.reps`}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs">Powt.</FormLabel>
                                            <FormControl><Input type="number" className="h-8 text-xs" {...field} disabled={isLoading} /></FormControl>
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <div className="col-span-3">
                                <FormField
                                    control={form.control}
                                    name={`${seriesPath}.sets.${setIndex}.weight`}
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
                                    name={`${seriesPath}.sets.${setIndex}.restTimeSeconds`}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs">Przerwa (s)</FormLabel>
                                            <FormControl><Input type="number" className="h-8 text-xs" {...field} disabled={isLoading} /></FormControl>
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <div className="col-span-1 flex justify-end">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    onClick={() => removeSet(setIndex)}
                                    disabled={isLoading || setFields.length === 1}
                                >
                                    <Trash2 className="h-3 w-3 text-destructive" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
