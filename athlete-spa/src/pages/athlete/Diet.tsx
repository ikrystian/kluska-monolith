'use client';

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import {
    UtensilsCrossed,
    MessageSquare,
    Clock,
    Flame,
    Beef,
    Wheat,
    Droplets,
    CalendarDays,
    NotebookPen,
} from 'lucide-react';

import { apiFetch } from '@/lib/api-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { AnimatePresence, motion } from '@/components/motion';
import { cn } from '@/lib/utils';

type MealType = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';

interface DietIngredient {
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    amount?: number;
    unit?: string;
}

interface DietMealDetails {
    id: string;
    name: string;
    category: MealType;
    ingredients: DietIngredient[];
    totalCalories: number;
    totalProtein: number;
    totalCarbs: number;
    totalFat: number;
}

interface DietDayMeal {
    type: MealType;
    time?: string;
    meal: DietMealDetails | null;
}

interface DietDay {
    dayNumber: number;
    meals: DietDayMeal[];
}

interface AssignedDiet {
    id: string;
    name: string;
    description?: string;
    days: DietDay[];
    updatedAt?: string;
}

const MEAL_TYPE_LABELS: Record<MealType, string> = {
    Breakfast: 'Śniadanie',
    Lunch: 'Obiad',
    Dinner: 'Kolacja',
    Snack: 'Przekąska',
};

const MEAL_TYPE_ORDER: Record<MealType, number> = {
    Breakfast: 0,
    Lunch: 1,
    Dinner: 2,
    Snack: 3,
};

function sortDayMeals(meals: DietDayMeal[]): DietDayMeal[] {
    return [...meals].sort((a, b) => {
        if (a.time && b.time) return a.time.localeCompare(b.time);
        if (a.time) return -1;
        if (b.time) return 1;
        return MEAL_TYPE_ORDER[a.type] - MEAL_TYPE_ORDER[b.type];
    });
}

