'use client';

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, startOfWeek, addDays, isSameDay, parseISO } from 'date-fns';
import { pl } from 'date-fns/locale';

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import type { Habit, HabitLog } from '@/lib/types';
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
import { Textarea } from '@/components/ui/textarea';
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

// --- SCHEMAS ---

const habitSchema = z.object({
    name: z.string().min(1, 'Nazwa jest wymagana.'),
    description: z.string().optional(),
    color: z.string().optional(),
});

type HabitFormValues = z.infer<typeof habitSchema>;

// --- COLOR OPTIONS ---
const colorOptions = [
    { value: '#10b981', label: 'Zielony' },
    { value: '#3b82f6', label: 'Niebieski' },
    { value: '#8b5cf6', label: 'Fioletowy' },
    { value: '#f59e0b', label: 'Pomarańczowy' },
    { value: '#ef4444', label: 'Czerwony' },
    { value: '#ec4899', label: 'Różowy' },
    { value: '#06b6d4', label: 'Turkusowy' },
];

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
        defaultValues:
            isEditMode && habit
                ? {
                    name: habit.name,
                    description: habit.description || '',
                    color: habit.color || '#10b981',
                }
                : {
                    name: '',
                    description: '',
                    color: '#10b981',
                },
    });

    const handleSubmit = async (data: HabitFormValues) => {
        try {
            await onFormSubmit(data);
            form.reset();
            onDialogClose();
        } catch (error) {
            console.error('Error submitting habit:', error);
        }
    };

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

                <div className="grid gap-4 py-4">
                    <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Nazwa Nawyku</FormLabel>
                                <FormControl>
                                    <Input
                                        placeholder="np. Pij 2L wody"
                                        {...field}
                                        disabled={form.formState.isSubmitting}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Opis (opcjonalnie)</FormLabel>
                                <FormControl>
                                    <Textarea
                                        placeholder="Dodatkowe szczegóły..."
                                        {...field}
                                        disabled={form.formState.isSubmitting}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="color"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Kolor</FormLabel>
                                <FormControl>
                                    <div className="flex gap-2 flex-wrap">
                                        {colorOptions.map((color) => (
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
                    <Button type="submit" disabled={form.formState.isSubmitting || isLoading}>
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

    // Calculate stats
    const stats = useMemo(() => {
        if (!habits || habits.length === 0) return { completionRate: 0, streak: 0 };

        const today = format(new Date(), 'yyyy-MM-dd');
        let totalPossible = 0;
        let totalCompleted = 0;

        weekDateStrings.forEach((date) => {
            if (date <= today) {
                habits.forEach((habit) => {
                    totalPossible++;
                    if (logsByHabitAndDate.get(`${habit.id}-${date}`)) {
                        totalCompleted++;
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

        try {
            if (editingHabit) {
                await updateDoc('habits', editingHabit.id, data);
                toast({
                    title: 'Nawyk Zaktualizowany!',
                    description: `Nawyk "${data.name}" został zmieniony.`,
                });
            } else {
                await createDoc('habits', {
                    ...data,
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
                // Find and delete the log
                const logToDelete = habitLogs?.find(
                    (log) => log.habitId === habitId && log.date === date
                );
                if (logToDelete) {
                    await deleteDoc('habitlogs', logToDelete.id);
                }
            } else {
                // Create a new log
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
                <DialogContent>
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
                                            <div
                                                className="w-3 h-3 rounded-full shrink-0"
                                                style={{ backgroundColor: habit.color || '#10b981' }}
                                            />
                                            <span className="font-medium truncate">{habit.name}</span>
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
