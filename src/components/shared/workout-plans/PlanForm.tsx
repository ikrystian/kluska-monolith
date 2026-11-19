'use client';

import { useMemo, useState } from 'react';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { TrainingPlan, TrainingLevel, Workout, DayPlan, SetType } from '@/lib/types';
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
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, Loader2, Calendar } from 'lucide-react';
import { useCollection } from '@/lib/db-hooks';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    CUSTOM_DAY_ID_PREFIX,
    CUSTOM_DAY_VALUE,
    CustomDayEditor,
    customDaySchema,
    createCustomDay,
    type CustomDayValues,
} from './PlanCustomDayEditor';

const planSchema = z.object({
    name: z.string().min(1, 'Nazwa jest wymagana.'),
    level: z.nativeEnum(TrainingLevel, { error: 'Poziom jest wymagany.' }),
    description: z.string().optional(),
    stages: z.array(z.object({
        name: z.string().min(1, 'Nazwa etapu jest wymagana.'),
        weeks: z.array(z.object({
            days: z.array(z.string()).length(7), // storing workout IDs, 'Rest Day' or CUSTOM_DAY_VALUE
            custom: z.array(customDaySchema).length(7), // treningi ułożone w planie, indeksowane jak `days`
            challenges: z.array(z.boolean()).length(7), // oznaczenie challenge, indeksowane jak `days`
        })).min(1, 'Przynajmniej jeden tydzień jest wymagany.'),
    })).min(1, 'Przynajmniej jeden etap jest wymagany.'),
});

type PlanFormValues = z.infer<typeof planSchema>;

interface PlanFormProps {
    initialData?: TrainingPlan;
    onSubmit: (data: TrainingPlan) => Promise<void>;
    isLoading?: boolean;
    /** Pozwala układać ćwiczenia, serie i powtórzenia bezpośrednio w dniu planu. */
    allowCustomDays?: boolean;
}

/** Id dnia jako wartość pola (starsze wpisy mają tylko `_id`). */
const rawDayId = (day: DayPlan): string =>
    typeof day === 'string' ? day : day.id ?? (day as Workout & { _id?: string })._id ?? 'Rest Day';

const isCustomDay = (day: DayPlan, allowCustomDays: boolean): day is Workout =>
    allowCustomDays && typeof day !== 'string' && !!day.id?.startsWith(CUSTOM_DAY_ID_PREFIX);

const dayToFormValue = (day: DayPlan, allowCustomDays: boolean): string =>
    isCustomDay(day, allowCustomDays) ? CUSTOM_DAY_VALUE : rawDayId(day);

/** Trening zapisany w planie zamieniony na wartości formularza. */
const workoutToCustomValue = (workout: Workout): NonNullable<CustomDayValues> => ({
    id: workout.id,
    name: workout.name,
    durationMinutes: workout.durationMinutes ?? 60,
    exerciseSeries: workout.exerciseSeries.map(series => ({
        exercise: series.exercise,
        tempo: series.tempo,
        tip: series.tip ?? '',
        sets: series.sets.map(set => ({
            reps: set.reps ?? 0,
            weight: set.weight ?? 0,
            restTimeSeconds: set.restTimeSeconds ?? 0,
        })),
    })),
});

/** Wartości formularza zamienione na trening zapisywany w planie (ten sam kształt co w bibliotece). */
const customValueToWorkout = (custom: NonNullable<CustomDayValues>, level: TrainingLevel): Workout => ({
    id: custom.id,
    name: custom.name,
    level,
    durationMinutes: custom.durationMinutes,
    exerciseSeries: custom.exerciseSeries.map(series => ({
        exercise: series.exercise,
        tempo: series.tempo,
        tip: series.tip,
        sets: series.sets.map((set, idx) => ({
            number: idx + 1,
            type: SetType.WorkingSet,
            reps: set.reps,
            weight: set.weight,
            restTimeSeconds: set.restTimeSeconds,
        })),
    })),
});

