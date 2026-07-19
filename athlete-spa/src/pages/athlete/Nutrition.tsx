import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { format, parseISO, addDays } from 'date-fns';
import { pl } from 'date-fns/locale';
import {
    Beef,
    ChevronLeft,
    ChevronRight,
    Droplets,
    Flame,
    NotebookPen,
    Plus,
    Trash2,
    Wheat,
} from 'lucide-react';
import { toast } from 'sonner';

import { apiFetch } from '@/lib/api-client';
import { useFrozenDuringTransition } from '@/lib/page-transition';
import {
    MEAL_TYPES,
    MEAL_TYPE_LABELS,
    todayISO,
    type DiaryEntry,
    type DiaryResponse,
    type MealType,
} from '@/lib/nutrition';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { AddFoodDialog } from '@/components/nutrition/AddFoodDialog';
import { cn } from '@/lib/utils';

async function diaryFetcher(url: string): Promise<DiaryResponse> {
    const response = await apiFetch(url);
    if (!response.ok) throw new Error(`Failed to fetch: ${response.statusText}`);
    return response.json();
}

function shiftDate(date: string, days: number): string {
    return format(addDays(parseISO(date), days), 'yyyy-MM-dd');
}

function MacroStat({ icon: Icon, value, goal, label }: { icon: typeof Flame; value: number; goal?: number; label: string }) {
    return (
        <div className="space-y-1 text-center">
            <div className="flex items-center justify-center">
                <Icon className="h-4 w-4 text-primary" />
            </div>
            <p className="text-lg font-bold leading-none">
                {Math.round(value)}
                {goal ? <span className="text-xs font-medium text-muted-foreground"> / {Math.round(goal)}</span> : null}
            </p>
            <p className="text-xs text-muted-foreground">{label}</p>
        </div>
    );
}

