'use client';

import { useEffect, useState } from 'react';
import { useForm, useFieldArray, type FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrainingLevel, SetType, Exercise, Workout } from '@/lib/types';
import { useCollection, useCreateDoc, useUser } from '@/lib/db-hooks';
import {
    Loader2,
    Plus,
    Trash2,
    Dumbbell,
    Timer,
    ChevronDown,
    Copy,
    MoreVertical,
    ArrowUp,
    ArrowDown,
    Flame,
    Search,
    Save,
    NotebookPen,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { SetTypeModal } from '@/components/workout/SetTypeModal';
import { type ExerciseType, getSetTypeConfig } from '@/lib/set-type-config';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion, listItemMotion } from '@/components/motion';
import { FormFieldWithValidation } from '@/components/workout/FormFieldWithValidation';
import { useWorkoutDraft } from '@/hooks/useWorkoutDraft';
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges';
import { UnsavedChangesDialog } from '@/components/workout/UnsavedChangesDialog';
import { SET_TEMPLATES, SetTemplate } from '@/lib/set-templates';
import { ExerciseSelector } from '@/components/workout/ExerciseSelector';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { formatDistanceToNow } from 'date-fns';
import { pl } from 'date-fns/locale';

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
    status: z.enum(['draft', 'published']).default('draft'),
});

type WorkoutFormValues = z.infer<typeof workoutSchema>;

interface CreateWorkoutProps {
    onSuccess?: () => void;
    redirectPath?: string;
}

interface ConfirmState {
    title: string;
    description: string;
    onConfirm: () => void;
}

const LEVEL_OPTIONS: { value: TrainingLevel; label: string }[] = [
    { value: TrainingLevel.Beginner, label: 'Początkujący' },
    { value: TrainingLevel.Intermediate, label: 'Średni' },
    { value: TrainingLevel.Advanced, label: 'Zaawansowany' },
];