export function PlanForm({ initialData, onSubmit, isLoading, allowCustomDays = false }: PlanFormProps) {
    const { data: workouts, isLoading: workoutsLoading } = useCollection<Workout>('workouts');

    // Plan przechowuje pełne kopie treningów. Trening mógł już zniknąć z biblioteki —
    // wtedy jego kopia z planu musi przetrwać edycję, zamiast po cichu stać się dniem wolnym.
    const savedWorkouts = useMemo(() => {
        const saved = new Map<string, Workout>();
        initialData?.stages?.forEach(stage => stage.weeks.forEach(week => week.days.forEach(day => {
            const id = rawDayId(day);
            if (typeof day !== 'string' && id !== 'Rest Day' && !isCustomDay(day, allowCustomDays)) saved.set(id, day);
        })));
        return saved;
    }, [initialData, allowCustomDays]);

    const workoutOptions = useMemo(() => {
        const library = workouts ?? [];
        const inLibrary = new Set(library.map(workout => workout.id));
        const missing = [...savedWorkouts].filter(([id]) => !inLibrary.has(id)).map(([id, workout]) => ({ ...workout, id }));
        return [...library, ...missing];
    }, [workouts, savedWorkouts]);

    const form = useForm<PlanFormValues>({
        resolver: zodResolver(planSchema),
        defaultValues: {
            name: initialData?.name || '',
            level: initialData?.level || TrainingLevel.Beginner,
            description: initialData?.description || '',
            stages: initialData?.stages?.map(stage => ({
                name: stage.name,
                weeks: stage.weeks.map(week => ({
                    days: week.days.map(day => dayToFormValue(day, allowCustomDays)),
                    custom: week.days.map(day => (isCustomDay(day, allowCustomDays) ? workoutToCustomValue(day) : null)),
                    challenges: week.days.map(day => typeof day !== 'string' && !!day.isChallenge),
                })),
            })) || [{ name: 'Etap 1', weeks: [{ days: Array(7).fill('Rest Day'), custom: Array(7).fill(null), challenges: Array(7).fill(false) }] }],
        },
    });

    const { fields: stageFields, append: appendStage, remove: removeStage } = useFieldArray({
        control: form.control,
        name: 'stages',
    });

    const handleSubmit = async (data: PlanFormValues) => {
        if (!workouts) return;

        // Map form data back to TrainingPlan structure
        const mappedStages = data.stages.map(stage => ({
            name: stage.name,
            weeks: stage.weeks.map(week => ({
                days: week.days.map((dayId, dayIndex) => {
                    if (dayId === 'Rest Day') return 'Rest Day';
                    const isChallenge = week.challenges[dayIndex];
                    if (allowCustomDays && dayId === CUSTOM_DAY_VALUE) {
                        const custom = week.custom[dayIndex];
                        return custom ? { ...customValueToWorkout(custom, data.level), isChallenge } : 'Rest Day';
                    }
                    // Aktualna wersja z biblioteki, a gdy trening usunięto — kopia zapisana w planie.
                    const workout = workouts.find(w => w.id === dayId) ?? savedWorkouts.get(dayId);
                    return workout ? { ...workout, isChallenge } : 'Rest Day';
                }) as [DayPlan, DayPlan, DayPlan, DayPlan, DayPlan, DayPlan, DayPlan]
            }))
        }));

        const planData: any = {
            ...initialData,
            name: data.name,
            level: data.level,
            description: data.description,
            stages: mappedStages,
        };

        await onSubmit(planData);
    };

    const daysOfWeek = ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota', 'Niedziela'];

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Szczegóły Planu</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-4 sm:grid-cols-2">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nazwa Planu</FormLabel>
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
                        <h2 className="text-xl font-semibold">Etapy Treningowe</h2>
                        <Button type="button" onClick={() => appendStage({ name: `Etap ${stageFields.length + 1}`, weeks: [{ days: Array(7).fill('Rest Day'), custom: Array(7).fill(null), challenges: Array(7).fill(false) }] })} variant="outline">
                            <Plus className="mr-2 h-4 w-4" /> Dodaj Etap
                        </Button>
                    </div>

                    {stageFields.map((stageField, stageIndex) => (
                        <Card key={stageField.id}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <div className="flex items-center gap-4 w-full">
                                    <FormField
                                        control={form.control}
                                        name={`stages.${stageIndex}.name`}
                                        render={({ field }) => (
                                            <FormItem className="flex-grow">
                                                <FormControl><Input {...field} placeholder="Nazwa etapu" className="font-semibold text-lg" disabled={isLoading} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                <Button type="button" variant="ghost" size="sm" onClick={() => removeStage(stageIndex)} disabled={isLoading}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                            </CardHeader>
                            <CardContent>
                                <StageWeeks
                                    stageIndex={stageIndex}
                                    form={form}
                                    workouts={workoutOptions}
                                    daysOfWeek={daysOfWeek}
                                    isLoading={isLoading}
                                    allowCustomDays={allowCustomDays}
                                />
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <div className="flex justify-end">
                    {/* Bez listy treningów zapis nie ma z czego złożyć planu, więc czekamy na jej wczytanie. */}
                    <Button type="submit" size="lg" disabled={isLoading || workoutsLoading || !workouts}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Zapisz Plan
                    </Button>
                </div>
            </form>
        </Form>
    );
}

interface StageWeeksProps {
    stageIndex: number;
    form: ReturnType<typeof useForm<PlanFormValues>>;
    workouts: Workout[];
    daysOfWeek: string[];
    isLoading?: boolean;
    allowCustomDays: boolean;
}

function StageWeeks({ stageIndex, form, workouts, daysOfWeek, isLoading, allowCustomDays }: StageWeeksProps) {
    const { fields: weekFields, append: appendWeek, remove: removeWeek } = useFieldArray({
        control: form.control,
        name: `stages.${stageIndex}.weeks`,
    });
    // Zakładka sterowana: po usunięciu tygodnia aktywna musi wskazywać istniejący tydzień.
    const [activeWeek, setActiveWeek] = useState('week-0');

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-muted-foreground">Tygodnie w tym etapie</h4>
                <Button type="button" variant="secondary" size="sm" onClick={() => { appendWeek({ days: Array(7).fill('Rest Day'), custom: Array(7).fill(null), challenges: Array(7).fill(false) }); setActiveWeek(`week-${weekFields.length}`); }} disabled={isLoading}>
                    <Plus className="mr-2 h-3 w-3" /> Dodaj Tydzień
                </Button>
            </div>
            <Tabs value={activeWeek} onValueChange={setActiveWeek} className="w-full">
                <TabsList className="w-full justify-start overflow-x-auto">
                    {weekFields.map((_, index) => (
                        <TabsTrigger key={index} value={`week-${index}`}>Tydzień {index + 1}</TabsTrigger>
                    ))}
                </TabsList>
                {weekFields.map((weekField, weekIndex) => (
                    <TabsContent key={weekField.id} value={`week-${weekIndex}`} className="space-y-4 mt-4">
                        <div className="flex justify-end">
                            <Button type="button" variant="ghost" size="sm" onClick={() => { removeWeek(weekIndex); setActiveWeek(`week-${Math.max(0, Math.min(weekIndex, weekFields.length - 2))}`); }} disabled={weekFields.length === 1 || isLoading} className="text-destructive">
                                <Trash2 className="mr-2 h-3 w-3" /> Usuń Tydzień
                            </Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {daysOfWeek.map((dayName: string, dayIndex: number) => (
                                <Card key={dayIndex} className="border-dashed">
                                    <CardHeader className="p-4 pb-2">
                                        <CardTitle className="text-sm font-medium flex items-center">
                                            <Calendar className="mr-2 h-3 w-3" />
                                            {dayName}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-4 pt-2">
                                        <FormField
                                            control={form.control}
                                            name={`stages.${stageIndex}.weeks.${weekIndex}.days.${dayIndex}`}
                                            render={({ field }) => (
                                                <FormItem>
                                                    <Select
                                                        onValueChange={(value) => {
                                                            if (allowCustomDays) {
                                                                const customPath = `stages.${stageIndex}.weeks.${weekIndex}.custom.${dayIndex}` as const;
                                                                if (value === CUSTOM_DAY_VALUE && !form.getValues(customPath)) {
                                                                    form.setValue(customPath, createCustomDay(dayName), { shouldDirty: true });
                                                                } else if (value !== CUSTOM_DAY_VALUE && field.value === CUSTOM_DAY_VALUE) {
                                                                    form.setValue(customPath, null, { shouldDirty: true });
                                                                }
                                                            }
                                                            field.onChange(value);
                                                        }}
                                                        defaultValue={field.value}
                                                        disabled={isLoading}
                                                    >
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Wybierz trening" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="Rest Day">Rest Day</SelectItem>
                                                            {allowCustomDays && (
                                                                <SelectItem value={CUSTOM_DAY_VALUE}>Własne ćwiczenia</SelectItem>
                                                            )}
                                                            {workouts.map((workout: Workout) => (
                                                                <SelectItem key={workout.id} value={workout.id}>{workout.name}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </FormItem>
                                            )}
                                        />
                                        <ChallengeSwitch form={form} stageIndex={stageIndex} weekIndex={weekIndex} dayIndex={dayIndex} isLoading={isLoading} />
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                        {allowCustomDays && (
                            <WeekCustomEditors
                                form={form}
                                stageIndex={stageIndex}
                                weekIndex={weekIndex}
                                daysOfWeek={daysOfWeek}
                                isLoading={isLoading}
                            />
                        )}
                    </TabsContent>
                ))}
            </Tabs>
        </div>
    )
}

/** Przełącznik „Challenge” dla dnia; dni wolne nie mogą być challenge. */
function ChallengeSwitch({ form, stageIndex, weekIndex, dayIndex, isLoading }: {
    form: StageWeeksProps['form'];
    stageIndex: number;
    weekIndex: number;
    dayIndex: number;
    isLoading?: boolean;
}) {
    const dayValue = useWatch({ control: form.control, name: `stages.${stageIndex}.weeks.${weekIndex}.days.${dayIndex}` });

    return (
        <FormField
            control={form.control}
            name={`stages.${stageIndex}.weeks.${weekIndex}.challenges.${dayIndex}`}
            render={({ field }) => (
                <FormItem className="mt-3 flex items-center justify-between space-y-0">
                    <FormLabel className="text-xs font-medium">Challenge</FormLabel>
                    <FormControl>
                        <Switch
                            checked={!!field.value}
                            onCheckedChange={field.onChange}
                            disabled={isLoading || dayValue === 'Rest Day'}
                        />
                    </FormControl>
                </FormItem>
            )}
        />
    );
}

/** Edytory własnych treningów dla dni tygodnia ustawionych na „Własne ćwiczenia”. */
function WeekCustomEditors({ form, stageIndex, weekIndex, daysOfWeek, isLoading }: {
    form: StageWeeksProps['form'];
    stageIndex: number;
    weekIndex: number;
    daysOfWeek: string[];
    isLoading?: boolean;
}) {
    const days = useWatch({ control: form.control, name: `stages.${stageIndex}.weeks.${weekIndex}.days` });

    return (
        <div className="space-y-4">
            {days?.map((value, dayIndex) => value === CUSTOM_DAY_VALUE && (
                <CustomDayEditor
                    key={dayIndex}
                    form={form}
                    basePath={`stages.${stageIndex}.weeks.${weekIndex}.custom.${dayIndex}`}
                    title={`${daysOfWeek[dayIndex]} — własne ćwiczenia`}
                    isLoading={isLoading}
                />
            ))}
        </div>
    );
}
