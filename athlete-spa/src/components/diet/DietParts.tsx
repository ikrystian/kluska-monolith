import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, ChevronDown, ChevronRight, Clock, Loader2, NotebookPen, Plus } from 'lucide-react';

import type { DiaryGoal, DiaryTotals, MealType } from '@/lib/nutrition';
import { MEAL_TYPE_LABELS } from '@/lib/nutrition';
import { cn } from '@/lib/utils';
import { BigNumber } from '@/components/ui/section';
import { MEAL_TYPE_ICONS } from '@/components/nutrition/FoodParts';

export interface DietIngredient {
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    amount?: number;
    unit?: string;
}

export interface DietMealDetails {
    id: string;
    name: string;
    category: MealType;
    ingredients: DietIngredient[];
    totalCalories: number;
    totalProtein: number;
    totalCarbs: number;
    totalFat: number;
}

export interface DietDayMeal {
    type: MealType;
    time?: string;
    meal: DietMealDetails | null;
}

export interface DietDay {
    dayNumber: number;
    meals: DietDayMeal[];
}

export interface AssignedDiet {
    id: string;
    name: string;
    description?: string;
    days: DietDay[];
    updatedAt?: string;
}

const MEAL_TYPE_ORDER: Record<MealType, number> = { Breakfast: 0, Lunch: 1, Dinner: 2, Snack: 3 };

export function sortDayMeals(meals: DietDayMeal[]): DietDayMeal[] {
    return [...meals].sort((a, b) => {
        if (a.time && b.time) return a.time.localeCompare(b.time);
        if (a.time) return -1;
        if (b.time) return 1;
        return MEAL_TYPE_ORDER[a.type] - MEAL_TYPE_ORDER[b.type];
    });
}

export function dayTotals(day: DietDay): DiaryTotals {
    return day.meals.reduce(
        (acc, { meal }) =>
            meal
                ? {
                      calories: acc.calories + meal.totalCalories,
                      protein: acc.protein + meal.totalProtein,
                      carbs: acc.carbs + meal.totalCarbs,
                      fat: acc.fat + meal.totalFat,
                  }
                : acc,
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
}

const formatKcal = (n: number) => Math.round(n).toLocaleString('pl-PL');

/** Today's diary in one line: eaten vs goal, the way into the full diary. */
export function DiaryStrip({ totals, goal, isLoading }: { totals?: DiaryTotals; goal?: DiaryGoal | null; isLoading?: boolean }) {
    const eaten = totals?.calories ?? 0;
    const target = goal?.dailyCalories ?? 0;
    const percent = target > 0 ? Math.min(100, (eaten / target) * 100) : 0;
    const over = target > 0 && eaten > target;

    return (
        <Link to="/athlete/nutrition" className="pressable-sm flex items-center gap-3 rounded-2xl bg-card p-3.5">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-food/15 text-food">
                <NotebookPen className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                    <p className="text-sm font-semibold">Dzienniczek · dziś</p>
                    <p className={cn('shrink-0 text-xs tabular-nums text-muted-foreground', isLoading && 'opacity-50')}>
                        <span className={cn('text-sm font-bold', over ? 'text-destructive' : 'text-foreground')}>{formatKcal(eaten)}</span>
                        {target > 0 ? ` / ${formatKcal(target)} kcal` : ' kcal'}
                    </p>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-secondary">
                    <div
                        className={cn('h-full rounded-full transition-[width] duration-500', over ? 'bg-destructive' : 'bg-food')}
                        style={{ width: `${target > 0 ? percent : eaten > 0 ? 100 : 0}%` }}
                    />
                </div>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        </Link>
    );
}

const MACROS = [
    { key: 'protein', label: 'Białko', kcalPerGram: 4, color: 'hsl(var(--chart-1))' },
    { key: 'carbs', label: 'Węgle', kcalPerGram: 4, color: 'hsl(var(--chart-2))' },
    { key: 'fat', label: 'Tłuszcz', kcalPerGram: 9, color: 'hsl(var(--chart-4))' },
] as const;

/** Day calories big, with the macro split as one stacked bar and a legend in grams. */
export function DaySummary({ dayNumber, totals, mealCount, goal }: { dayNumber: number; totals: DiaryTotals; mealCount: number; goal?: DiaryGoal | null }) {
    const macroKcal = MACROS.map((macro) => totals[macro.key] * macro.kcalPerGram);
    const sum = macroKcal.reduce((a, b) => a + b, 0);

    return (
        <section className="rounded-2xl bg-card p-4">
            <div className="flex items-end justify-between gap-3">
                <div>
                    <p className="eyebrow">
                        Dzień {dayNumber} · {mealCount} {mealCount === 1 ? 'posiłek' : mealCount >= 2 && mealCount <= 4 ? 'posiłki' : 'posiłków'}
                    </p>
                    <BigNumber value={formatKcal(totals.calories)} unit="kcal" className="mt-1 block text-[2.75rem]" />
                </div>
                {goal?.dailyCalories ? (
                    <p className="pb-1 text-right text-xs text-muted-foreground">
                        Twój cel
                        <span className="block text-sm font-semibold tabular-nums text-foreground">{formatKcal(goal.dailyCalories)} kcal</span>
                    </p>
                ) : null}
            </div>

            <div className="mt-4 flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-secondary">
                {sum > 0 &&
                    MACROS.map((macro, i) => (
                        <div key={macro.key} className="h-full first:rounded-l-full last:rounded-r-full" style={{ width: `${(macroKcal[i] / sum) * 100}%`, backgroundColor: macro.color }} />
                    ))}
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
                {MACROS.map((macro, i) => (
                    <div key={macro.key} className="min-w-0">
                        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: macro.color }} />
                            {macro.label}
                        </p>
                        <p className="mt-0.5 text-[15px] font-bold tabular-nums">
                            {Math.round(totals[macro.key])} g
                            <span className="ml-1 text-xs font-medium text-muted-foreground">{sum > 0 ? Math.round((macroKcal[i] / sum) * 100) : 0}%</span>
                        </p>
                    </div>
                ))}
            </div>
        </section>
    );
}

