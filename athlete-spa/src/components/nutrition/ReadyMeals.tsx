import { useEffect, useState, type ReactNode } from 'react';
import useSWR from 'swr';
import { ChefHat, Loader2, Plus, UserRound } from 'lucide-react';

import { apiFetch } from '@/lib/api-client';
import {
    DISH_CATEGORIES,
    mealWeight,
    type DiaryEntry,
    type DishCategory,
    type MealType,
    type ReadyMeal,
} from '@/lib/nutrition';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FoodIcon, FoodList, FoodRow, MacroSummary, ServingsStepper } from '@/components/nutrition/FoodParts';
import { cn } from '@/lib/utils';

export const DISH_CATEGORY_LABEL = Object.fromEntries(DISH_CATEGORIES.map((c) => [c.value, c.label])) as Record<DishCategory, string>;

async function mealsFetcher(url: string): Promise<ReadyMeal[]> {
    const response = await apiFetch(url);
    if (!response.ok) throw new Error(`Failed to fetch: ${response.statusText}`);
    const data = await response.json();
    return data.meals ?? [];
}

export function useDebounced<T>(value: T, delay: number): T {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const timer = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);
    return debounced;
}

/** Ready-made dishes visible to the athlete, filtered by name and/or category. */
export function useReadyMeals(query: string, category: DishCategory | null = null) {
    const params = new URLSearchParams();
    if (query) params.set('query', query);
    if (category) params.set('category', category);
    return useSWR<ReadyMeal[]>(`/api/athlete/nutrition/meals?${params.toString()}`, mealsFetcher, { keepPreviousData: true });
}

function mealDetail(meal: ReadyMeal) {
    const weight = mealWeight(meal);
    return (
        <>
            {meal.fromTrainer && (
                <span className="font-medium text-primary">
                    <UserRound className="mr-0.5 inline h-3 w-3 align-[-2px]" />
                    Od trenera ·{' '}
                </span>
            )}
            {DISH_CATEGORY_LABEL[meal.dishCategory] ?? 'Inne'}
            {weight ? ` · ${weight} g` : ''} · B {Math.round(meal.protein)} g
        </>
    );
}

/** `trailing` replaces the chevron, e.g. with a one-tap "add one serving" button. */
export function ReadyMealRow({ meal, onSelect, trailing }: { meal: ReadyMeal; onSelect: (meal: ReadyMeal) => void; trailing?: ReactNode }) {
    return (
        <FoodRow
            icon={<FoodIcon icon={ChefHat} className="bg-food/15 text-food" />}
            title={meal.name}
            detail={mealDetail(meal)}
            calories={meal.calories}
            caloriesLabel="kcal / porcja"
            onClick={() => onSelect(meal)}
            trailing={trailing}
        />
    );
}