export default function NutritionPage() {
    const [date, setDate] = useState(todayISO());
    const [dialogOpen, setDialogOpen] = useState(false);
    const [dialogMealType, setDialogMealType] = useState<MealType>('Breakfast');
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const { data, error, isLoading, mutate } = useSWR<DiaryResponse>(
        `/api/athlete/nutrition/diary?date=${date}`,
        diaryFetcher
    );
    const frozen = useFrozenDuringTransition(
        useMemo(() => ({ data: data ?? null, isLoading }), [data, isLoading])
    );

    const diary = frozen.data;
    const isToday = date === todayISO();

    const entriesByMeal = useMemo(() => {
        const groups = new Map<MealType, DiaryEntry[]>(MEAL_TYPES.map((type) => [type, []]));
        for (const entry of diary?.entries ?? []) {
            groups.get(entry.mealType)?.push(entry);
        }
        return groups;
    }, [diary]);

    const openAddDialog = (mealType: MealType) => {
        setDialogMealType(mealType);
        setDialogOpen(true);
    };

    const handleDelete = async (entry: DiaryEntry) => {
        setDeletingId(entry.id);
        try {
            const response = await apiFetch(`/api/athlete/nutrition/diary/${entry.id}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Request failed');
            toast.success(`Usunięto „${entry.name}".`);
            void mutate();
        } catch {
            toast.error('Nie udało się usunąć wpisu.');
        } finally {
            setDeletingId(null);
        }
    };

    const totals = diary?.totals ?? { calories: 0, protein: 0, carbs: 0, fat: 0 };
    const goal = diary?.goal ?? null;
    const remaining = goal ? goal.dailyCalories - totals.calories : null;

    return (
        <div className="container mx-auto space-y-6 p-4 md:p-8">
            {/* Header */}
            <section className="relative overflow-hidden rounded-3xl border border-primary/10 bg-gradient-to-br from-primary/10 via-primary/5 to-background p-6 md:p-8">
                <div className="absolute top-0 right-0 -mt-16 -mr-16 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
                <div className="relative z-10 space-y-3">
                    <Badge variant="secondary" className="rounded-full px-4 py-1 text-sm font-medium">
                        <NotebookPen className="mr-1.5 h-3.5 w-3.5" />
                        Dzienniczek Kalorii
                    </Badge>
                    <h1 className="font-headline text-3xl font-bold tracking-tight md:text-4xl">
                        {isToday ? 'Dzisiaj' : format(parseISO(date), 'EEEE', { locale: pl })}
                    </h1>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => setDate(shiftDate(date, -1))}>
                            <ChevronLeft className="h-4 w-4" />
                            <span className="sr-only">Poprzedni dzień</span>
                        </Button>
                        <span className="min-w-36 text-center text-sm font-medium text-muted-foreground">
                            {format(parseISO(date), 'd MMMM yyyy', { locale: pl })}
                        </span>
                        <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => setDate(shiftDate(date, 1))}>
                            <ChevronRight className="h-4 w-4" />
                            <span className="sr-only">Następny dzień</span>
                        </Button>
                        {!isToday && (
                            <Button variant="ghost" size="sm" className="rounded-full" onClick={() => setDate(todayISO())}>
                                Dziś
                            </Button>
                        )}
                    </div>
                </div>
            </section>

            {frozen.isLoading && !diary ? (
                <>
                    <Skeleton className="h-40 w-full rounded-xl" />
                    <Skeleton className="h-32 w-full rounded-xl" />
                    <Skeleton className="h-32 w-full rounded-xl" />
                </>
            ) : error && !diary ? (
                <div className="rounded-xl border-2 border-dashed bg-muted/30 py-12 text-center">
                    <p className="text-muted-foreground">Nie udało się pobrać dzienniczka. Spróbuj ponownie później.</p>
                </div>
            ) : (
                <>
                    {/* Day summary */}
                    <Card className="border-primary/10">
                        <CardHeader className="pb-2">
                            <div className="flex items-baseline justify-between gap-3">
                                <CardTitle className="text-base">Podsumowanie dnia</CardTitle>
                                {remaining !== null && (
                                    <span
                                        className={cn(
                                            'text-sm font-semibold',
                                            remaining >= 0 ? 'text-primary' : 'text-destructive'
                                        )}
                                    >
                                        {remaining >= 0
                                            ? `Zostało ${Math.round(remaining)} kcal`
                                            : `${Math.round(-remaining)} kcal ponad cel`}
                                    </span>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {goal && (
                                <Progress
                                    value={Math.min(100, (totals.calories / Math.max(1, goal.dailyCalories)) * 100)}
                                />
                            )}
                            <div className="grid grid-cols-4 gap-2">
                                <MacroStat icon={Flame} value={totals.calories} goal={goal?.dailyCalories} label="kcal" />
                                <MacroStat icon={Beef} value={totals.protein} goal={goal?.dailyProtein} label="Białko (g)" />
                                <MacroStat icon={Wheat} value={totals.carbs} goal={goal?.dailyCarbs} label="Węgle (g)" />
                                <MacroStat icon={Droplets} value={totals.fat} goal={goal?.dailyFat} label="Tłuszcze (g)" />
                            </div>
                            {!goal && (
                                <p className="text-center text-xs text-muted-foreground">
                                    Brak aktywnego celu żywieniowego — poproś trenera o jego ustawienie, aby śledzić postęp.
                                </p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Meal sections */}
                    {MEAL_TYPES.map((type) => {
                        const entries = entriesByMeal.get(type) ?? [];
                        const mealCalories = entries.reduce((acc, entry) => acc + entry.calories, 0);

                        return (
                            <Card key={type} className="border-primary/10">
                                <CardHeader className="pb-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-baseline gap-2">
                                            <CardTitle className="text-base">{MEAL_TYPE_LABELS[type]}</CardTitle>
                                            {entries.length > 0 && (
                                                <span className="text-sm font-semibold text-primary">
                                                    {Math.round(mealCalories)} kcal
                                                </span>
                                            )}
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="rounded-full"
                                            onClick={() => openAddDialog(type)}
                                        >
                                            <Plus className="mr-1 h-4 w-4" />
                                            Dodaj
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-0">
                                    {entries.length === 0 ? (
                                        <p className="py-2 text-sm text-muted-foreground">Brak produktów.</p>
                                    ) : (
                                        <ul className="space-y-2">
                                            {entries.map((entry) => (
                                                <li
                                                    key={entry.id}
                                                    className="flex items-center justify-between gap-3 rounded-md bg-secondary/30 px-3 py-2"
                                                >
                                                    <div className="min-w-0">
                                                        <p className="truncate text-sm font-medium">{entry.name}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {entry.amount} {entry.unit} · B: {entry.protein} g · W: {entry.carbs} g · T: {entry.fat} g
                                                        </p>
                                                    </div>
                                                    <div className="flex shrink-0 items-center gap-1">
                                                        <span className="text-sm font-semibold">{Math.round(entry.calories)} kcal</span>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                            disabled={deletingId === entry.id}
                                                            onClick={() => handleDelete(entry)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                            <span className="sr-only">Usuń wpis</span>
                                                        </Button>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })}
                </>
            )}

            <AddFoodDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                date={date}
                defaultMealType={dialogMealType}
                onAdded={() => void mutate()}
                goal={goal}
                totals={totals}
            />
        </div>
    );
}
