'use client';

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';
import { pl } from 'date-fns/locale';

import {
    Card,
    CardContent,
    CardHeader,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import type { Habit, HabitLog, FrequencyType } from '@/lib/types';
import {
    PlusCircle,
    Loader2,
    MoreVertical,
    Edit,
    Trash2,
    CheckSquare,
    ChevronLeft,
    ChevronRight,
    Flame,
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogClose,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
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
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import {
    useUser,
    useCollection,
    useCreateDoc,
    useUpdateDoc,
    useDeleteDoc,
} from '@/lib/db-hooks';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

// --- CONSTANTS ---

const EMOJI_OPTIONS = ['💪', '📚', '🏃', '💻', '🧘', '🎯', '⏰', '💧', '🥗', '😴', '🎨', '🎵', '🚴', '🏋️', '🧠', '❤️'];

const WEEK_DAYS = [
    { id: 1, label: 'Pon' },
    { id: 2, label: 'Wt' },
    { id: 3, label: 'Śr' },
    { id: 4, label: 'Czw' },
    { id: 5, label: 'Pt' },
    { id: 6, label: 'Sob' },
    { id: 0, label: 'Ndz' },
];

const COLOR_OPTIONS = [
    { value: '#10b981', label: 'Zielony' },
    { value: '#3b82f6', label: 'Niebieski' },
    { value: '#8b5cf6', label: 'Fioletowy' },
    { value: '#f59e0b', label: 'Pomarańczowy' },
    { value: '#ef4444', label: 'Czerwony' },
    { value: '#ec4899', label: 'Różowy' },
    { value: '#06b6d4', label: 'Turkusowy' },
];

// --- SCHEMAS ---

const habitSchema = z.object({
    name: z.string().min(1, 'Nazwa jest wymagana.'),
    icon: z.string().default('💪'),
    color: z.string().default('#10b981'),
    frequencyType: z.enum(['daily', 'specific_days', 'every_x_days']).default('daily'),
    selectedDays: z.array(z.number()).default([]),
    repeatInterval: z.number().min(2).max(365).default(2),
    hasDuration: z.boolean().default(false),
    duration: z.number().min(1).max(365).default(30),
});

type HabitFormValues = z.infer<typeof habitSchema>;

// --- HABIT FORM ---
function HabitForm({
    onFormSubmit,
    habit,
    onDialogClose,
    isLoading,
}: {
    onFormSubmit: (data: HabitFormValues) => Promise<void>;
    habit?: Habit | null;
    onDialogClose: () => void;
    isLoading: boolean;
}) {
    const isEditMode = !!habit;

    const form = useForm<HabitFormValues>({
        resolver: zodResolver(habitSchema),
        defaultValues: isEditMode && habit
            ? {
                name: habit.name,
                icon: habit.icon || '💪',
                color: habit.color || '#10b981',
                frequencyType: habit.frequency?.type || 'daily',
                selectedDays: habit.frequency?.daysOfWeek || [],
                repeatInterval: habit.frequency?.repeatEvery || 2,
                hasDuration: !!habit.duration,
                duration: habit.duration || 30,
            }
            : {
                name: '',
                icon: '💪',
                color: '#10b981',
                frequencyType: 'daily',
                selectedDays: [],
                repeatInterval: 2,
                hasDuration: false,
                duration: 30,
            },
    });

    const frequencyType = form.watch('frequencyType');
    const selectedDays = form.watch('selectedDays');
    const hasDuration = form.watch('hasDuration');

    const toggleDay = (dayId: number) => {
        const current = form.getValues('selectedDays');
        if (current.includes(dayId)) {
            form.setValue('selectedDays', current.filter((d) => d !== dayId));
        } else {
            form.setValue('selectedDays', [...current, dayId]);
        }
    };

    const handleSubmit = async (data: HabitFormValues) => {
        try {
            await onFormSubmit(data);
            form.reset();
            onDialogClose();
        } catch (error) {
            console.error('Error submitting habit:', error);
        }
    };

    const isSubmitDisabled =
        form.formState.isSubmitting ||
        isLoading ||
        (frequencyType === 'specific_days' && selectedDays.length === 0);

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <DialogHeader>
                    <DialogTitle className="font-headline">
                        {isEditMode ? 'Edytuj Nawyk' : 'Dodaj Nowy Nawyk'}
                    </DialogTitle>
                    <DialogDescription>
                        {isEditMode
                            ? 'Zaktualizuj szczegóły swojego nawyku.'
                            : 'Zdefiniuj nawyk, który chcesz śledzić.'}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
                    {/* Name */}
                    <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Nazwa Nawyku</FormLabel>
                                <FormControl>
                                    <Input
                                        placeholder="np. Medytacja 10 minut"
                                        {...field}
                                        disabled={form.formState.isSubmitting}
                                        autoFocus
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* Frequency Type */}
                    <FormField
                        control={form.control}
                        name="frequencyType"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Częstotliwość</FormLabel>
                                <FormControl>
                                    <RadioGroup
                                        onValueChange={field.onChange}
                                        value={field.value}
                                        className="flex flex-wrap gap-2"
                                    >
                                        <div className="flex items-center">
                                            <RadioGroupItem value="daily" id="freq-daily" className="peer sr-only" />
                                            <Label
                                                htmlFor="freq-daily"
                                                className={cn(
                                                    'px-3 py-2 rounded-md border cursor-pointer transition-colors',
                                                    field.value === 'daily'
                                                        ? 'bg-primary text-primary-foreground border-primary'
                                                        : 'bg-background hover:bg-secondary'
                                                )}
                                            >
                                                Codziennie
                                            </Label>
                                        </div>
                                        <div className="flex items-center">
                                            <RadioGroupItem value="specific_days" id="freq-specific" className="peer sr-only" />
                                            <Label
                                                htmlFor="freq-specific"
                                                className={cn(
                                                    'px-3 py-2 rounded-md border cursor-pointer transition-colors',
                                                    field.value === 'specific_days'
                                                        ? 'bg-primary text-primary-foreground border-primary'
                                                        : 'bg-background hover:bg-secondary'
                                                )}
                                            >
                                                Wybrane dni
                                            </Label>
                                        </div>
                                        <div className="flex items-center">
                                            <RadioGroupItem value="every_x_days" id="freq-interval" className="peer sr-only" />
                                            <Label
                                                htmlFor="freq-interval"
                                                className={cn(
                                                    'px-3 py-2 rounded-md border cursor-pointer transition-colors',
                                                    field.value === 'every_x_days'
                                                        ? 'bg-primary text-primary-foreground border-primary'
                                                        : 'bg-background hover:bg-secondary'
                                                )}
                                            >
                                                Co X dni
                                            </Label>
                                        </div>
                                    </RadioGroup>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* Days Selector (for specific_days) */}
                    {frequencyType === 'specific_days' && (
                        <div className="space-y-2">
                            <Label>Wybierz dni tygodnia</Label>
                            <div className="flex flex-wrap gap-2">
                                {WEEK_DAYS.map((day) => (
                                    <Button
                                        key={day.id}
                                        type="button"
                                        variant={selectedDays.includes(day.id) ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => toggleDay(day.id)}
                                        className="w-12"
                                    >
                                        {day.label}
                                    </Button>
                                ))}
                            </div>
                            {selectedDays.length === 0 && (
                                <p className="text-sm text-destructive">Wybierz przynajmniej jeden dzień</p>
                            )}
                        </div>
                    )}

                    {/* Interval Selector (for every_x_days) */}
                    {frequencyType === 'every_x_days' && (
                        <FormField
                            control={form.control}
                            name="repeatInterval"
                            render={({ field }) => (
                                <FormItem>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm">Powtarzaj co</span>
                                        <Input
                                            type="number"
                                            min={2}
                                            max={365}
                                            className="w-20"
                                            {...field}
                                            onChange={(e) => field.onChange(Math.max(2, parseInt(e.target.value) || 2))}
                                        />
                                        <span className="text-sm">dni</span>
                                    </div>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    )}

                    {/* Duration Goal */}
                    <div className="space-y-3">
                        <Label>Cel (opcjonalne)</Label>
                        <RadioGroup
                            value={hasDuration ? 'duration' : 'infinite'}
                            onValueChange={(v) => form.setValue('hasDuration', v === 'duration')}
                            className="flex flex-wrap gap-2"
                        >
                            <div className="flex items-center">
                                <RadioGroupItem value="infinite" id="dur-infinite" className="peer sr-only" />
                                <Label
                                    htmlFor="dur-infinite"
                                    className={cn(
                                        'px-3 py-2 rounded-md border cursor-pointer transition-colors',
                                        !hasDuration
                                            ? 'bg-primary text-primary-foreground border-primary'
                                            : 'bg-background hover:bg-secondary'
                                    )}
                                >
                                    Bezterminowo
                                </Label>
                            </div>
                            <div className="flex items-center">
                                <RadioGroupItem value="duration" id="dur-days" className="peer sr-only" />
                                <Label
                                    htmlFor="dur-days"
                                    className={cn(
                                        'px-3 py-2 rounded-md border cursor-pointer transition-colors',
                                        hasDuration
                                            ? 'bg-primary text-primary-foreground border-primary'
                                            : 'bg-background hover:bg-secondary'
                                    )}
                                >
                                    Cel dniowy
                                </Label>
                            </div>
                        </RadioGroup>

                        {hasDuration && (
                            <FormField
                                control={form.control}
                                name="duration"
                                render={({ field }) => (
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm">Wykonaj przez</span>
                                        <Input
                                            type="number"
                                            min={1}
                                            max={365}
                                            className="w-20"
                                            {...field}
                                            onChange={(e) => field.onChange(Math.max(1, parseInt(e.target.value) || 1))}
                                        />
                                        <span className="text-sm">dni</span>
                                    </div>
                                )}
                            />
                        )}
                    </div>

                    {/* Emoji Icon */}
                    <FormField
                        control={form.control}
                        name="icon"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Wybierz ikonę</FormLabel>
                                <FormControl>
                                    <div className="grid grid-cols-8 gap-2">
                                        {EMOJI_OPTIONS.map((emoji) => (
                                            <button
                                                key={emoji}
                                                type="button"
                                                onClick={() => field.onChange(emoji)}
                                                className={cn(
                                                    'w-10 h-10 text-xl flex items-center justify-center rounded-md transition-all border-2',
                                                    field.value === emoji
                                                        ? 'border-primary bg-primary/10 scale-110'
                                                        : 'border-transparent hover:bg-secondary'
                                                )}
                                                disabled={form.formState.isSubmitting}
                                            >
                                                {emoji}
                                            </button>
                                        ))}
                                    </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* Color */}
                    <FormField
                        control={form.control}
                        name="color"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Kolor</FormLabel>
                                <FormControl>
                                    <div className="flex gap-2 flex-wrap">
                                        {COLOR_OPTIONS.map((color) => (
                                            <button
                                                key={color.value}
                                                type="button"
                                                onClick={() => field.onChange(color.value)}
                                                className={cn(
                                                    'w-8 h-8 rounded-full transition-all border-2',
                                                    field.value === color.value
                                                        ? 'border-foreground scale-110'
                                                        : 'border-transparent hover:scale-105'
                                                )}
                                                style={{ backgroundColor: color.value }}
                                                title={color.label}
                                                disabled={form.formState.isSubmitting}
                                            />
                                        ))}
                                    </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <DialogFooter>
                    <DialogClose asChild>
                        <Button
                            type="button"
                            variant="secondary"
                            disabled={form.formState.isSubmitting}
                        >
                            Anuluj
                        </Button>
                    </DialogClose>
                    <Button type="submit" disabled={isSubmitDisabled}>
                        {(form.formState.isSubmitting || isLoading) && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        {isEditMode ? 'Zapisz Zmiany' : 'Dodaj Nawyk'}
                    </Button>
                </DialogFooter>
            </form>
        </Form>
    );
}

// --- MAIN PAGE COMPONENT ---

export default function HabitsPage() {
    const [isHabitDialogOpen, setHabitDialogOpen] = useState(false);
    const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
    const [habitToDelete, setHabitToDelete] = useState<Habit | null>(null);
    const [currentWeekStart, setCurrentWeekStart] = useState(() =>
        startOfWeek(new Date(), { weekStartsOn: 1 })
    );

    const { user } = useUser();
    const { toast } = useToast();
    const { createDoc, isLoading: isCreating } = useCreateDoc();
    const { updateDoc, isLoading: isUpdating } = useUpdateDoc();
    const { deleteDoc, isLoading: isDeleting } = useDeleteDoc();

    // Fetch Habits
    const {
        data: habits,
        isLoading: habitsLoading,
        refetch: refetchHabits,
    } = useCollection<Habit>(user ? 'habits' : null, {
        ownerId: user?.uid,
        isActive: true,
    });

    // Fetch HabitLogs for current week
    const weekDates = useMemo(() => {
        return Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
    }, [currentWeekStart]);

    const weekDateStrings = useMemo(() => {
        return weekDates.map((d) => format(d, 'yyyy-MM-dd'));
    }, [weekDates]);

    const {
        data: habitLogs,
        isLoading: logsLoading,
        refetch: refetchLogs,
    } = useCollection<HabitLog>(user ? 'habitlogs' : null, {
        ownerId: user?.uid,
    });

    const isLoading = habitsLoading || logsLoading;

    // Group logs by habitId and date for quick lookup
    const logsByHabitAndDate = useMemo(() => {
        const map = new Map<string, boolean>();
        habitLogs?.forEach((log) => {
            if (log.completed) {
                map.set(`${log.habitId}-${log.date}`, true);
            }
        });
        return map;
    }, [habitLogs]);

    // Check if habit should be active on a given day
    const isHabitActiveOnDay = (habit: Habit, dateStr: string): boolean => {
        const date = new Date(dateStr);
        const dayOfWeek = date.getDay(); // 0 = Sunday

        if (!habit.frequency || habit.frequency.type === 'daily') {
            return true;
        }

        if (habit.frequency.type === 'specific_days') {
            return habit.frequency.daysOfWeek?.includes(dayOfWeek) ?? false;
        }

        // For every_x_days, we'd need the habit creation date to calculate
        // For simplicity, we'll show it as active always
        return true;
    };

    // Calculate stats
    const stats = useMemo(() => {
        if (!habits || habits.length === 0) return { completionRate: 0, totalCompleted: 0, totalPossible: 0 };

        const today = format(new Date(), 'yyyy-MM-dd');
        let totalPossible = 0;
        let totalCompleted = 0;

        weekDateStrings.forEach((date) => {
            if (date <= today) {
                habits.forEach((habit) => {
                    if (isHabitActiveOnDay(habit, date)) {
                        totalPossible++;
                        if (logsByHabitAndDate.get(`${habit.id}-${date}`)) {
                            totalCompleted++;
                        }
                    }
                });
            }
        });

        const completionRate =
            totalPossible > 0 ? Math.round((totalCompleted / totalPossible) * 100) : 0;

        return { completionRate, totalCompleted, totalPossible };
    }, [habits, weekDateStrings, logsByHabitAndDate]);

    const handleHabitDialogClose = () => {
        setEditingHabit(null);
        setHabitDialogOpen(false);
    };

    const handleHabitFormSubmit = async (data: HabitFormValues) => {
        if (!user) return;

        const habitData = {
            name: data.name,
            icon: data.icon,
            color: data.color,
            frequency: {
                type: data.frequencyType as FrequencyType,
                daysOfWeek: data.frequencyType === 'specific_days' ? data.selectedDays : undefined,
                repeatEvery: data.frequencyType === 'every_x_days' ? data.repeatInterval : undefined,
            },
            duration: data.hasDuration ? data.duration : undefined,
        };

        try {
            if (editingHabit) {
                await updateDoc('habits', editingHabit.id, habitData);
                toast({
                    title: 'Nawyk Zaktualizowany!',
                    description: `Nawyk "${data.name}" został zmieniony.`,
                });
            } else {
                await createDoc('habits', {
                    ...habitData,
                    ownerId: user.uid,
                    isActive: true,
                });
                toast({
                    title: 'Nawyk Dodany!',
                    description: `Nowy nawyk "${data.name}" został dodany.`,
                });
            }
            refetchHabits();
        } catch (error) {
            toast({
                title: 'Błąd',
                description: 'Nie udało się zapisać nawyku.',
                variant: 'destructive',
            });
            throw error;
        }
    };

    const handleDeleteHabit = async () => {
        if (!habitToDelete || !user) return;
        try {
            await deleteDoc('habits', habitToDelete.id);
            toast({ title: 'Nawyk usunięty', variant: 'destructive' });
            setHabitToDelete(null);
            refetchHabits();
        } catch (error) {
            toast({
                title: 'Błąd',
                description: 'Nie udało się usunąć nawyku.',
                variant: 'destructive',
            });
        }
    };

    const toggleHabitCompletion = async (habitId: string, date: string) => {
        if (!user) return;

        const key = `${habitId}-${date}`;
        const isCurrentlyCompleted = logsByHabitAndDate.get(key);

        try {
            if (isCurrentlyCompleted) {
                const logToDelete = habitLogs?.find(
                    (log) => log.habitId === habitId && log.date === date
                );
                if (logToDelete) {
                    await deleteDoc('habitlogs', logToDelete.id);
                }
            } else {
                await createDoc('habitlogs', {
                    habitId,
                    ownerId: user.uid,
                    date,
                    completed: true,
                });
            }
            refetchLogs();
        } catch (error) {
            toast({
                title: 'Błąd',
                description: 'Nie udało się zaktualizować statusu.',
                variant: 'destructive',
            });
        }
    };

    const goToPreviousWeek = () => {
        setCurrentWeekStart((prev) => addDays(prev, -7));
    };

    const goToNextWeek = () => {
        setCurrentWeekStart((prev) => addDays(prev, 7));
    };

    const goToCurrentWeek = () => {
        setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
    };

    const isCurrentWeek =
        format(currentWeekStart, 'yyyy-MM-dd') ===
        format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');

    // Get frequency label for display
    const getFrequencyLabel = (habit: Habit): string => {
        if (!habit.frequency) return 'Codziennie';
        switch (habit.frequency.type) {
            case 'daily':
                return 'Codziennie';
            case 'specific_days':
                const days = habit.frequency.daysOfWeek?.map((d) => WEEK_DAYS.find((wd) => wd.id === d)?.label).join(', ');
                return days || 'Wybrane dni';
            case 'every_x_days':
                return `Co ${habit.frequency.repeatEvery} dni`;
            default:
                return 'Codziennie';
        }
    };

    return (
        <>
            <AlertDialog
                open={!!habitToDelete}
                onOpenChange={(open) => !open && setHabitToDelete(null)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Czy na pewno chcesz usunąć ten nawyk?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Ta operacja jest nieodwracalna. Nawyk &ldquo;{habitToDelete?.name}&rdquo;
                            zostanie trwale usunięty wraz z całą historią.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Anuluj</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteHabit}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Usuń
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Dialog open={isHabitDialogOpen} onOpenChange={setHabitDialogOpen}>
                <DialogContent className="max-w-md">
                    <HabitForm
                        onFormSubmit={handleHabitFormSubmit}
                        habit={editingHabit}
                        onDialogClose={handleHabitDialogClose}
                        isLoading={isCreating || isUpdating}
                    />
                </DialogContent>
            </Dialog>

            <div className="container mx-auto p-4 md:p-8">
                {/* --- Header --- */}
                <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="font-headline text-3xl font-bold flex items-center gap-2">
                            <CheckSquare className="h-8 w-8 text-primary" />
                            Nawyki
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Śledź swoje codzienne nawyki i buduj lepsze rutyny
                        </p>
                    </div>
                    <Button
                        onClick={() => {
                            setEditingHabit(null);
                            setHabitDialogOpen(true);
                        }}
                    >
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Dodaj Nawyk
                    </Button>
                </div>

                {/* --- Stats Card --- */}
                {habits && habits.length > 0 && (
                    <Card className="mb-6">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between gap-4 flex-wrap">
                                <div className="flex items-center gap-3">
                                    <div
                                        className="w-12 h-12 rounded-full flex items-center justify-center"
                                        style={{ backgroundColor: 'hsl(var(--primary) / 0.1)' }}
                                    >
                                        <Flame className="h-6 w-6 text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">
                                            Wykonanie w tym tygodniu
                                        </p>
                                        <p className="text-2xl font-bold">{stats.completionRate}%</p>
                                    </div>
                                </div>
                                <div className="flex-1 min-w-[200px] max-w-md">
                                    <Progress value={stats.completionRate} className="h-3" />
                                    <p className="text-xs text-muted-foreground mt-1 text-right">
                                        {stats.totalCompleted} / {stats.totalPossible} wykonanych
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* --- Week Navigation --- */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" onClick={goToPreviousWeek}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="font-medium min-w-[200px] text-center">
                            {format(weekDates[0], 'd MMM', { locale: pl })} -{' '}
                            {format(weekDates[6], 'd MMM yyyy', { locale: pl })}
                        </span>
                        <Button variant="outline" size="icon" onClick={goToNextWeek}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                    {!isCurrentWeek && (
                        <Button variant="ghost" size="sm" onClick={goToCurrentWeek}>
                            Bieżący tydzień
                        </Button>
                    )}
                </div>

                {/* --- Habits Grid --- */}
                <Card>
                    <CardHeader className="pb-2">
                        <div className="grid grid-cols-[1fr_repeat(7,minmax(40px,1fr))] gap-2 text-center">
                            <div></div>
                            {weekDates.map((date) => {
                                const isToday = isSameDay(date, new Date());
                                return (
                                    <div
                                        key={date.toISOString()}
                                        className={cn(
                                            'text-xs font-medium py-2 rounded-md',
                                            isToday && 'bg-primary text-primary-foreground'
                                        )}
                                    >
                                        <div>{format(date, 'EEE', { locale: pl })}</div>
                                        <div className="text-lg font-bold">{format(date, 'd')}</div>
                                    </div>
                                );
                            })}
                        </div>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="space-y-4">
                                {Array.from({ length: 3 }).map((_, i) => (
                                    <div
                                        key={i}
                                        className="grid grid-cols-[1fr_repeat(7,minmax(40px,1fr))] gap-2 items-center"
                                    >
                                        <Skeleton className="h-10 w-full" />
                                        {Array.from({ length: 7 }).map((_, j) => (
                                            <Skeleton key={j} className="h-8 w-8 mx-auto rounded" />
                                        ))}
                                    </div>
                                ))}
                            </div>
                        ) : habits && habits.length > 0 ? (
                            <div className="space-y-2">
                                {habits.map((habit) => (
                                    <div
                                        key={habit.id}
                                        className="grid grid-cols-[1fr_repeat(7,minmax(40px,1fr))] gap-2 items-center py-2 border-b last:border-b-0"
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="text-xl shrink-0">{habit.icon || '💪'}</span>
                                            <div className="min-w-0 flex-1">
                                                <span className="font-medium truncate block">{habit.name}</span>
                                                <span className="text-xs text-muted-foreground">{getFrequencyLabel(habit)}</span>
                                            </div>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6 shrink-0"
                                                    >
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem
                                                        onClick={() => {
                                                            setEditingHabit(habit);
                                                            setHabitDialogOpen(true);
                                                        }}
                                                    >
                                                        <Edit className="mr-2 h-4 w-4" />
                                                        <span>Edytuj</span>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onClick={() => setHabitToDelete(habit)}
                                                        className="text-destructive focus:text-destructive"
                                                    >
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        <span>Usuń</span>
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                        {weekDateStrings.map((dateStr) => {
                                            const isCompleted = logsByHabitAndDate.get(
                                                `${habit.id}-${dateStr}`
                                            );
                                            const isFuture = dateStr > format(new Date(), 'yyyy-MM-dd');
                                            const isActiveDay = isHabitActiveOnDay(habit, dateStr);

                                            if (!isActiveDay) {
                                                return (
                                                    <div key={dateStr} className="flex justify-center">
                                                        <div className="h-8 w-8 rounded flex items-center justify-center text-muted-foreground/30">
                                                            —
                                                        </div>
                                                    </div>
                                                );
                                            }

                                            return (
                                                <div key={dateStr} className="flex justify-center">
                                                    <Checkbox
                                                        checked={!!isCompleted}
                                                        onCheckedChange={() =>
                                                            toggleHabitCompletion(habit.id, dateStr)
                                                        }
                                                        disabled={isFuture}
                                                        className={cn(
                                                            'h-8 w-8 rounded transition-all',
                                                            isCompleted &&
                                                            'border-transparent data-[state=checked]:border-transparent'
                                                        )}
                                                        style={
                                                            isCompleted
                                                                ? {
                                                                    backgroundColor: habit.color || '#10b981',
                                                                    borderColor: habit.color || '#10b981',
                                                                }
                                                                : undefined
                                                        }
                                                    />
                                                </div>
                                            );
                                        })}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <CheckSquare className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                                <h3 className="font-headline text-xl font-semibold mb-2">
                                    Brak nawyków
                                </h3>
                                <p className="text-muted-foreground mb-4">
                                    Dodaj swój pierwszy nawyk, aby zacząć śledzić postępy.
                                </p>
                                <Button
                                    onClick={() => {
                                        setEditingHabit(null);
                                        setHabitDialogOpen(true);
                                    }}
                                >
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Dodaj Pierwszy Nawyk
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* --- Add Habit Card --- */}
                {habits && habits.length > 0 && (
                    <Card
                        onClick={() => {
                            setEditingHabit(null);
                            setHabitDialogOpen(true);
                        }}
                        className="mt-4 flex items-center justify-center border-dashed hover:border-primary hover:bg-secondary/30 transition-colors cursor-pointer py-8"
                    >
                        <CardContent className="flex items-center gap-2 text-muted-foreground p-0">
                            <PlusCircle className="h-5 w-5" />
                            <span>Dodaj kolejny nawyk</span>
                        </CardContent>
                    </Card>
                )}
            </div>
        </>
    );
}
