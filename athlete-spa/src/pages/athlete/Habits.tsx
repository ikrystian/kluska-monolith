'use client';

import { useState, useMemo, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, startOfWeek, addDays, isSameDay, startOfMonth, endOfMonth, addMonths, isSameMonth, getDay } from 'date-fns';
import { pl } from 'date-fns/locale';

import {
    Card,
    CardContent,
    CardHeader,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import type { Habit, HabitLog, FrequencyType } from '@/lib/types';
import { toast } from 'sonner';
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
    Calendar,
    CalendarDays,
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
    const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
    const [currentWeekStart, setCurrentWeekStart] = useState(() =>
        startOfWeek(new Date(), { weekStartsOn: 1 })
    );
    const [currentMonthStart, setCurrentMonthStart] = useState(() =>
        startOfMonth(new Date())
    );

    const { user } = useUser();
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

    // Week dates
    const weekDates = useMemo(() => {
        return Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
    }, [currentWeekStart]);

    const weekDateStrings = useMemo(() => {
        return weekDates.map((d) => format(d, 'yyyy-MM-dd'));
    }, [weekDates]);

    // Month dates (build full calendar grid including padding days)
    const monthDates = useMemo(() => {
        const monthEnd = endOfMonth(currentMonthStart);
        const dates: Date[] = [];

        // Get the first day of the month
        const firstDayOfWeek = getDay(currentMonthStart);
        // Adjust for Monday start (0 = Monday in our case, but getDay returns 0 = Sunday)
        const daysFromMonday = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

        // Add padding days from previous month
        for (let i = daysFromMonday - 1; i >= 0; i--) {
            dates.push(addDays(currentMonthStart, -i - 1));
        }

        // Add all days of the current month
        let currentDate = currentMonthStart;
        while (currentDate <= monthEnd) {
            dates.push(currentDate);
            currentDate = addDays(currentDate, 1);
        }

        // Add padding days to complete the last week
        const remainingDays = 7 - (dates.length % 7);
        if (remainingDays < 7) {
            for (let i = 1; i <= remainingDays; i++) {
                dates.push(addDays(monthEnd, i));
            }
        }

        return dates;
    }, [currentMonthStart]);

    const {
        data: habitLogs,
        isLoading: logsLoading,
        refetch: refetchLogs,
    } = useCollection<HabitLog>(user ? 'habitlogs' : null, {
        ownerId: user?.uid,
    });

    const isLoading = (habitsLoading && !habits) || (logsLoading && !habitLogs);

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

    // Optimistic updates state for instant UI feedback
    const [optimisticUpdates, setOptimisticUpdates] = useState<Map<string, boolean>>(new Map());

    // To track logs created but not yet synced with server/habitLogs
    const pendingLogIds = useRef<Map<string, string>>(new Map());
    // To track deletion requests when log ID is not yet known (creation in flight)
    const pendingDeletions = useRef<Set<string>>(new Set());

    // Combined lookup with optimistic updates taking priority
    const isHabitCompleted = (habitId: string, date: string): boolean => {
        const key = `${habitId}-${date}`;
        if (optimisticUpdates.has(key)) {
            return optimisticUpdates.get(key)!;
        }
        return logsByHabitAndDate.get(key) || false;
    };

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
                        if (isHabitCompleted(habit.id, date)) {
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
                toast.success('Nawyk Zaktualizowany!', {
                    description: `Nawyk "${data.name}" został zmieniony.`,
                });
            } else {
                await createDoc('habits', {
                    ...habitData,
                    ownerId: user.uid,
                    isActive: true,
                });
                toast.success('Nawyk Dodany!', {
                    description: `Nowy nawyk "${data.name}" został dodany.`,
                });
            }
            setHabitDialogOpen(false);
            setEditingHabit(null);
            refetchHabits();
        } catch (error) {
            console.error('Error saving habit:', error);
            toast.error('Błąd', {
                description: 'Nie udało się zapisać nawyku.',
            });
        }
    };

    const handleDeleteHabit = async () => {
        if (!habitToDelete || !user) return;
        try {
            await deleteDoc('habits', habitToDelete.id);
            toast.success('Nawyk Usunięty', {
                description: `Nawyk "${habitToDelete.name}" został usunięty.`,
            });
            setHabitToDelete(null);
            refetchHabits();
        } catch (error) {
            console.error('Error deleting habit:', error);
            toast.error('Błąd', {
                description: 'Nie udało się usunąć nawyku.',
            });
        }
    };

    const toggleHabitCompletion = async (habitId: string, date: string) => {
        if (!user) return;
        const key = `${habitId}-${date}`;
        const isCurrentlyCompleted = isHabitCompleted(habitId, date);
        const newState = !isCurrentlyCompleted;

        // Optimistic update
        setOptimisticUpdates((prev) => {
            const newMap = new Map(prev);
            newMap.set(key, newState);
            return newMap;
        });

        // Toast feedback
        if (newState) {
            toast.success('Nawyk zaznaczony');
        } else {
            toast.success('Nawyk odznaczony');
        }

        try {
            if (isCurrentlyCompleted) {
                // Unchecking - delete the log
                let logId = habitLogs?.find(
                    (log) => log.habitId === habitId && log.date === date
                )?.id;

                // If not found in server logs, check our pending logs
                if (!logId) {
                    logId = pendingLogIds.current.get(key);
                }

                if (logId) {
                    try {
                        await deleteDoc('habitlogs', logId);
                        // Clean up pending ID if it was one
                        pendingLogIds.current.delete(key);
                    } catch (err) {
                        // Ignore 404/Not Found errors as the document is already deleted
                        const errorMessage = err instanceof Error ? err.message : String(err);
                        if (!errorMessage.includes('Not Found') && !errorMessage.includes('404')) {
                            throw err;
                        }
                    }
                } else {
                    // Log exists essentially (optimistically) but we don't have ID yet.
                    // Mark for deletion as soon as creation finishes.
                    pendingDeletions.current.add(key);
                }
            } else {
                // Checking - create a new log

                // If we marked this for pending deletion (user unchecked while creating),
                // but now user checks again, we cancel that pending deletion.
                if (pendingDeletions.current.has(key)) {
                    pendingDeletions.current.delete(key);
                }

                const newLog = await createDoc('habitlogs', {
                    habitId,
                    ownerId: user.uid,
                    date,
                    completed: true,
                });

                // Check if user decided to delete/uncheck while we were creating
                if (pendingDeletions.current.has(key)) {
                    // Delete the just-created log
                    await deleteDoc('habitlogs', newLog.id || newLog._id);
                    pendingDeletions.current.delete(key);
                } else {
                    // Store the ID for potential immediate deletion
                    pendingLogIds.current.set(key, newLog.id || newLog._id);
                }
            }

            // Sync with server logic logic remains similar, but now we have handled the ID race condition
            // We wait a bit to let server propagate if needed, or just rely on SWR refetch
            await refetchLogs();

            // Only clear optimistic update if we didn't do another interaction in the meantime?
            // Actually, keep it simple. Clearing optimistic update usually flashes content if refetch is slow.
            // But if we don't clear, we diverge.
            // With pendingLogIds, we are safer.
            setOptimisticUpdates((prev) => {
                const newMap = new Map(prev);
                newMap.delete(key);
                return newMap;
            });
        } catch (error) {
            console.error('Error toggling habit:', error);
            // Revert optimistic update
            setOptimisticUpdates((prev) => {
                const newMap = new Map(prev);
                newMap.delete(key);
                return newMap;
            });

            toast.error("Błąd", {
                description: "Nie udało się zaktualizować statusu nawyku",
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

    // Month navigation
    const goToPreviousMonth = () => {
        setCurrentMonthStart((prev) => addMonths(prev, -1));
    };

    const goToNextMonth = () => {
        setCurrentMonthStart((prev) => addMonths(prev, 1));
    };

    const goToCurrentMonth = () => {
        setCurrentMonthStart(startOfMonth(new Date()));
    };

    const isCurrentMonth =
        format(currentMonthStart, 'yyyy-MM') ===
        format(startOfMonth(new Date()), 'yyyy-MM');

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

            <div className="container mx-auto p-4 md:p-6 lg:p-8 max-w-4xl">
                {/* --- Header --- */}
                <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                        <h1 className="font-headline text-2xl sm:text-3xl font-bold flex items-center gap-2">
                            <CheckSquare className="h-6 w-6 sm:h-8 sm:w-8 text-primary shrink-0" />
                            <span className="truncate">Nawyki</span>
                        </h1>
                        <p className="text-muted-foreground text-sm sm:text-base mt-1">
                            Śledź swoje codzienne nawyki
                        </p>
                    </div>
                    <Button
                        onClick={() => {
                            setEditingHabit(null);
                            setHabitDialogOpen(true);
                        }}
                        className="w-full sm:w-auto shrink-0"
                    >
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Dodaj Nawyk
                    </Button>
                </div>

                {/* --- Stats Card --- */}
                {habits && habits.length > 0 && (
                    <Card className="mb-6">
                        <CardContent className="p-4">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                                <div className="flex items-center gap-3">
                                    <div
                                        className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center shrink-0"
                                        style={{ backgroundColor: 'hsl(var(--primary) / 0.1)' }}
                                    >
                                        <Flame className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-xs sm:text-sm text-muted-foreground">
                                            Wykonanie w tym tygodniu
                                        </p>
                                        <p className="text-xl sm:text-2xl font-bold">{stats.completionRate}%</p>
                                    </div>
                                </div>
                                <div className="flex-1 w-full sm:max-w-xs">
                                    <Progress value={stats.completionRate} className="h-2 sm:h-3" />
                                    <p className="text-xs text-muted-foreground mt-1 text-right">
                                        {stats.totalCompleted} / {stats.totalPossible} wykonanych
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* --- View Toggle & Navigation --- */}
                <div className="flex flex-col gap-3 mb-4">
                    {/* View Mode Toggle */}
                    <div className="flex items-center justify-center gap-2">
                        <Button
                            variant={viewMode === 'week' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setViewMode('week')}
                            className="flex items-center gap-2"
                        >
                            <CalendarDays className="h-4 w-4" />
                            Tydzień
                        </Button>
                        <Button
                            variant={viewMode === 'month' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setViewMode('month')}
                            className="flex items-center gap-2"
                        >
                            <Calendar className="h-4 w-4" />
                            Miesiąc
                        </Button>
                    </div>

                    {/* Navigation */}
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1 sm:gap-2 flex-1 justify-center min-w-0">
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={viewMode === 'week' ? goToPreviousWeek : goToPreviousMonth}
                                className="h-8 w-8 sm:h-9 sm:w-9 shrink-0"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <span className="font-medium text-xs sm:text-sm text-center truncate px-1">
                                {viewMode === 'week'
                                    ? `${format(weekDates[0], 'd MMM', { locale: pl })} – ${format(weekDates[6], 'd MMM', { locale: pl })}`
                                    : format(currentMonthStart, 'LLLL yyyy', { locale: pl })
                                }
                            </span>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={viewMode === 'week' ? goToNextWeek : goToNextMonth}
                                className="h-8 w-8 sm:h-9 sm:w-9 shrink-0"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                        {((viewMode === 'week' && !isCurrentWeek) || (viewMode === 'month' && !isCurrentMonth)) && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={viewMode === 'week' ? goToCurrentWeek : goToCurrentMonth}
                                className="shrink-0 text-xs sm:text-sm px-2 sm:px-3"
                            >
                                Dziś
                            </Button>
                        )}
                    </div>
                </div>

                {/* --- Habits Grid (Desktop) / Cards (Mobile) --- */}
                {isLoading ? (
                    <Card>
                        <CardContent className="p-4">
                            <div className="space-y-4">
                                {Array.from({ length: 3 }).map((_, i) => (
                                    <div key={i} className="flex items-center gap-3">
                                        <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                                        <div className="flex-1 space-y-2">
                                            <Skeleton className="h-4 w-32" />
                                            <Skeleton className="h-3 w-24" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                ) : habits && habits.length > 0 ? (
                    <>
                        {/* Week View */}
                        {viewMode === 'week' && (
                            <>
                                {/* Mobile View - Card Layout */}
                                <div className="block md:hidden space-y-3">
                                    {habits.map((habit) => (
                                        <Card key={habit.id} className="overflow-hidden">
                                            <CardContent className="p-0">
                                                {/* Habit Header */}
                                                <div className="flex items-center gap-3 p-3 border-b bg-muted/30">
                                                    <div
                                                        className="w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0"
                                                        style={{ backgroundColor: `${habit.color || '#10b981'}20` }}
                                                    >
                                                        {habit.icon || '💪'}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-medium truncate">{habit.name}</p>
                                                        <p className="text-xs text-muted-foreground">{getFrequencyLabel(habit)}</p>
                                                    </div>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                                                                <MoreVertical className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem onClick={() => { setEditingHabit(habit); setHabitDialogOpen(true); }}>
                                                                <Edit className="mr-2 h-4 w-4" />
                                                                Edytuj
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => setHabitToDelete(habit)} className="text-destructive focus:text-destructive">
                                                                <Trash2 className="mr-2 h-4 w-4" />
                                                                Usuń
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                                {/* Week Days Grid */}
                                                <div className="grid grid-cols-7 gap-1 p-2">
                                                    {weekDates.map((date, idx) => {
                                                        const dateStr = weekDateStrings[idx];
                                                        const isToday = isSameDay(date, new Date());
                                                        const isCompleted = isHabitCompleted(habit.id, dateStr);
                                                        const isFuture = dateStr > format(new Date(), 'yyyy-MM-dd');
                                                        const isActiveDay = isHabitActiveOnDay(habit, dateStr);

                                                        return (
                                                            <div key={dateStr} className="flex flex-col items-center gap-1">
                                                                <span className={cn(
                                                                    "text-[10px] font-medium uppercase",
                                                                    isToday ? "text-primary" : "text-muted-foreground"
                                                                )}>
                                                                    {format(date, 'EEEEEE', { locale: pl })}
                                                                </span>
                                                                <span className={cn(
                                                                    "text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full",
                                                                    isToday && "bg-primary text-primary-foreground"
                                                                )}>
                                                                    {format(date, 'd')}
                                                                </span>
                                                                {isActiveDay ? (
                                                                    <Checkbox
                                                                        checked={!!isCompleted}
                                                                        onCheckedChange={() => toggleHabitCompletion(habit.id, dateStr)}
                                                                        disabled={isFuture}
                                                                        className={cn(
                                                                            'h-7 w-7 rounded-md transition-all',
                                                                            isCompleted && 'border-transparent data-[state=checked]:border-transparent',
                                                                            isFuture && 'opacity-40'
                                                                        )}
                                                                        style={isCompleted ? { backgroundColor: habit.color || '#10b981', borderColor: habit.color || '#10b981' } : undefined}
                                                                    />
                                                                ) : (
                                                                    <div className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground/30 text-xs">
                                                                        —
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>

                                {/* Desktop View - Grid Layout */}
                                <Card className="hidden md:block">
                                    <CardHeader className="pb-2 px-4">
                                        <div className="grid grid-cols-[minmax(150px,1fr)_repeat(7,48px)] gap-2 text-center items-end">
                                            <div></div>
                                            {weekDates.map((date) => {
                                                const isToday = isSameDay(date, new Date());
                                                return (
                                                    <div
                                                        key={date.toISOString()}
                                                        className={cn(
                                                            'text-xs font-medium py-2 rounded-lg',
                                                            isToday && 'bg-primary text-primary-foreground'
                                                        )}
                                                    >
                                                        <div className="uppercase">{format(date, 'EEE', { locale: pl })}</div>
                                                        <div className="text-base font-bold">{format(date, 'd')}</div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </CardHeader>
                                    <CardContent className="px-4">
                                        <div className="space-y-1">
                                            {habits.map((habit) => (
                                                <div
                                                    key={habit.id}
                                                    className="grid grid-cols-[minmax(150px,1fr)_repeat(7,48px)] gap-2 items-center py-3 border-b last:border-b-0"
                                                >
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <div
                                                            className="w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0"
                                                            style={{ backgroundColor: `${habit.color || '#10b981'}20` }}
                                                        >
                                                            {habit.icon || '💪'}
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="font-medium truncate text-sm">{habit.name}</p>
                                                            <p className="text-xs text-muted-foreground truncate">{getFrequencyLabel(habit)}</p>
                                                        </div>
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                                                                    <MoreVertical className="h-3 w-3" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuItem onClick={() => { setEditingHabit(habit); setHabitDialogOpen(true); }}>
                                                                    <Edit className="mr-2 h-4 w-4" />
                                                                    Edytuj
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => setHabitToDelete(habit)} className="text-destructive focus:text-destructive">
                                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                                    Usuń
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </div>

                                                    {weekDates.map((date, idx) => {
                                                        const dateStr = weekDateStrings[idx];
                                                        const isCompleted = isHabitCompleted(habit.id, dateStr);
                                                        const isFuture = dateStr > format(new Date(), 'yyyy-MM-dd');
                                                        const isActiveDay = isHabitActiveOnDay(habit, dateStr);

                                                        if (!isActiveDay) {
                                                            return <div key={dateStr} className="flex justify-center text-muted-foreground/30">—</div>;
                                                        }

                                                        return (
                                                            <div key={dateStr} className="flex justify-center">
                                                                <Checkbox
                                                                    checked={!!isCompleted}
                                                                    onCheckedChange={() => toggleHabitCompletion(habit.id, dateStr)}
                                                                    disabled={isFuture}
                                                                    className={cn(
                                                                        'h-8 w-8 rounded-md transition-all',
                                                                        isCompleted && 'border-transparent data-[state=checked]:border-transparent',
                                                                        isFuture && 'opacity-50'
                                                                    )}
                                                                    style={isCompleted ? { backgroundColor: habit.color || '#10b981', borderColor: habit.color || '#10b981' } : undefined}
                                                                />
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            </>
                        )}

                        {/* Month View */}
                        {viewMode === 'month' && (
                            <div className="space-y-4">
                                {habits.map((habit) => (
                                    <Card key={habit.id} className="overflow-hidden">
                                        <CardHeader className="pb-2">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div
                                                        className="w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0"
                                                        style={{ backgroundColor: `${habit.color || '#10b981'}20` }}
                                                    >
                                                        {habit.icon || '💪'}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium">{habit.name}</p>
                                                        <p className="text-xs text-muted-foreground">{getFrequencyLabel(habit)}</p>
                                                    </div>
                                                </div>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => { setEditingHabit(habit); setHabitDialogOpen(true); }}>
                                                            <Edit className="mr-2 h-4 w-4" />
                                                            Edytuj
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => setHabitToDelete(habit)} className="text-destructive focus:text-destructive">
                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                            Usuń
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            {/* Month Calendar Header */}
                                            <div className="grid grid-cols-7 gap-1 mb-2">
                                                {['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Ndz'].map((day) => (
                                                    <div key={day} className="text-center text-xs font-medium text-muted-foreground py-1">
                                                        {day}
                                                    </div>
                                                ))}
                                            </div>
                                            {/* Month Calendar Grid */}
                                            <div className="grid grid-cols-7 gap-1">
                                                {monthDates.map((date) => {
                                                    const dateStr = format(date, 'yyyy-MM-dd');
                                                    const isToday = isSameDay(date, new Date());
                                                    const isCurrentMonthDay = isSameMonth(date, currentMonthStart);
                                                    const isCompleted = isHabitCompleted(habit.id, dateStr);
                                                    const isFuture = dateStr > format(new Date(), 'yyyy-MM-dd');
                                                    const isActiveDay = isHabitActiveOnDay(habit, dateStr);

                                                    return (
                                                        <div
                                                            key={dateStr}
                                                            className={cn(
                                                                'aspect-square flex flex-col items-center justify-center rounded-md text-xs relative',
                                                                !isCurrentMonthDay && 'opacity-30'
                                                            )}
                                                        >
                                                            <span className={cn(
                                                                'text-[10px] w-5 h-5 flex items-center justify-center rounded-full mb-0.5',
                                                                isToday && 'bg-primary text-primary-foreground font-bold'
                                                            )}>
                                                                {format(date, 'd')}
                                                            </span>
                                                            {isCurrentMonthDay && isActiveDay ? (
                                                                <Checkbox
                                                                    checked={!!isCompleted}
                                                                    onCheckedChange={() => toggleHabitCompletion(habit.id, dateStr)}
                                                                    disabled={isFuture}
                                                                    className={cn(
                                                                        'h-5 w-5 sm:h-6 sm:w-6 rounded transition-all',
                                                                        isCompleted && 'border-transparent data-[state=checked]:border-transparent',
                                                                        isFuture && 'opacity-40'
                                                                    )}
                                                                    style={isCompleted ? { backgroundColor: habit.color || '#10b981', borderColor: habit.color || '#10b981' } : undefined}
                                                                />
                                                            ) : (
                                                                <div className="h-5 w-5 sm:h-6 sm:w-6" />
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </>
                ) : (
                    <Card>
                        <CardContent className="py-12">
                            <div className="text-center">
                                <CheckSquare className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                                <h3 className="font-headline text-xl font-semibold mb-2">
                                    Brak nawyków
                                </h3>
                                <p className="text-muted-foreground mb-4 text-sm">
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
                        </CardContent>
                    </Card>
                )}

                {/* --- Add Habit Card --- */}
                {habits && habits.length > 0 && (
                    <Card
                        onClick={() => {
                            setEditingHabit(null);
                            setHabitDialogOpen(true);
                        }}
                        className="mt-4 flex items-center justify-center border-dashed hover:border-primary hover:bg-secondary/30 transition-colors cursor-pointer py-6"
                    >
                        <CardContent className="flex items-center gap-2 text-muted-foreground p-0 text-sm">
                            <PlusCircle className="h-4 w-4" />
                            <span>Dodaj kolejny nawyk</span>
                        </CardContent>
                    </Card>
                )}
            </div>
        </>
    );
}