interface DietMealCardProps {
    dayMeal: DietDayMeal;
    /** Already in today's diary under this meal. */
    logged: boolean;
    isLogging: boolean;
    onLog: (dayMeal: DietDayMeal) => void;
}

/** One planned meal: what, when, macros, ingredients on demand and a one-tap "eaten". */
export function DietMealCard({ dayMeal, logged, isLogging, onLog }: DietMealCardProps) {
    const [expanded, setExpanded] = useState(false);
    const { meal } = dayMeal;
    const Icon = MEAL_TYPE_ICONS[dayMeal.type];

    return (
        <article className="rounded-2xl bg-card p-4">
            <div className="flex items-start gap-3">
                <span className={cn('grid h-11 w-11 shrink-0 place-items-center rounded-xl', logged ? 'bg-volt/15 text-volt' : 'bg-food/15 text-food')}>
                    {logged ? <Check className="h-5 w-5" strokeWidth={2.5} /> : <Icon className="h-5 w-5" />}
                </span>
                <div className="min-w-0 flex-1">
                    <p className="eyebrow flex items-center gap-1.5">
                        {MEAL_TYPE_LABELS[dayMeal.type]}
                        {dayMeal.time && (
                            <span className="flex items-center gap-0.5 tabular-nums">
                                · <Clock className="h-3 w-3" /> {dayMeal.time}
                            </span>
                        )}
                    </p>
                    <h3 className="mt-0.5 text-[15px] font-semibold leading-snug">{meal ? meal.name : 'Posiłek niedostępny'}</h3>
                    {meal && (
                        <p className="mt-1 text-xs tabular-nums text-muted-foreground">
                            B {Math.round(meal.totalProtein)} g · W {Math.round(meal.totalCarbs)} g · T {Math.round(meal.totalFat)} g
                        </p>
                    )}
                </div>
                {meal && (
                    <div className="shrink-0 text-right">
                        <BigNumber value={Math.round(meal.totalCalories)} className="text-2xl" />
                        <p className="text-[10px] text-muted-foreground">kcal</p>
                    </div>
                )}
            </div>

            {meal ? (
                <>
                    <div className="mt-3 flex items-center justify-between gap-2 border-t border-border/60 pt-3">
                        {meal.ingredients.length > 0 ? (
                            <button
                                type="button"
                                onClick={() => setExpanded((v) => !v)}
                                aria-expanded={expanded}
                                className="-ml-1 flex items-center gap-1 rounded-lg px-1 py-1 text-sm font-medium text-muted-foreground active:text-foreground"
                            >
                                Składniki ({meal.ingredients.length})
                                <ChevronDown className={cn('h-4 w-4 transition-transform', expanded && 'rotate-180')} />
                            </button>
                        ) : (
                            <span />
                        )}
                        <button
                            type="button"
                            onClick={() => onLog(dayMeal)}
                            disabled={logged || isLogging}
                            className={cn(
                                'flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold transition-transform active:scale-95 disabled:active:scale-100',
                                logged ? 'bg-volt/15 text-volt' : 'bg-secondary text-foreground'
                            )}
                        >
                            {isLogging ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : logged ? (
                                <Check className="h-4 w-4" strokeWidth={2.5} />
                            ) : (
                                <Plus className="h-4 w-4" />
                            )}
                            {logged ? 'W dzienniczku' : 'Zjedzone'}
                        </button>
                    </div>

                    {expanded && (
                        <ul className="mt-2 space-y-1.5">
                            {meal.ingredients.map((ingredient, index) => (
                                <li key={index} className="flex items-baseline justify-between gap-3 rounded-xl bg-secondary/40 px-3 py-2 text-[13px]">
                                    <span className="min-w-0 truncate">
                                        {ingredient.name}
                                        {ingredient.amount != null && (
                                            <span className="ml-1.5 tabular-nums text-muted-foreground">
                                                {ingredient.amount} {ingredient.unit || 'g'}
                                            </span>
                                        )}
                                    </span>
                                    <span className="shrink-0 tabular-nums text-muted-foreground">{Math.round(ingredient.calories)} kcal</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </>
            ) : (
                <p className="mt-2 text-sm text-muted-foreground">Ten posiłek został usunięty przez trenera. Zapytaj go o aktualizację diety.</p>
            )}
        </article>
    );
}
