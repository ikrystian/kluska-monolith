import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import useSWR from 'swr';
import toast from 'react-hot-toast';
import { Check, ChefHat, Loader2, NotebookPen, Plus } from 'lucide-react';

import { apiFetch } from '@/lib/api-client';
import { jsonFetcher } from '@/lib/db-hooks';
import { haptic } from '@/lib/haptics';
import { MEAL_TYPE_LABELS, mealForNow, todayISO, type DiaryResponse, type MealType } from '@/lib/nutrition';
import type { Article } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { hasRecipeNutrition } from '@/components/knowledge/knowledge-utils';
import { GoalImpact, MacroSummary, MealTypePicker, SectionLabel, ServingsStepper, formatServings } from './FoodParts';

const DAY_OPTIONS = [
    { offset: -1, label: 'Wczoraj' },
    { offset: 0, label: 'Dziś' },
    { offset: 1, label: 'Jutro' },
] as const;

type ManualKey = 'calories' | 'protein' | 'carbs' | 'fat';

const MANUAL_FIELDS: { key: ManualKey; label: string; unit: string }[] = [
    { key: 'calories', label: 'Kalorie', unit: 'kcal' },
    { key: 'protein', label: 'Białko', unit: 'g' },
    { key: 'carbs', label: 'Węgle', unit: 'g' },
    { key: 'fat', label: 'Tłuszcz', unit: 'g' },
];

const EMPTY_MANUAL: Record<ManualKey, string> = { calories: '', protein: '', carbs: '', fat: '' };

function parseManual(values: Record<ManualKey, string>) {
    const read = (value: string) => {
        const n = Number(value.replace(',', '.'));
        return Number.isFinite(n) && n > 0 ? n : 0;
    };
    return { calories: read(values.calories), protein: read(values.protein), carbs: read(values.carbs), fat: read(values.fat) };
}

/** Name the dish goes into the diary under — what the server will store too. */
export function recipeDishName(article: Pick<Article, 'title' | 'recipe'>): string {
    return article.recipe?.dishName || article.title;
}