function dayTotals(day: DietDay) {
    return day.meals.reduce(
        (acc, { meal }) => {
            if (!meal) return acc;
            return {
                calories: acc.calories + meal.totalCalories,
                protein: acc.protein + meal.totalProtein,
                carbs: acc.carbs + meal.totalCarbs,
                fat: acc.fat + meal.totalFat,
            };
        },
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
}

function MacroStat({ icon: Icon, value, label }: { icon: typeof Flame; value: string; label: string }) {
    return (
        <div className="space-y-1 text-center">
            <div className="flex items-center justify-center">
                <Icon className="h-4 w-4 text-primary" />
            </div>
            <p className="text-lg font-bold leading-none">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
        </div>
    );
}

function MealCard({ dayMeal }: { dayMeal: DietDayMeal }) {
    const { meal } = dayMeal;

    return (
        <Card className="border-primary/10">
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="secondary">{MEAL_TYPE_LABELS[dayMeal.type]}</Badge>
                            {dayMeal.time && (
                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Clock className="h-3 w-3" />
                                    {dayMeal.time}
                                </span>
                            )}
                        </div>
                        <CardTitle className="mt-2 text-lg leading-snug">
                            {meal ? meal.name : 'Posiłek niedostępny'}
                        </CardTitle>
                    </div>
                    {meal && (
                        <div className="shrink-0 text-right">
                            <p className="text-lg font-bold text-primary leading-none">{Math.round(meal.totalCalories)}</p>
                            <p className="text-xs text-muted-foreground">kcal</p>
                        </div>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
                {meal ? (
                    <>
                        <div className="flex flex-wrap gap-2">
                            <Badge variant="outline" className="text-xs">B: {Math.round(meal.totalProtein)} g</Badge>
                            <Badge variant="outline" className="text-xs">W: {Math.round(meal.totalCarbs)} g</Badge>
                            <Badge variant="outline" className="text-xs">T: {Math.round(meal.totalFat)} g</Badge>
                        </div>

                        {meal.ingredients.length > 0 && (
                            <Accordion type="single" collapsible className="w-full">
                                <AccordionItem value="ingredients" className="border-none">
                                    <AccordionTrigger className="py-2 text-sm hover:no-underline">
                                        Składniki ({meal.ingredients.length})
                                    </AccordionTrigger>
                                    <AccordionContent>
                                        <ul className="space-y-2">
                                            {meal.ingredients.map((ingredient, index) => (
                                                <li
                                                    key={index}
                                                    className="flex items-baseline justify-between gap-3 rounded-md bg-secondary/30 px-3 py-2"
                                                >
                                                    <div className="min-w-0">
                                                        <p className="truncate text-sm font-medium">{ingredient.name}</p>
                                                        {ingredient.amount != null && (
                                                            <p className="text-xs text-muted-foreground">
                                                                {ingredient.amount} {ingredient.unit || 'g'}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <p className="shrink-0 text-xs text-muted-foreground">
                                                        {Math.round(ingredient.calories)} kcal
                                                    </p>
                                                </li>
                                            ))}
                                        </ul>
                                    </AccordionContent>
                                </AccordionItem>
                            </Accordion>
                        )}
                    </>
                ) : (
                    <p className="text-sm text-muted-foreground">
                        Ten posiłek został usunięty przez trenera. Zapytaj go o aktualizację diety.
                    </p>
                )}
            </CardContent>
        </Card>
    );
}

function NoDietView() {
    return (
        <div className="container mx-auto p-4 md:p-8">
            <section className="relative overflow-hidden rounded-3xl border border-primary/10 bg-gradient-to-br from-primary/10 via-primary/5 to-background p-8 md:p-12 text-center">
                <div className="absolute top-0 right-0 -mt-16 -mr-16 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
                <div className="relative z-10 mx-auto max-w-md space-y-6">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <UtensilsCrossed className="h-8 w-8" />
                    </div>
                    <h1 className="font-headline text-3xl font-bold tracking-tight">Brak przypisanej diety</h1>
                    <p className="text-muted-foreground leading-relaxed">
                        Twój trener nie przypisał Ci jeszcze planu żywieniowego. Gdy to zrobi, zobaczysz tutaj
                        wszystkie dni, posiłki i makroskładniki.
                    </p>
                    <div className="flex flex-wrap justify-center gap-3">
                        <Button size="lg" className="rounded-full" asChild>
                            <Link to="/athlete/chat">
                                <MessageSquare className="mr-2 h-4 w-4" />
                                Napisz do Trenera
                            </Link>
                        </Button>
                        <Button size="lg" variant="outline" className="rounded-full" asChild>
                            <Link to="/athlete/nutrition">
                                <NotebookPen className="mr-2 h-4 w-4" />
                                Dzienniczek Kalorii
                            </Link>
                        </Button>
                    </div>
                </div>
            </section>
        </div>
    );
}

function LoadingView() {
    return (
        <div className="container mx-auto space-y-6 p-4 md:p-8">
            <Skeleton className="h-44 w-full rounded-3xl" />
            <div className="flex gap-2">
                {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-9 w-20 rounded-full" />
                ))}
            </div>
            <Skeleton className="h-40 w-full rounded-xl" />
            <Skeleton className="h-40 w-full rounded-xl" />
        </div>
    );
}

export default function AthleteDietPage() {
    const [diet, setDiet] = useState<AssignedDiet | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedDay, setSelectedDay] = useState(1);

    useEffect(() => {
        let cancelled = false;

        async function fetchDiet() {
            try {
                const response = await apiFetch('/api/athlete/diet');
                if (!response.ok) throw new Error('Request failed');
                const data = await response.json();
                if (!cancelled) {
                    setDiet(data.diet);
                    if (data.diet?.days?.length) {
                        setSelectedDay(data.diet.days[0].dayNumber);
                    }
                }
            } catch {
                if (!cancelled) setError('Nie udało się pobrać diety. Spróbuj ponownie później.');
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        }

        fetchDiet();
        return () => {
            cancelled = true;
        };
    }, []);

    if (isLoading) return <LoadingView />;

    if (error) {
        return (
            <div className="container mx-auto p-4 md:p-8">
                <div className="rounded-xl border-2 border-dashed bg-muted/30 py-12 text-center">
                    <UtensilsCrossed className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                    <p className="text-muted-foreground">{error}</p>
                </div>
            </div>
        );
    }

    if (!diet || diet.days.length === 0) return <NoDietView />;

    const sortedDays = [...diet.days].sort((a, b) => a.dayNumber - b.dayNumber);
    const activeDay = sortedDays.find((day) => day.dayNumber === selectedDay) ?? sortedDays[0];
    const totals = dayTotals(activeDay);
    const avgCalories =
        sortedDays.reduce((acc, day) => acc + dayTotals(day).calories, 0) / sortedDays.length;

    return (
        <div className="container mx-auto space-y-6 p-4 md:p-8">
            {/* Header */}
            <section className="relative overflow-hidden rounded-3xl border border-primary/10 bg-gradient-to-br from-primary/10 via-primary/5 to-background p-6 md:p-8">
                <div className="absolute top-0 right-0 -mt-16 -mr-16 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
                <div className="relative z-10 space-y-3">
                    <Badge variant="secondary" className="rounded-full px-4 py-1 text-sm font-medium">
                        Dieta od Trenera
                    </Badge>
                    <h1 className="font-headline text-3xl font-bold tracking-tight md:text-4xl">{diet.name}</h1>
                    {diet.description && (
                        <p className="max-w-2xl leading-relaxed text-muted-foreground">{diet.description}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                            <CalendarDays className="h-4 w-4 text-primary" />
                            {sortedDays.length} {sortedDays.length === 1 ? 'dzień' : 'dni'}
                        </span>
                        <span className="flex items-center gap-1.5">
                            <Flame className="h-4 w-4 text-primary" />
                            śr. {Math.round(avgCalories)} kcal / dzień
                        </span>
                        {diet.updatedAt && (
                            <span>
                                Aktualizacja: {format(new Date(diet.updatedAt), 'd MMM yyyy', { locale: pl })}
                            </span>
                        )}
                    </div>
                    <Button variant="outline" size="sm" className="rounded-full" asChild>
                        <Link to="/athlete/nutrition">
                            <NotebookPen className="mr-2 h-4 w-4" />
                            Dzienniczek Kalorii
                        </Link>
                    </Button>
                </div>
            </section>

            {/* Day selector */}
            <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0">
                {sortedDays.map((day) => (
                    <button
                        key={day.dayNumber}
                        onClick={() => setSelectedDay(day.dayNumber)}
                        className={cn(
                            'pressable-sm shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition-colors',
                            day.dayNumber === activeDay.dayNumber
                                ? 'border-transparent bg-primary text-primary-foreground shadow-glow'
                                : 'border-border bg-secondary/40 text-muted-foreground hover:text-foreground'
                        )}
                    >
                        Dzień {day.dayNumber}
                    </button>
                ))}
            </div>

            {/* Day summary + meals */}
            <AnimatePresence mode="wait" initial={false}>
                <motion.div
                    key={activeDay.dayNumber}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.15 }}
                    className="space-y-4"
                >
                    <Card className="border-primary/10">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base">Podsumowanie dnia {activeDay.dayNumber}</CardTitle>
                            <CardDescription>
                                {activeDay.meals.length}{' '}
                                {activeDay.meals.length === 1 ? 'posiłek' : activeDay.meals.length < 5 ? 'posiłki' : 'posiłków'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-4 gap-2">
                                <MacroStat icon={Flame} value={`${Math.round(totals.calories)}`} label="kcal" />
                                <MacroStat icon={Beef} value={`${Math.round(totals.protein)} g`} label="Białko" />
                                <MacroStat icon={Wheat} value={`${Math.round(totals.carbs)} g`} label="Węgle" />
                                <MacroStat icon={Droplets} value={`${Math.round(totals.fat)} g`} label="Tłuszcze" />
                            </div>
                        </CardContent>
                    </Card>

                    {sortDayMeals(activeDay.meals).map((dayMeal, index) => (
                        <MealCard key={`${dayMeal.type}-${dayMeal.time ?? index}`} dayMeal={dayMeal} />
                    ))}

                    {activeDay.meals.length === 0 && (
                        <div className="rounded-xl border-2 border-dashed bg-muted/30 py-10 text-center">
                            <p className="text-muted-foreground">Brak posiłków zaplanowanych na ten dzień.</p>
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
    );
}