/** Horizontal strip of dish cards for the dialog's start screen. */
export function ReadyMealCarousel({ meals, onSelect }: { meals: ReadyMeal[]; onSelect: (meal: ReadyMeal) => void }) {
    return (
        // w-0 + min-w-full keeps the scroll row from widening the dialog to fit every card
        <div className="-mx-5">
            <div className="no-scrollbar flex w-0 min-w-full snap-x gap-2.5 overflow-x-auto px-5 pb-1">
                {meals.map((meal) => (
                    <button
                        key={meal.id}
                        type="button"
                        onClick={() => onSelect(meal)}
                        className="pressable-sm flex w-[9.5rem] shrink-0 snap-start flex-col justify-between rounded-2xl bg-secondary/40 p-3 text-left"
                    >
                        <span className="truncate text-[11px] font-semibold text-food">
                            {meal.fromTrainer ? 'Od trenera' : DISH_CATEGORY_LABEL[meal.dishCategory] ?? 'Inne'}
                        </span>
                        <span className="mt-1 line-clamp-2 h-10 overflow-hidden text-sm font-medium leading-5">{meal.name}</span>
                        <span className="mt-2 font-display text-xl font-bold leading-none tabular-nums">
                            {Math.round(meal.calories)}
                            <span className="ml-1 font-sans text-[11px] font-medium text-muted-foreground">kcal</span>
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
}

/**
 * Browsable list of ready-made dishes (public catalogue + the trainer's own),
 * narrowed by category chips and by the `query` typed in the dialog's search field.
 */
export function ReadyMealList({
    query = '',
    onSelect,
    trailing,
}: {
    query?: string;
    onSelect: (meal: ReadyMeal) => void;
    trailing?: (meal: ReadyMeal) => ReactNode;
}) {
    const [category, setCategory] = useState<DishCategory | null>(null);
    const debouncedQuery = useDebounced(query.trim(), 250);
    const { data: meals, error, isLoading } = useReadyMeals(debouncedQuery.length >= 2 ? debouncedQuery : '', category);

    return (
        <div className="space-y-3">
            <div className="-mx-5">
                <div className="no-scrollbar flex w-0 min-w-full gap-1.5 overflow-x-auto px-5 pb-0.5">
                    {[{ value: null, label: 'Wszystkie' } as const, ...DISH_CATEGORIES.filter((c) => c.value !== 'other')].map((option) => (
                        <button
                            key={option.value ?? 'all'}
                            type="button"
                            onClick={() => setCategory(option.value)}
                            className={cn(
                                'pressable-sm shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
                                category === option.value ? 'bg-foreground text-background' : 'bg-secondary/60 text-muted-foreground'
                            )}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            </div>

            {isLoading && !meals ? (
                <Skeleton className="h-[244px] w-full rounded-2xl" />
            ) : error && !meals ? (
                <p className="rounded-2xl bg-secondary/40 py-8 text-center text-sm text-muted-foreground">Nie udało się pobrać dań. Spróbuj ponownie.</p>
            ) : meals && meals.length === 0 ? (
                <div className="flex flex-col items-center gap-2 rounded-2xl bg-secondary/40 px-4 py-8 text-center text-sm text-muted-foreground">
                    <ChefHat className="h-6 w-6" />
                    {debouncedQuery.length >= 2 ? `Brak dań pasujących do „${debouncedQuery}".` : 'Brak dań w tej kategorii.'}
                </div>
            ) : (
                <FoodList>
                    {meals?.map((meal) => (
                        <ReadyMealRow key={meal.id} meal={meal} onSelect={onSelect} trailing={trailing?.(meal)} />
                    ))}
                </FoodList>
            )}
        </div>
    );
}

interface ReadyMealDetailProps {
    meal: ReadyMeal;
    date: string;
    mealType: MealType;
    /** Reports the calories of the chosen portion while it is being adjusted (0 when the view closes). */
    onPreview?: (calories: number) => void;
    onSaved: (entry: DiaryEntry) => void;
    onError: (message: string) => void;
}

/** Portion picker + "add to diary" for one ready-made dish. */
export function ReadyMealDetail({ meal, date, mealType, onPreview, onSaved, onError }: ReadyMealDetailProps) {
    const [servings, setServings] = useState(1);
    const [isSaving, setIsSaving] = useState(false);
    const weight = mealWeight(meal);

    const added = {
        calories: Math.round(meal.calories * servings),
        protein: meal.protein * servings,
        carbs: meal.carbs * servings,
        fat: meal.fat * servings,
    };

    useEffect(() => {
        onPreview?.(added.calories);
        return () => onPreview?.(0);
    }, [added.calories, onPreview]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const response = await apiFetch('/api/athlete/nutrition/diary', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ date, mealType, mealId: meal.id, servings }),
            });
            if (!response.ok) throw new Error('Request failed');
            onSaved((await response.json()).entry);
        } catch {
            onError('Nie udało się zapisać wpisu. Spróbuj ponownie.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-start gap-3">
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-food/15 text-food">
                    <ChefHat className="h-6 w-6" />
                </span>
                <div className="min-w-0 pt-0.5">
                    <p className="text-[17px] font-semibold leading-snug">{meal.name}</p>
                    <p className="mt-0.5 text-[13px] text-muted-foreground">
                        {meal.fromTrainer ? 'Od Twojego trenera · ' : ''}
                        {DISH_CATEGORY_LABEL[meal.dishCategory] ?? 'Inne'}
                        {weight ? ` · porcja ok. ${weight} g` : ''}
                    </p>
                </div>
            </div>

            {meal.description && <p className="text-sm text-muted-foreground">{meal.description}</p>}

            <ServingsStepper value={servings} onChange={setServings} detail={weight ? `${Math.round(weight * servings)} g` : undefined} />

            <MacroSummary {...added} />

            {meal.ingredients.length > 0 && (
                <details className="group rounded-2xl bg-secondary/40 px-3 py-2.5">
                    <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium">
                        Składniki ({meal.ingredients.length})
                        <span className="text-muted-foreground transition-transform group-open:rotate-90">›</span>
                    </summary>
                    <ul className="mt-2 space-y-1.5 text-[13px]">
                        {meal.ingredients.map((ingredient, index) => (
                            <li key={index} className="flex justify-between gap-3">
                                <span className="truncate">{ingredient.name}</span>
                                {ingredient.amount != null && (
                                    <span className="shrink-0 tabular-nums text-muted-foreground">
                                        {Math.round(ingredient.amount * servings)} {ingredient.unit ?? 'g'}
                                    </span>
                                )}
                            </li>
                        ))}
                    </ul>
                </details>
            )}

            <Button className="h-12 w-full rounded-2xl text-[15px]" onClick={handleSave} disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                Dodaj · {added.calories} kcal
            </Button>
        </div>
    );
}