function formatSeriesCount(n: number) {
    if (n === 1) return '1 seria';
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${n} serie`;
    return `${n} serii`;
}

export function CreateWorkout({ onSuccess, redirectPath }: CreateWorkoutProps) {
    const { user } = useUser();
    const { toast } = useToast();
    const navigate = useNavigate();
    const { createDoc, isLoading: isCreating } = useCreateDoc();
    const { data: exercises, isLoading: exercisesLoading } = useCollection<Exercise>('exercises');
    const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
    const [openExerciseIndex, setOpenExerciseIndex] = useState<number | null>(0);
    const [confirm, setConfirm] = useState<ConfirmState | null>(null);
    // Index of a freshly added exercise whose picker dialog should open automatically.
    const [autoPickIndex, setAutoPickIndex] = useState<number | null>(null);
    const [extrasOpen, setExtrasOpen] = useState(false);

    const { draft, lastAutoSave, saveToLocal, clearDraft } = useWorkoutDraft<WorkoutFormValues>('create-workout-draft');

    const form = useForm<WorkoutFormValues>({
        resolver: zodResolver(workoutSchema),
        defaultValues: {
            name: '',
            imageUrl: '',
            level: TrainingLevel.Beginner,
            durationMinutes: 60,
            exerciseSeries: [],
            status: 'draft',
        },
    });

    // Load draft if exists
    useEffect(() => {
        if (draft) {
            if (!form.formState.isDirty) {
                form.reset(draft.data);
                toast({ title: 'Przywrócono szkic', description: 'Twoja ostatnia praca została przywrócona.' });
            }
        }
    }, [draft, form, toast]);

    // Auto-save — only once the user actually changed something, so a pristine
    // mount never overwrites a stored draft before it gets restored.
    useEffect(() => {
        const subscription = form.watch((value) => {
            if (value && form.formState.isDirty) {
                saveToLocal(value as WorkoutFormValues);
            }
        });
        return () => subscription.unsubscribe();
    }, [form, saveToLocal]);

    // Auto-calculate duration. Skipped for an empty form — recalculating 60 → 5
    // on mount would dirty the form and break draft restoration.
    const exerciseSeries = form.watch('exerciseSeries');
    useEffect(() => {
        if (!exerciseSeries || exerciseSeries.length === 0) return;

        let totalSeconds = 0;
        const EXERCISE_TRANSITION_SECONDS = 120; // 2 minutes setup/transition per exercise
        const AVG_REP_SECONDS = 4; // Average 4 seconds per rep

        exerciseSeries.forEach(series => {
            // Add transition time for each exercise
            totalSeconds += EXERCISE_TRANSITION_SECONDS;

            if (series.sets) {
                series.sets.forEach(set => {
                    // Add rest time
                    totalSeconds += Number(set.restTimeSeconds || 0);

                    // Add active time
                    if (set.duration) {
                        totalSeconds += Number(set.duration);
                    } else if (set.reps) {
                        totalSeconds += Number(set.reps) * AVG_REP_SECONDS;
                    } else {
                        // Fallback for empty sets
                        totalSeconds += 30;
                    }
                });
            }
        });

        // Round up to nearest 5 minutes, minimum 5 minutes
        const minutes = Math.max(5, Math.ceil(totalSeconds / 60 / 5) * 5);

        const currentDuration = form.getValues('durationMinutes');
        if (currentDuration !== minutes) {
            form.setValue('durationMinutes', minutes, { shouldValidate: true, shouldDirty: true });
        }
    }, [exerciseSeries, form]);

    const handleSaveDraft = async () => {
        const data = form.getValues();
        data.status = 'draft';
        await handleSubmission(data, 'draft');
        setShowUnsavedDialog(false);
    };

    const handleDiscardDraft = () => {
        setShowUnsavedDialog(true);
    };

    const confirmDiscard = () => {
        clearDraft();
        form.reset({
            name: '',
            imageUrl: '',
            level: TrainingLevel.Beginner,
            durationMinutes: 60,
            exerciseSeries: [],
            status: 'draft',
        });
        toast({ title: 'Szkic odrzucony', description: 'Formularz został wyczyszczony.' });
        setShowUnsavedDialog(false);
    };

    useUnsavedChanges(form.formState.isDirty);

    const handleSubmission = async (data: WorkoutFormValues, status: 'draft' | 'published') => {
        if (!user) return;

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

            const newWorkout: Omit<Workout, 'id'> & { ownerId: string } = {
                name: data.name,
                imageUrl: data.imageUrl,
                level: data.level,
                durationMinutes: data.durationMinutes,
                exerciseSeries: fullExerciseSeries,
                ownerId: user.uid,
                description: data.description,
                status: status,
            } as any;

            await createDoc('workouts', newWorkout);

            if (status === 'published') {
                clearDraft(); // Clear local draft on successful publish
                toast({ title: 'Sukces', description: 'Trening został opublikowany.' });
                if (onSuccess) onSuccess();
                if (redirectPath) navigate(redirectPath);
            } else {
                toast({ title: 'Zapisano szkic', description: 'Trening został zapisany jako szkic.' });
            }

        } catch (error) {
            console.error(error);
            toast({
                title: 'Błąd',
                description: 'Nie udało się zapisać treningu.',
                variant: 'destructive'
            });
        }
    };

    const { fields: exerciseFields, append: appendExercise, remove: removeExercise, move: moveExercise } = useFieldArray({
        control: form.control,
        name: 'exerciseSeries',
    });

    const onSubmit = async (data: WorkoutFormValues) => {
        await handleSubmission(data, 'published');
    };

    // Open the first invalid exercise card so the error is visible on a small screen.
    const onInvalid = (errors: FieldErrors<WorkoutFormValues>) => {
        const seriesErrors = errors.exerciseSeries;
        if (Array.isArray(seriesErrors)) {
            const firstIdx = seriesErrors.findIndex(Boolean);
            if (firstIdx >= 0) setOpenExerciseIndex(firstIdx);
        }
        const rootMessage = (errors.exerciseSeries as { message?: string } | undefined)?.message
            ?? (errors.exerciseSeries as { root?: { message?: string } } | undefined)?.root?.message;
        toast({
            title: 'Uzupełnij formularz',
            description: rootMessage ?? 'Popraw zaznaczone pola przed utworzeniem treningu.',
            variant: 'destructive',
        });
    };

    const handleAddExercise = () => {
        const series = form.getValues('exerciseSeries');
        const lastIndex = series.length - 1;
        if (lastIndex >= 0 && !series[lastIndex].exerciseId) {
            toast({
                title: 'Najpierw wybierz ćwiczenie',
                description: 'Uzupełnij poprzednią pozycję przed dodaniem kolejnej.',
                variant: 'destructive',
            });
            setOpenExerciseIndex(lastIndex);
            setAutoPickIndex(lastIndex);
            return;
        }

        appendExercise({ exerciseId: '', sets: [{ type: SetType.WorkingSet, reps: 10, weight: 0, restTimeSeconds: 60 }] });
        // Open the new exercise and jump straight into the picker — one tap less.
        setOpenExerciseIndex(exerciseFields.length);
        setAutoPickIndex(exerciseFields.length);
    };

    const handleRemoveExercise = (index: number) => {
        setConfirm({
            title: 'Usunąć ćwiczenie?',
            description: 'Stracisz wszystkie serie dodane do tego ćwiczenia.',
            onConfirm: () => {
                removeExercise(index);
                if (openExerciseIndex === index) {
                    setOpenExerciseIndex(null);
                }
            },
        });
    };

    if (exercisesLoading) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
    }

    const totalSets = exerciseSeries?.reduce((acc, s) => acc + (s.sets?.length ?? 0), 0) ?? 0;
    const durationMinutes = form.watch('durationMinutes');
    const level = form.watch('level');

    return (
        <form
            onSubmit={form.handleSubmit(onSubmit, onInvalid)}
            onKeyDown={(e) => {
                // The mobile keyboard "Enter/Go" must not publish a half-finished workout.
                if (e.key === 'Enter' && (e.target as HTMLElement).tagName === 'INPUT') e.preventDefault();
            }}
            className="mx-auto max-w-2xl space-y-4"
        >
            {(!!draft || !!lastAutoSave) && (
                <div className="flex items-center justify-between gap-2 rounded-xl border border-dashed bg-muted/40 px-3 py-1.5">
                    <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
                        {isCreating ? (
                            <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
                        ) : (
                            <Save className="h-3.5 w-3.5 shrink-0" />
                        )}
                        <span className="truncate">
                            {isCreating
                                ? 'Zapisywanie…'
                                : lastAutoSave
                                    ? `Autozapis ${formatDistanceToNow(lastAutoSave, { addSuffix: true, locale: pl })}`
                                    : 'Przywrócono szkic'}
                        </span>
                    </div>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 shrink-0 px-2 text-xs text-destructive hover:text-destructive"
                        onClick={handleDiscardDraft}
                    >
                        Odrzuć szkic
                    </Button>
                </div>
            )}

            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base">Szczegóły treningu</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <FormFieldWithValidation
                        label="Nazwa treningu"
                        error={form.formState.errors.name?.message}
                        touched={form.formState.touchedFields.name}
                        required
                    >
                        <Input
                            {...form.register('name')}
                            placeholder="np. Full Body A"
                            className="h-11 text-base"
                        />
                    </FormFieldWithValidation>

                    <FormFieldWithValidation
                        label="Poziom"
                        error={form.formState.errors.level?.message}
                        touched={form.formState.touchedFields.level}
                        required
                    >
                        <div className="grid grid-cols-3 gap-1 rounded-xl bg-secondary/60 p-1">
                            {LEVEL_OPTIONS.map((opt) => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => form.setValue('level', opt.value, { shouldValidate: true, shouldDirty: true })}
                                    className={cn(
                                        'h-10 rounded-lg px-1 text-xs font-semibold transition-colors sm:text-sm',
                                        level === opt.value
                                            ? 'bg-background text-foreground shadow-soft'
                                            : 'text-muted-foreground active:scale-95'
                                    )}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </FormFieldWithValidation>

                    <div className="flex items-center gap-3 rounded-xl bg-secondary/40 px-3 py-2.5">
                        <Timer className="h-5 w-5 shrink-0 text-muted-foreground" />
                        <div className="min-w-0">
                            <p className="text-sm font-semibold tabular-nums">≈ {durationMinutes} min</p>
                            <p className="text-xs text-muted-foreground">Szacowany czas — liczony automatycznie z serii i przerw</p>
                        </div>
                    </div>

                    <Collapsible open={extrasOpen} onOpenChange={setExtrasOpen}>
                        <CollapsibleTrigger asChild>
                            <Button
                                type="button"
                                variant="ghost"
                                className="h-10 w-full justify-between px-2 text-sm font-normal text-muted-foreground"
                            >
                                Opis i zdjęcie (opcjonalne)
                                <ChevronDown className={cn('h-4 w-4 transition-transform', extrasOpen && 'rotate-180')} />
                            </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="space-y-4 pt-2">
                            <FormFieldWithValidation
                                label="Opis"
                                error={form.formState.errors.description?.message}
                                touched={form.formState.touchedFields.description}
                            >
                                <Textarea {...form.register('description')} placeholder="Krótki opis treningu..." className="text-base" />
                            </FormFieldWithValidation>
                            <FormFieldWithValidation
                                label="URL obrazka"
                                error={form.formState.errors.imageUrl?.message}
                                touched={form.formState.touchedFields.imageUrl}
                            >
                                <Input {...form.register('imageUrl')} placeholder="https://..." inputMode="url" className="h-11 text-base" />
                            </FormFieldWithValidation>
                        </CollapsibleContent>
                    </Collapsible>
                </CardContent>
            </Card>

            <div className="space-y-3">
                <h2 className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Ćwiczenia{exerciseFields.length > 0 && ` (${exerciseFields.length})`}
                </h2>

                {exerciseFields.length === 0 ? (
                    <Card className="border-dashed">
                        <CardContent className="flex flex-col items-center gap-3 px-4 py-8 text-center">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                                <Dumbbell className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <p className="font-semibold">Brak ćwiczeń</p>
                                <p className="text-sm text-muted-foreground">Dodaj pierwsze ćwiczenie, aby ułożyć trening.</p>
                            </div>
                            <Button type="button" onClick={handleAddExercise} className="h-12 w-full max-w-xs text-base">
                                <Plus className="mr-2 h-5 w-5" /> Dodaj ćwiczenie
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <>
                        <AnimatePresence initial={false}>
                            {exerciseFields.map((field, index) => (
                                <motion.div key={field.id} {...listItemMotion}>
                                    <ExerciseSeriesItem
                                        index={index}
                                        form={form}
                                        remove={handleRemoveExercise}
                                        move={moveExercise}
                                        isFirst={index === 0}
                                        isLast={index === exerciseFields.length - 1}
                                        exercises={exercises || []}
                                        isOpen={openExerciseIndex === index}
                                        onToggle={() => setOpenExerciseIndex(openExerciseIndex === index ? null : index)}
                                        onConfirmRequest={setConfirm}
                                        autoOpenPicker={autoPickIndex === index}
                                        onPickerAutoOpened={() => setAutoPickIndex(null)}
                                    />
                                </motion.div>
                            ))}
                        </AnimatePresence>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleAddExercise}
                            className="h-12 w-full border-dashed text-base"
                        >
                            <Plus className="mr-2 h-5 w-5" /> Dodaj ćwiczenie
                        </Button>
                    </>
                )}
            </div>

            <Card>
                <CardContent className="space-y-3 p-4">
                    <div className="grid grid-cols-3 divide-x divide-border/60 rounded-xl bg-secondary/40 py-2.5 text-center">
                        <div>
                            <p className="text-lg font-bold tabular-nums">{exerciseFields.length}</p>
                            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Ćwiczenia</p>
                        </div>
                        <div>
                            <p className="text-lg font-bold tabular-nums">{totalSets}</p>
                            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Serie</p>
                        </div>
                        <div>
                            <p className="text-lg font-bold tabular-nums">≈{durationMinutes}</p>
                            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Minut</p>
                        </div>
                    </div>
                    <Button type="submit" size="lg" disabled={isCreating} className="h-12 w-full text-base font-semibold">
                        {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Utwórz trening
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        disabled={isCreating}
                        onClick={handleSaveDraft}
                        className="h-11 w-full"
                    >
                        <Save className="mr-2 h-4 w-4" /> Zapisz jako szkic
                    </Button>
                </CardContent>
            </Card>

            <UnsavedChangesDialog
                open={showUnsavedDialog}
                onConfirm={confirmDiscard}
                onCancel={() => setShowUnsavedDialog(false)}
                onSaveDraft={handleSaveDraft}
            />

            <AlertDialog open={!!confirm} onOpenChange={(open) => !open && setConfirm(null)}>
                <AlertDialogContent className="max-w-[calc(100vw-2rem)] rounded-2xl sm:max-w-md">
                    <AlertDialogHeader>
                        <AlertDialogTitle>{confirm?.title}</AlertDialogTitle>
                        <AlertDialogDescription>{confirm?.description}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Anuluj</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => {
                                confirm?.onConfirm();
                                setConfirm(null);
                            }}
                        >
                            Usuń
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
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
    onToggle,
    onConfirmRequest,
    autoOpenPicker,
    onPickerAutoOpened,
}: {
    index: number,
    form: any,
    remove: (index: number) => void,
    move: (from: number, to: number) => void,
    isFirst: boolean,
    isLast: boolean,
    exercises: Exercise[],
    isOpen: boolean,
    onToggle: () => void,
    onConfirmRequest: (confirm: ConfirmState) => void,
    autoOpenPicker: boolean,
    onPickerAutoOpened: () => void,
}) {
    const [exerciseDialogOpen, setExerciseDialogOpen] = useState(false);
    const { toast } = useToast();
    const { fields: setFields, append: appendSet, remove: removeSet } = useFieldArray({
        control: form.control,
        name: `exerciseSeries.${index}.sets`,
    });

    const selectedExerciseId = form.watch(`exerciseSeries.${index}.exerciseId`);
    const selectedExercise = exercises.find(e => e.id === selectedExerciseId);
    const exerciseType: ExerciseType = selectedExercise?.type || 'weight';
    const [weightUnit, setWeightUnit] = useState<'kg' | 'rpe'>(() =>
        form.getValues(`exerciseSeries.${index}.sets.0.weightUnit`) === 'rpe' ? 'rpe' : 'kg'
    );
    const [notesOpen, setNotesOpen] = useState<boolean>(() =>
        !!(form.getValues(`exerciseSeries.${index}.tempo`) || form.getValues(`exerciseSeries.${index}.tip`))
    );

    const exerciseError = form.formState.errors.exerciseSeries?.[index]?.exerciseId?.message;
    const setsErrors = form.formState.errors.exerciseSeries?.[index]?.sets;
    const setsErrorMessage: string | undefined = setsErrors?.message ?? setsErrors?.root?.message
        ?? (setsErrors ? 'Sprawdź wartości serii.' : undefined);

    useEffect(() => {
        if (autoOpenPicker) {
            setExerciseDialogOpen(true);
            onPickerAutoOpened();
        }
    }, [autoOpenPicker, onPickerAutoOpened]);

    const handleChangeWeightUnit = (unit: 'kg' | 'rpe') => {
        setWeightUnit(unit);
        const sets = form.getValues(`exerciseSeries.${index}.sets`);
        sets.forEach((_: any, setIndex: number) => {
            form.setValue(`exerciseSeries.${index}.sets.${setIndex}.weightUnit`, unit);
        });
    };

    const handleAddSet = (type: SetType = SetType.WorkingSet) => {
        const sets = form.getValues(`exerciseSeries.${index}.sets`);
        const lastSet = sets[sets.length - 1];

        if (lastSet) {
            // Smart add: copy values from last set but override type if provided
            appendSet({ ...lastSet, type });
        } else {
            // Default new set with weightUnit
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
        onConfirmRequest({
            title: 'Usunąć wszystkie serie?',
            description: 'Wszystkie serie tego ćwiczenia zostaną usunięte.',
            onConfirm: () => removeSet(),
        });
    };

    const handleApplyTemplate = (template: SetTemplate) => {
        // Clear existing sets
        removeSet();
        // Add sets from template with defaults for missing fields
        const newSets = template.sets.map(s => ({
            ...s,
            reps: s.reps ?? 0,
            weight: s.weight ?? 0,
            restTimeSeconds: s.restTimeSeconds ?? 60,
            duration: 0 // Default
        }));
        appendSet(newSets);
        toast({ title: 'Szablon zastosowany', description: `Zastosowano szablon: ${template.name}` });
    };

    // Column layout shared by the header labels row and every set row.
    const gridColsClass = exerciseType === 'weight'
        ? 'grid-cols-[1.5rem_2.75rem_1fr_1fr_1fr]'
        : 'grid-cols-[1.5rem_2.75rem_1fr_1fr]';

    return (
        <Collapsible open={isOpen} onOpenChange={onToggle}>
            <Card className={cn('overflow-hidden', exerciseError && 'border-destructive/50')}>
                <div className="flex items-center gap-1 p-2 pl-3">
                    <CollapsibleTrigger asChild>
                        <button type="button" className="flex min-h-12 min-w-0 flex-1 items-center gap-3 text-left">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                                {index + 1}
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className={cn('block truncate text-base font-semibold', !selectedExercise && 'text-muted-foreground')}>
                                    {selectedExercise ? selectedExercise.name : 'Wybierz ćwiczenie'}
                                </span>
                                <span className="block text-xs text-muted-foreground">
                                    {formatSeriesCount(setFields.length)}
                                </span>
                            </span>
                            <ChevronDown className={cn('h-5 w-5 shrink-0 text-muted-foreground transition-transform', isOpen && 'rotate-180')} />
                        </button>
                    </CollapsibleTrigger>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button type="button" variant="ghost" size="icon" className="h-10 w-10 shrink-0" aria-label="Opcje ćwiczenia">
                                <MoreVertical className="h-5 w-5" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem disabled={isFirst} onClick={() => move(index, index - 1)}>
                                <ArrowUp className="mr-2 h-4 w-4" /> Przesuń w górę
                            </DropdownMenuItem>
                            <DropdownMenuItem disabled={isLast} onClick={() => move(index, index + 1)}>
                                <ArrowDown className="mr-2 h-4 w-4" /> Przesuń w dół
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => remove(index)}>
                                <Trash2 className="mr-2 h-4 w-4" /> Usuń ćwiczenie
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
                <CollapsibleContent>
                    <CardContent className="space-y-4 p-3 pt-0">
                        <div>
                            <Dialog open={exerciseDialogOpen} onOpenChange={setExerciseDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className={cn(
                                            'h-12 w-full justify-between text-base font-normal',
                                            !selectedExercise && 'text-muted-foreground',
                                            exerciseError && 'border-destructive'
                                        )}
                                    >
                                        <span className="truncate">
                                            {selectedExercise ? selectedExercise.name : 'Wybierz ćwiczenie…'}
                                        </span>
                                        <Search className="ml-2 h-5 w-5 shrink-0 opacity-60" />
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="flex flex-col gap-3 p-4 max-sm:h-dvh max-sm:max-w-none max-sm:rounded-none max-sm:border-0 max-sm:pt-[max(1rem,env(safe-area-inset-top))] max-sm:pb-[max(1rem,env(safe-area-inset-bottom))] sm:max-h-[85vh] sm:max-w-3xl">
                                    <DialogHeader className="text-left">
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
                            {exerciseError && <p className="mt-1 text-xs text-destructive">{exerciseError}</p>}
                        </div>

                        {selectedExerciseId && exerciseType === 'weight' && (
                            <div className="flex items-center justify-between">
                                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Obciążenie</Label>
                                <div className="grid grid-cols-2 gap-1 rounded-lg bg-secondary/60 p-0.5">
                                    {(['kg', 'rpe'] as const).map((unit) => (
                                        <button
                                            key={unit}
                                            type="button"
                                            onClick={() => handleChangeWeightUnit(unit)}
                                            className={cn(
                                                'h-8 min-w-14 rounded-md px-3 text-xs font-semibold uppercase transition-colors',
                                                weightUnit === unit
                                                    ? 'bg-background text-foreground shadow-soft'
                                                    : 'text-muted-foreground'
                                            )}
                                        >
                                            {unit}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {selectedExerciseId && (
                            <div className="space-y-1.5">
                                <div className={cn('grid items-center gap-1.5 px-0.5', gridColsClass)}>
                                    <span className="text-center text-[10px] font-semibold uppercase text-muted-foreground">#</span>
                                    <span className="text-center text-[10px] font-semibold uppercase text-muted-foreground">Typ</span>
                                    {exerciseType === 'weight' ? (
                                        <>
                                            <span className="text-center text-[10px] font-semibold uppercase text-muted-foreground">
                                                {weightUnit === 'kg' ? 'Kg' : 'RPE'}
                                            </span>
                                            <span className="text-center text-[10px] font-semibold uppercase text-muted-foreground">Powt.</span>
                                        </>
                                    ) : exerciseType === 'reps' ? (
                                        <span className="text-center text-[10px] font-semibold uppercase text-muted-foreground">Powt.</span>
                                    ) : (
                                        <span className="text-center text-[10px] font-semibold uppercase text-muted-foreground">Czas (s)</span>
                                    )}
                                    <span className="text-center text-[10px] font-semibold uppercase text-muted-foreground">Przerwa (s)</span>
                                </div>

                                <AnimatePresence initial={false}>
                                    {setFields.map((setField: any, setIndex: number) => {
                                        const typeValue: SetType = form.watch(`exerciseSeries.${index}.sets.${setIndex}.type`) || SetType.WorkingSet;
                                        const typeConfig = getSetTypeConfig(typeValue);
                                        const TypeIcon = typeConfig.icon;

                                        return (
                                            <motion.div key={setField.id} {...listItemMotion}>
                                                <div className={cn('grid items-center gap-1.5', gridColsClass)}>
                                                    <span className="text-center text-sm font-semibold tabular-nums text-muted-foreground">
                                                        {setIndex + 1}
                                                    </span>
                                                    <SetTypeModal
                                                        value={typeValue}
                                                        onChange={(val) => form.setValue(`exerciseSeries.${index}.sets.${setIndex}.type`, val)}
                                                        onDeleteSet={() => removeSet(setIndex)}
                                                        renderTrigger={
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="icon"
                                                                aria-label={`Typ serii: ${typeConfig.name}. Dotknij, aby zmienić lub usunąć serię.`}
                                                                className={cn(
                                                                    'h-11 w-11 rounded-lg',
                                                                    typeConfig.bgColorClass,
                                                                    typeConfig.borderColorClass,
                                                                    typeConfig.colorClass
                                                                )}
                                                            >
                                                                <TypeIcon className="h-4 w-4" />
                                                            </Button>
                                                        }
                                                    />

                                                    {exerciseType === 'weight' ? (
                                                        <>
                                                            {weightUnit === 'kg' ? (
                                                                <Input
                                                                    type="number"
                                                                    inputMode="decimal"
                                                                    step="0.5"
                                                                    placeholder="0"
                                                                    className="h-11 rounded-lg bg-secondary/30 text-center text-base font-medium tabular-nums"
                                                                    onFocus={(e) => e.currentTarget.select()}
                                                                    {...form.register(`exerciseSeries.${index}.sets.${setIndex}.weight`)}
                                                                />
                                                            ) : (
                                                                <Input
                                                                    type="number"
                                                                    inputMode="decimal"
                                                                    step="0.5"
                                                                    min="1"
                                                                    max="10"
                                                                    placeholder="7"
                                                                    className="h-11 rounded-lg bg-secondary/30 text-center text-base font-medium tabular-nums"
                                                                    onFocus={(e) => e.currentTarget.select()}
                                                                    {...form.register(`exerciseSeries.${index}.sets.${setIndex}.rpe`)}
                                                                />
                                                            )}
                                                            <Input
                                                                type="number"
                                                                inputMode="numeric"
                                                                placeholder="0"
                                                                className="h-11 rounded-lg bg-secondary/30 text-center text-base font-medium tabular-nums"
                                                                onFocus={(e) => e.currentTarget.select()}
                                                                {...form.register(`exerciseSeries.${index}.sets.${setIndex}.reps`)}
                                                            />
                                                        </>
                                                    ) : exerciseType === 'reps' ? (
                                                        <Input
                                                            type="number"
                                                            inputMode="numeric"
                                                            placeholder="0"
                                                            className="h-11 rounded-lg bg-secondary/30 text-center text-base font-medium tabular-nums"
                                                            onFocus={(e) => e.currentTarget.select()}
                                                            {...form.register(`exerciseSeries.${index}.sets.${setIndex}.reps`)}
                                                        />
                                                    ) : (
                                                        <Input
                                                            type="number"
                                                            inputMode="numeric"
                                                            placeholder="0"
                                                            className="h-11 rounded-lg bg-secondary/30 text-center text-base font-medium tabular-nums"
                                                            onFocus={(e) => e.currentTarget.select()}
                                                            {...form.register(`exerciseSeries.${index}.sets.${setIndex}.duration`)}
                                                        />
                                                    )}

                                                    <Input
                                                        type="number"
                                                        inputMode="numeric"
                                                        placeholder="60"
                                                        className="h-11 rounded-lg bg-secondary/30 text-center text-base font-medium tabular-nums"
                                                        onFocus={(e) => e.currentTarget.select()}
                                                        {...form.register(`exerciseSeries.${index}.sets.${setIndex}.restTimeSeconds`)}
                                                    />
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </AnimatePresence>

                                {setsErrorMessage && (
                                    <p className="text-xs text-destructive">{setsErrorMessage}</p>
                                )}

                                <div className="flex gap-1.5 pt-1">
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        className="h-11 flex-1 rounded-lg"
                                        onClick={() => handleAddSet(SetType.WorkingSet)}
                                    >
                                        <Plus className="mr-1.5 h-4 w-4" /> Dodaj serię
                                    </Button>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                type="button"
                                                variant="secondary"
                                                size="icon"
                                                className="h-11 w-11 rounded-lg"
                                                aria-label="Więcej opcji serii"
                                            >
                                                <MoreVertical className="h-5 w-5" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-64">
                                            <DropdownMenuItem onClick={() => handleAddSet(SetType.WarmUpSet)}>
                                                <Flame className="mr-2 h-4 w-4" /> Dodaj rozgrzewkę
                                            </DropdownMenuItem>
                                            <DropdownMenuItem disabled={setFields.length === 0} onClick={handleDuplicateLastSet}>
                                                <Copy className="mr-2 h-4 w-4" /> Duplikuj ostatnią serię
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuLabel className="text-xs text-muted-foreground">Szablony serii</DropdownMenuLabel>
                                            {SET_TEMPLATES.map((template) => (
                                                <DropdownMenuItem
                                                    key={template.id}
                                                    onClick={() => handleApplyTemplate(template)}
                                                    className="flex-col items-start py-2"
                                                >
                                                    <span className="font-medium">{template.name}</span>
                                                    <span className="text-xs text-muted-foreground">{template.description}</span>
                                                </DropdownMenuItem>
                                            ))}
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                                disabled={setFields.length === 0}
                                                className="text-destructive focus:text-destructive"
                                                onClick={handleClearSets}
                                            >
                                                <Trash2 className="mr-2 h-4 w-4" /> Usuń wszystkie serie
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>
                        )}

                        {selectedExerciseId && (
                            <Collapsible open={notesOpen} onOpenChange={setNotesOpen}>
                                <CollapsibleTrigger asChild>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        className="h-9 w-full justify-between px-2 text-sm font-normal text-muted-foreground"
                                    >
                                        <span className="flex items-center gap-2">
                                            <NotebookPen className="h-4 w-4" /> Tempo i wskazówka
                                        </span>
                                        <ChevronDown className={cn('h-4 w-4 transition-transform', notesOpen && 'rotate-180')} />
                                    </Button>
                                </CollapsibleTrigger>
                                <CollapsibleContent className="space-y-3 pt-2">
                                    <FormFieldWithValidation
                                        label="Tempo (np. 3-0-1-0)"
                                        error={form.formState.errors.exerciseSeries?.[index]?.tempo?.message}
                                        touched={form.formState.touchedFields.exerciseSeries?.[index]?.tempo}
                                    >
                                        <Input
                                            {...form.register(`exerciseSeries.${index}.tempo`)}
                                            placeholder="3-0-1-0"
                                            className="h-11 text-base"
                                        />
                                    </FormFieldWithValidation>
                                    <FormFieldWithValidation
                                        label="Wskazówka (Tip)"
                                        error={form.formState.errors.exerciseSeries?.[index]?.tip?.message}
                                        touched={form.formState.touchedFields.exerciseSeries?.[index]?.tip}
                                    >
                                        <Input
                                            {...form.register(`exerciseSeries.${index}.tip`)}
                                            placeholder="Wskazówki dla ćwiczącego..."
                                            className="h-11 text-base"
                                        />
                                    </FormFieldWithValidation>
                                </CollapsibleContent>
                            </Collapsible>
                        )}
                    </CardContent>
                </CollapsibleContent>
            </Card>
        </Collapsible>
    );
}