interface AddRecipeSheetProps {
    article: Article;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

/**
 * Logs servings of a recipe's dish to the food diary: pick the day and the meal
 * (śniadanie, obiad…), adjust portions. Recipes without macros from the author
 * ask for the athlete's own per-serving estimate instead.
 */
export function AddRecipeSheet({ article, open, onOpenChange }: AddRecipeSheetProps) {
    const recipe = article.recipe;
    const hasNutrition = hasRecipeNutrition(article);

    const [dayOffset, setDayOffset] = useState<number>(0);
    const [mealType, setMealType] = useState<MealType>(recipe?.mealType ?? mealForNow());
    const [servings, setServings] = useState(1);
    const [manual, setManual] = useState(EMPTY_MANUAL);
    const [isSaving, setIsSaving] = useState(false);
    const [saved, setSaved] = useState<{ date: string; label: string } | null>(null);

    // Every opening starts fresh, with the meal that fits the recipe (or the hour).
    useEffect(() => {
        if (!open) return;
        setDayOffset(0);
        setMealType(recipe?.mealType ?? mealForNow());
        setServings(1);
        setManual(EMPTY_MANUAL);
        setSaved(null);
    }, [open, recipe?.mealType]);

    const date = todayISO(dayOffset);
    const { data: diary } = useSWR<DiaryResponse>(open ? `/api/athlete/nutrition/diary?date=${date}` : null, jsonFetcher);

    const perServing = hasNutrition && recipe ? recipe : parseManual(manual);
    const added = {
        calories: Math.round(perServing.calories * servings),
        protein: perServing.protein * servings,
        carbs: perServing.carbs * servings,
        fat: perServing.fat * servings,
    };
    const canSave = perServing.calories > 0 && !isSaving;

    const handleSave = async () => {
        if (!canSave) return;
        setIsSaving(true);
        try {
            const response = await apiFetch('/api/athlete/nutrition/diary', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    date,
                    mealType,
                    articleId: article.id,
                    servings,
                    ...(hasNutrition ? {} : { nutrition: perServing }),
                }),
            });
            if (!response.ok) throw new Error('Request failed');
            haptic('success');
            const day = DAY_OPTIONS.find((option) => option.offset === dayOffset)?.label.toLowerCase() ?? '';
            setSaved({ date, label: `${MEAL_TYPE_LABELS[mealType]} · ${day} · ${added.calories} kcal` });
        } catch {
            haptic('warning');
            toast.error('Nie udało się dodać dania. Spróbuj ponownie.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="bottom" className="space-y-0">
                {saved ? (
                    <div className="pb-1 pt-4 text-center">
                        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-volt/15 text-volt">
                            <Check className="h-8 w-8" strokeWidth={2.5} />
                        </span>
                        <SheetTitle className="mt-4 font-headline text-2xl">Dodano do jadłospisu</SheetTitle>
                        <SheetDescription className="mx-auto mt-1 max-w-[18rem]">
                            <span className="font-medium text-foreground">{recipeDishName(article)}</span>
                            <br />
                            {saved.label}
                        </SheetDescription>
                        <div className="mt-6 grid grid-cols-2 gap-2">
                            <Button variant="secondary" className="h-12 rounded-2xl" onClick={() => onOpenChange(false)}>
                                Gotowe
                            </Button>
                            <Button asChild className="h-12 rounded-2xl">
                                <Link to={`/athlete/nutrition?date=${saved.date}`}>
                                    <NotebookPen className="mr-2 h-4 w-4" />
                                    Dzienniczek
                                </Link>
                            </Button>
                        </div>
                    </div>
                ) : (
                    <>
                        <SheetHeader className="mb-5">
                            <SheetTitle className="font-headline text-2xl">Dodaj do jadłospisu</SheetTitle>
                            <SheetDescription className="flex items-center gap-1.5">
                                <ChefHat className="h-4 w-4 shrink-0 text-food" />
                                <span className="truncate">{recipeDishName(article)}</span>
                            </SheetDescription>
                        </SheetHeader>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <SectionLabel>Kiedy</SectionLabel>
                                <div className="grid grid-cols-3 gap-1 rounded-2xl bg-secondary/60 p-1" role="radiogroup" aria-label="Dzień">
                                    {DAY_OPTIONS.map((option) => (
                                        <button
                                            key={option.offset}
                                            type="button"
                                            role="radio"
                                            aria-checked={dayOffset === option.offset}
                                            onClick={() => setDayOffset(option.offset)}
                                            className={cn(
                                                'rounded-xl py-2 text-sm font-semibold transition-colors',
                                                dayOffset === option.offset ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
                                            )}
                                        >
                                            {option.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <SectionLabel>Posiłek</SectionLabel>
                                <MealTypePicker value={mealType} onChange={setMealType} />
                            </div>

                            {!hasNutrition && (
                                <div className="space-y-2 rounded-2xl border border-dashed p-3">
                                    <p className="text-xs text-muted-foreground">
                                        Autor nie podał wartości odżywczych. Wpisz swój szacunek na <span className="font-semibold text-foreground">1 porcję</span>.
                                    </p>
                                    <div className="grid grid-cols-4 gap-2">
                                        {MANUAL_FIELDS.map((field) => (
                                            <label key={field.key} className="min-w-0">
                                                <span className="mb-1 block truncate text-[11px] font-medium text-muted-foreground">
                                                    {field.label} ({field.unit})
                                                </span>
                                                <Input
                                                    inputMode="decimal"
                                                    placeholder="0"
                                                    value={manual[field.key]}
                                                    onChange={(event) => setManual((current) => ({ ...current, [field.key]: event.target.value }))}
                                                    className={cn('h-11 rounded-xl px-2 text-center tabular-nums', field.key === 'calories' && 'border-food/60')}
                                                    aria-label={`${field.label} na porcję`}
                                                />
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <ServingsStepper
                                value={servings}
                                onChange={setServings}
                                detail={recipe && recipe.servings > 1 ? `przepis na ${recipe.servings}` : undefined}
                            />

                            <MacroSummary {...added} />
                            <GoalImpact goal={diary?.goal} totals={diary?.totals} adding={added.calories} />

                            <Button className="h-12 w-full rounded-2xl text-[15px]" onClick={handleSave} disabled={!canSave}>
                                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                                {perServing.calories > 0
                                    ? `Dodaj ${formatServings(servings)} × · ${added.calories} kcal`
                                    : 'Wpisz kalorie na porcję'}
                            </Button>
                        </div>
                    </>
                )}
            </SheetContent>
        </Sheet>
    );
}
