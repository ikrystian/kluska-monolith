import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import useSWR from 'swr';
import { format, parseISO, addDays } from 'date-fns';
import { pl } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

import { apiFetch } from '@/lib/api-client';
import { useFrozenDuringTransition } from '@/lib/page-transition';
import {
    MEAL_TYPES,
    MEAL_TYPE_LABELS,
    mealForNow,
    todayISO,
    type DiaryEntry,
    type DiaryResponse,
    type MealType,
} from '@/lib/nutrition';
import { Button } from '@/components/ui/button';
import { BigNumber, EmptyState } from '@/components/ui/section';
import { Skeleton } from '@/components/ui/skeleton';
import { Macro } from '@/components/dashboard/NutritionToday';
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

export default function NutritionPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    // ?date=YYYY-MM-DD opens a given day (e.g. right after adding a recipe for tomorrow).
    const [date, setDate] = useState(() => {
        const requested = searchParams.get('date');
        return requested && /^\d{4}-\d{2}-\d{2}$/.test(requested) ? requested : todayISO();
    });
    const [dialogOpen, setDialogOpen] = useState(false);
    const [dialogMealType, setDialogMealType] = useState<MealType>('Breakfast');

    // "+" shortcuts land here with ?add=1 and go straight to adding food.
    useEffect(() => {
        if (searchParams.get('add') !== '1') return;
        setDialogMealType(mealForNow());
        setDialogOpen(true);
        setSearchParams({}, { replace: true });
    }, [searchParams, setSearchParams]);
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
        <div className="page space-y-4">
            {/* Day switcher */}
            <div data-tour="nutrition-day" className="flex items-center justify-between gap-2">
                <Button variant="secondary" size="icon" onClick={() => setDate(shiftDate(date, -1))} aria-label="Poprzedni dzień">
                    <ChevronLeft className="h-5 w-5" />
                </Button>
                <button
                    type="button"
                    onClick={() => setDate(todayISO())}
                    disabled={isToday}
                    className="min-w-0 flex-1 text-center"
                    aria-label={isToday ? undefined : 'Wróć do dzisiaj'}
                >
                    <span className="block text-[15px] font-semibold capitalize leading-tight">
                        {isToday ? 'Dzisiaj' : format(parseISO(date), 'EEEE', { locale: pl })}
                    </span>
                    <span className="block text-xs text-muted-foreground">{format(parseISO(date), 'd MMMM yyyy', { locale: pl })}</span>
                </button>
                <Button variant="secondary" size="icon" onClick={() => setDate(shiftDate(date, 1))} aria-label="Następny dzień">
                    <ChevronRight className="h-5 w-5" />
                </Button>
            </div>

            {frozen.isLoading && !diary ? (
                <>
                    <Skeleton className="h-40 w-full rounded-2xl" />
                    <Skeleton className="h-32 w-full rounded-2xl" />
                    <Skeleton className="h-32 w-full rounded-2xl" />
                </>
            ) : error && !diary ? (
                <EmptyState title="Nie udało się pobrać dzienniczka" description="Spróbuj ponownie później." />
            ) : (
                <>
                    {/* Day summary */}
                    <section data-tour="nutrition-summary" className="rounded-2xl bg-card p-4">
                        <p className="flex items-baseline justify-between gap-3">
                            <span>
                                <BigNumber
                                    value={Math.abs(Math.round(remaining ?? totals.calories)).toLocaleString('pl-PL')}
                                    className={cn('text-[3.25rem]', remaining !== null && remaining < 0 && 'text-destructive')}
                                />
                                <span className="ml-1.5 text-sm font-medium text-muted-foreground">
                                    {remaining === null ? 'kcal dziś' : remaining >= 0 ? 'kcal zostało' : 'kcal ponad cel'}
                                </span>
                            </span>
                            {goal && (
                                <span className="shrink-0 text-[13px] tabular-nums text-muted-foreground">
                                    {Math.round(totals.calories).toLocaleString('pl-PL')} / {goal.dailyCalories.toLocaleString('pl-PL')}
                                </span>
                            )}
                        </p>
                        {goal && (
                            <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary">
                                <div
                                    className={cn('h-full rounded-full transition-[width] duration-500', remaining !== null && remaining < 0 ? 'bg-destructive' : 'bg-food')}
                                    style={{ width: `${Math.min(100, (totals.calories / Math.max(1, goal.dailyCalories)) * 100)}%` }}
                                />
                            </div>
                        )}
                        <div className="mt-4 grid grid-cols-3 gap-3">
                            <Macro label="Białko" value={totals.protein} target={goal?.dailyProtein} />
                            <Macro label="Węgle" value={totals.carbs} target={goal?.dailyCarbs} />
                            <Macro label="Tłuszcz" value={totals.fat} target={goal?.dailyFat} />
                        </div>
                        {!goal && (
                            <p className="mt-3 text-[13px] text-muted-foreground">
                                Brak celu żywieniowego. Poproś trenera o jego ustawienie, aby śledzić postęp.
                            </p>
                        )}
                    </section>

                    {/* Meal sections */}
                    {MEAL_TYPES.map((type) => {
                        const entries = entriesByMeal.get(type) ?? [];
                        const mealCalories = entries.reduce((acc, entry) => acc + entry.calories, 0);

                        return (
                            <section key={type} data-tour="nutrition-meal" className="overflow-hidden rounded-2xl bg-card">
                                <div className="flex items-center justify-between gap-3 py-1.5 pl-4 pr-1.5">
                                    <p className="min-w-0 truncate text-[15px] font-semibold">
                                        {MEAL_TYPE_LABELS[type]}
                                        {entries.length > 0 && (
                                            <span className="ml-2 font-medium tabular-nums text-muted-foreground">{Math.round(mealCalories)} kcal</span>
                                        )}
                                    </p>
                                    <Button variant="ghost" size="icon" onClick={() => openAddDialog(type)} aria-label={`Dodaj do: ${MEAL_TYPE_LABELS[type]}`}>
                                        <Plus className="h-5 w-5" />
                                    </Button>
                                </div>
                                {entries.length > 0 && (
                                    <ul className="divide-y divide-border/50 border-t border-border/50">
                                        {entries.map((entry) => (
                                            <li key={entry.id} className="flex items-center gap-2 py-2 pl-4 pr-1.5">
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-sm font-medium">{entry.name}</p>
                                                    <p className="truncate text-xs tabular-nums text-muted-foreground">
                                                        {entry.amount.toLocaleString('pl-PL')} {entry.unit} · B {entry.protein} · W {entry.carbs} · T {entry.fat}
                                                    </p>
                                                </div>
                                                <span className="shrink-0 font-display text-xl font-bold tabular-nums">{Math.round(entry.calories)}</span>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-9 w-9 shrink-0 text-muted-foreground"
                                                    disabled={deletingId === entry.id}
                                                    onClick={() => handleDelete(entry)}
                                                    aria-label="Usuń wpis"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </section>
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
