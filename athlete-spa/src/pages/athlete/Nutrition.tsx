import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import useSWR from 'swr';
import { CopyPlus, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

import { apiFetch } from '@/lib/api-client';
import { haptic } from '@/lib/haptics';
import { useFrozenDuringTransition } from '@/lib/page-transition';
import {
    MEAL_TYPES,
    MEAL_TYPE_LABELS,
    formatKcal,
    mealForNow,
    restoreBody,
    shiftISO,
    sumTotals,
    todayISO,
    weekOf,
    type DiaryDaySummary,
    type DiaryEntry,
    type DiaryGoal,
    type DiaryResponse,
    type MealType,
} from '@/lib/nutrition';
import { pluralForm } from '@/lib/plural';
import { EmptyState } from '@/components/ui/section';
import { Skeleton } from '@/components/ui/skeleton';
import { AddFoodDialog } from '@/components/nutrition/AddFoodDialog';
import { DayBalance } from '@/components/nutrition/DayBalance';
import { EntrySheet } from '@/components/nutrition/EntrySheet';
import { GoalSheet } from '@/components/nutrition/GoalSheet';
import { MealSection } from '@/components/nutrition/MealSection';
import { WeekStrip } from '@/components/nutrition/WeekStrip';
import { cn } from '@/lib/utils';
import { AdSlot } from '@/components/ads/AdSlot';

async function diaryFetcher(url: string): Promise<DiaryResponse> {
    const response = await apiFetch(url);
    if (!response.ok) throw new Error(`Failed to fetch: ${response.statusText}`);
    return response.json();
}

async function summaryFetcher(url: string): Promise<DiaryDaySummary[]> {
    const response = await apiFetch(url);
    if (!response.ok) throw new Error(`Failed to fetch: ${response.statusText}`);
    return (await response.json()).days ?? [];
}

const EMPTY_TOTALS = { calories: 0, protein: 0, carbs: 0, fat: 0 };

export default function NutritionPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    // ?date=YYYY-MM-DD opens a given day (e.g. right after adding a recipe for tomorrow).
    const [date, setDate] = useState(() => {
        const requested = searchParams.get('date');
        return requested && /^\d{4}-\d{2}-\d{2}$/.test(requested) ? requested : todayISO();
    });
    const [dialogOpen, setDialogOpen] = useState(false);
    const [dialogMealType, setDialogMealType] = useState<MealType>('Breakfast');
    const [editing, setEditing] = useState<DiaryEntry | null>(null);
    const [goalOpen, setGoalOpen] = useState(false);
    /** Meal being copied from the previous day; 'all' for the whole day. */
    const [copying, setCopying] = useState<MealType | 'all' | null>(null);

    // "+" shortcuts land here with ?add=1 and go straight to adding food.
    useEffect(() => {
        if (searchParams.get('add') !== '1') return;
        setDialogMealType(mealForNow());
        setDialogOpen(true);
        setSearchParams({}, { replace: true });
    }, [searchParams, setSearchParams]);

    // Every write through apiFetch revalidates these reads, so handlers only patch the cache for instant feedback.
    const { data, error, isLoading, mutate } = useSWR<DiaryResponse>(`/api/athlete/nutrition/diary?date=${date}`, diaryFetcher, {
        keepPreviousData: true,
    });
    const previousDate = shiftISO(date, -1);
    const { data: previousDay } = useSWR<DiaryResponse>(`/api/athlete/nutrition/diary?date=${previousDate}`, diaryFetcher);
    const week = useMemo(() => weekOf(date), [date]);
    const { data: weekDays } = useSWR<DiaryDaySummary[]>(`/api/athlete/nutrition/diary/summary?from=${week[0]}&to=${week[6]}`, summaryFetcher, {
        keepPreviousData: true,
    });

    const frozen = useFrozenDuringTransition(useMemo(() => ({ data: data ?? null, isLoading }), [data, isLoading]));
    const diary = frozen.data;
    // The previous day's entries stay on screen (dimmed) until the newly chosen day arrives.
    const showingOtherDay = frozen.isLoading && diary !== null;
    const isToday = date === todayISO();

    const entriesByMeal = useMemo(() => groupByMeal(diary?.entries), [diary]);
    const previousByMeal = useMemo(() => groupByMeal(previousDay?.entries), [previousDay]);

    const totals = diary?.totals ?? EMPTY_TOTALS;
    const goal = diary?.goal ?? null;
    const dayIsEmpty = (diary?.entries.length ?? 0) === 0;
    const previousEntries = previousDay?.entries ?? [];
    // "The day before" in the words the athlete would use for the open day.
    const previousName = isToday ? 'wczoraj' : date === todayISO(1) ? 'dzisiaj' : 'dzień wcześniej';

    // The open day's own totals are fresher than the weekly summary, which reloads after each write.
    const stripDays = useMemo(() => {
        const others = (weekDays ?? []).filter((day) => day.date !== date);
        return diary && !showingOtherDay && diary.entries.length > 0 ? [...others, { date, ...diary.totals, entries: diary.entries.length }] : others;
    }, [weekDays, diary, date, showingOtherDay]);

    const openAddDialog = (mealType: MealType) => {
        setDialogMealType(mealType);
        setDialogOpen(true);
    };

    /** Swaps the cached entries (and their totals) without waiting for the server. */
    const patchEntries = (update: (entries: DiaryEntry[]) => DiaryEntry[]) =>
        mutate(
            (current) => {
                if (!current) return current;
                const entries = update(current.entries);
                return { ...current, entries, totals: sumTotals(entries) };
            },
            { revalidate: false }
        );

    const restoreEntry = async (entry: DiaryEntry) => {
        try {
            const response = await apiFetch('/api/athlete/nutrition/diary', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(restoreBody(entry)),
            });
            if (!response.ok) throw new Error('Request failed');
            toast.success(`Przywrócono „${entry.name}".`);
        } catch {
            toast.error('Nie udało się przywrócić wpisu.');
        }
    };

    const handleDelete = async (entry: DiaryEntry) => {
        haptic('impact');
        void patchEntries((entries) => entries.filter((item) => item.id !== entry.id));
        try {
            const response = await apiFetch(`/api/athlete/nutrition/diary/${entry.id}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Request failed');
            toast(
                (t) => (
                    <span className="flex min-w-0 items-center gap-3">
                        <span className="min-w-0 flex-1 truncate">Usunięto „{entry.name}"</span>
                        <button
                            type="button"
                            onClick={() => {
                                toast.dismiss(t.id);
                                void restoreEntry(entry);
                            }}
                            className="-my-1 shrink-0 rounded-lg px-2 py-1 font-semibold text-primary active:bg-secondary"
                        >
                            Cofnij
                        </button>
                    </span>
                ),
                { duration: 6000 }
            );
        } catch {
            toast.error('Nie udało się usunąć wpisu.');
            void mutate();
        }
    };

    const handleCopy = async (mealType?: MealType) => {
        if (copying) return;
        setCopying(mealType ?? 'all');
        try {
            const response = await apiFetch('/api/athlete/nutrition/diary/copy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fromDate: previousDate, toDate: date, mealType }),
            });
            if (!response.ok) throw new Error('Request failed');
            const result = await response.json();
            const copied: DiaryEntry[] = result.entries ?? [];
            void patchEntries((entries) => [...entries, ...copied.filter((entry) => !entries.some((item) => item.id === entry.id))]);
            haptic('success');
            toast.success(
                mealType
                    ? `Skopiowano: ${MEAL_TYPE_LABELS[mealType].toLowerCase()} (${formatKcal(sumTotals(copied).calories)} kcal).`
                    : `Skopiowano ${copied.length} ${pluralForm(copied.length, 'wpis', 'wpisy', 'wpisów')}.`
            );
        } catch {
            toast.error('Nie udało się skopiować. Spróbuj ponownie.');
        } finally {
            setCopying(null);
        }
    };

    return (
        <div className="page space-y-4">
            <WeekStrip date={date} onChange={setDate} days={stripDays} goal={goal} />

            {frozen.isLoading && !diary ? (
                <>
                    <Skeleton className="h-44 w-full rounded-2xl" />
                    <Skeleton className="h-[60px] w-full rounded-2xl" />
                    <Skeleton className="h-[60px] w-full rounded-2xl" />
                    <Skeleton className="h-[60px] w-full rounded-2xl" />
                </>
            ) : error && !diary ? (
                <EmptyState title="Nie udało się pobrać dzienniczka" description="Spróbuj ponownie później." />
            ) : (
                <div className={cn('space-y-4 transition-opacity duration-150', showingOtherDay && 'pointer-events-none opacity-40')}>
                    <DayBalance totals={totals} goal={goal} onEditGoal={() => setGoalOpen(true)} />

                    {dayIsEmpty && previousEntries.length > 1 && !showingOtherDay && (
                        <button
                            type="button"
                            onClick={() => handleCopy()}
                            disabled={copying !== null}
                            className="pressable-sm flex w-full items-center gap-3 rounded-2xl border border-dashed border-border px-4 py-3 text-left disabled:opacity-60"
                        >
                            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-secondary text-volt">
                                {copying === 'all' ? <Loader2 className="h-[18px] w-[18px] animate-spin" /> : <CopyPlus className="h-[18px] w-[18px]" />}
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block text-sm font-semibold">Jesz podobnie jak {previousName}?</span>
                                <span className="block truncate text-xs tabular-nums text-muted-foreground">
                                    Skopiuj cały dzień · {previousEntries.length} {pluralForm(previousEntries.length, 'wpis', 'wpisy', 'wpisów')} ·{' '}
                                    {formatKcal(sumTotals(previousEntries).calories)} kcal
                                </span>
                            </span>
                        </button>
                    )}

                    {MEAL_TYPES.map((type) => (
                        <MealSection
                            key={type}
                            type={type}
                            entries={entriesByMeal.get(type) ?? []}
                            highlighted={isToday && type === mealForNow()}
                            onAdd={() => openAddDialog(type)}
                            onOpenEntry={setEditing}
                            previous={showingOtherDay ? undefined : previousByMeal.get(type)}
                            previousLabel={`Jak ${previousName}`}
                            onCopyPrevious={() => handleCopy(type)}
                            isCopying={copying === type}
                        />
                    ))}
                </div>
            )}

            <AdSlot placement="nutrition" />

            <AddFoodDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                date={date}
                defaultMealType={dialogMealType}
                onAdded={(entry) => void patchEntries((entries) => (entries.some((item) => item.id === entry.id) ? entries : [...entries, entry]))}
                goal={goal}
                totals={totals}
            />

            <EntrySheet
                entry={editing}
                onClose={() => setEditing(null)}
                onSaved={(updated) => void patchEntries((entries) => entries.map((item) => (item.id === updated.id ? updated : item)))}
                onDelete={handleDelete}
                goal={goal}
                totals={totals}
            />

            <GoalSheet
                open={goalOpen}
                onOpenChange={setGoalOpen}
                goal={goal}
                onSaved={(saved: DiaryGoal) => void mutate((current) => (current ? { ...current, goal: saved } : current), { revalidate: false })}
            />
        </div>
    );
}

function groupByMeal(entries: DiaryEntry[] | undefined): Map<MealType, DiaryEntry[]> {
    const groups = new Map<MealType, DiaryEntry[]>(MEAL_TYPES.map((type) => [type, []]));
    for (const entry of entries ?? []) groups.get(entry.mealType)?.push(entry);
    return groups;
}
