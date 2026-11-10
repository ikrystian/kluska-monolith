import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import useSWR from 'swr';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { CalendarDays, Flame, MessageSquare, RefreshCw, Search, UserRound, UtensilsCrossed } from 'lucide-react';

import { apiFetch } from '@/lib/api-client';
import { jsonFetcher, useCollection } from '@/lib/db-hooks';
import { haptic } from '@/lib/haptics';
import { MEAL_TYPE_LABELS, todayISO, type DiaryResponse } from '@/lib/nutrition';
import { daysLabel } from '@/lib/plural';
import { cn } from '@/lib/utils';
import type { Article, ArticleCategory } from '@/lib/types';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { SectionHeader } from '@/components/ui/section';
import { AnimatePresence, motion } from '@/components/motion';
import { ArticleRow } from '@/components/knowledge/ArticleCards';
import {
    DIET_CATEGORY,
    UNCATEGORIZED,
    categoryColor,
    isDietArticle,
    isRecipeArticle,
    useReadArticles,
} from '@/components/knowledge/knowledge-utils';
import { AddRecipeSheet } from '@/components/nutrition/AddRecipeSheet';
import { RecipeShelf } from '@/components/diet/RecipeShelf';
import {
    DaySummary,
    DiaryStrip,
    DietMealCard,
    dayTotals,
    sortDayMeals,
    type AssignedDiet,
    type DietDayMeal,
} from '@/components/diet/DietParts';
import { TourAnchor } from '@/components/tour/TourAnchor';

const RECIPE_LIMIT = 10;
const DIET_ARTICLE_LIMIT = 4;
const DIET_ARTICLES_HREF = `/athlete/knowledge-zone?category=${encodeURIComponent(DIET_CATEGORY)}`;

/** Knowledge-zone posts the screen needs; same SWR key as the Strefa Wiedzy list, so the cache is shared. */
function useDietReading() {
    const { data: articles, isLoading } = useCollection<Article>('articles', { status: 'published' }, { sort: { createdAt: -1 } });
    const { data: categories } = useCollection<ArticleCategory>('articleCategories');
    const recipes = useMemo(() => (articles ?? []).filter(isRecipeArticle).slice(0, RECIPE_LIMIT), [articles]);
    const dietArticles = useMemo(() => (articles ?? []).filter(isDietArticle), [articles]);
    const orderedCategories = useMemo(() => categories?.map((c) => c.name) ?? [], [categories]);
    return { recipes, dietArticles, orderedCategories, isLoading: isLoading && !articles };
}

function PlanHero({ diet, dayCount, avgCalories, avgMeals }: { diet: AssignedDiet; dayCount: number; avgCalories: number; avgMeals: number }) {
    const stats = [
        { icon: CalendarDays, value: daysLabel(dayCount), label: 'w planie' },
        { icon: Flame, value: `${Math.round(avgCalories).toLocaleString('pl-PL')}`, label: 'kcal / dzień' },
        { icon: UtensilsCrossed, value: `${Math.round(avgMeals * 10) / 10}`.replace('.', ','), label: 'posiłków/dzień' },
    ];
    return (
        <section data-tour="diet-hero" className="rounded-2xl bg-card p-4">
            <p className="eyebrow flex items-center gap-1.5">
                <UserRound className="h-3.5 w-3.5 text-food" />
                Plan od trenera
                {diet.updatedAt && <span className="font-normal">· {format(new Date(diet.updatedAt), 'd MMM', { locale: pl })}</span>}
            </p>
            <h1 className="mt-1 font-headline text-[1.75rem] font-bold leading-tight tracking-tight">{diet.name}</h1>
            {diet.description && <p className="mt-1.5 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{diet.description}</p>}
            <div className="mt-4 grid grid-cols-3 gap-2">
                {stats.map((stat) => (
                    <div key={stat.label} className="rounded-xl bg-secondary/50 px-3 py-2.5">
                        <stat.icon className="h-4 w-4 text-food" />
                        <p className="mt-1.5 truncate font-display text-xl font-bold leading-none tabular-nums">{stat.value}</p>
                        <p className="mt-1 truncate text-[11px] text-muted-foreground">{stat.label}</p>
                    </div>
                ))}
            </div>
        </section>
    );
}

function NoPlanHero({ hasTrainer }: { hasTrainer: boolean }) {
    return (
        <section data-tour="diet-hero" className="relative overflow-hidden rounded-2xl bg-card p-5">
            <div aria-hidden className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-food/15 blur-2xl" />
            <span className="relative grid h-12 w-12 place-items-center rounded-2xl bg-food/15 text-food">
                <UtensilsCrossed className="h-6 w-6" />
            </span>
            <h1 className="relative mt-4 font-headline text-[1.75rem] font-bold leading-tight tracking-tight">Nie masz jeszcze planu diety</h1>
            <p className="relative mt-1.5 text-sm leading-relaxed text-muted-foreground">
                {hasTrainer
                    ? 'Poproś trenera o jadłospis. Do tego czasu gotuj z przepisów poniżej i czytaj o diecie i suplementacji.'
                    : 'Jadłospis układa trener. Znajdź swojego, a w międzyczasie gotuj z przepisów i czytaj o diecie i suplementacji.'}
            </p>
            <Button asChild className="relative mt-4 h-11 w-full rounded-2xl">
                {hasTrainer ? (
                    <Link to="/athlete/chat">
                        <MessageSquare className="mr-2 h-4 w-4" />
                        Napisz do trenera
                    </Link>
                ) : (
                    <Link to="/athlete/trainers">
                        <Search className="mr-2 h-4 w-4" />
                        Znajdź trenera
                    </Link>
                )}
            </Button>
        </section>
    );
}

function DietArticles({ articles, orderedCategories, isLoading }: { articles: Article[]; orderedCategories: string[]; isLoading: boolean }) {
    const { readIds } = useReadArticles();
    if (!isLoading && articles.length === 0) return null;

    return (
        <section>
            <SectionHeader title="Dieta i suplementacja" href={DIET_ARTICLES_HREF} />
            <div className="grid gap-3">
                {isLoading && articles.length === 0
                    ? Array.from({ length: 2 }, (_, i) => <Skeleton key={i} className="h-[7.5rem] rounded-2xl" />)
                    : articles.slice(0, DIET_ARTICLE_LIMIT).map((article) => (
                          <ArticleRow
                              key={article.id}
                              article={article}
                              href={`/athlete/knowledge-zone/${article.id}`}
                              color={categoryColor(article.category || UNCATEGORIZED, orderedCategories)}
                              isRead={readIds.has(article.id)}
                          />
                      ))}
            </div>
        </section>
    );
}

function LoadingView() {
    return (
        <div className="page space-y-4">
            <Skeleton className="h-52 w-full rounded-2xl" />
            <Skeleton className="h-16 w-full rounded-2xl" />
            <div className="flex gap-2">
                {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-14 w-20 rounded-2xl" />
                ))}
            </div>
            <Skeleton className="h-36 w-full rounded-2xl" />
            <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
    );
}

export default function AthleteDietPage() {
    const { userProfile } = useUserProfile();
    const { data, error: fetchError, isLoading, mutate: refetchDiet } = useSWR<{ diet: AssignedDiet | null }>('/api/athlete/diet', jsonFetcher);
    const today = todayISO();
    const { data: diary, isLoading: diaryLoading, mutate: refetchDiary } = useSWR<DiaryResponse>(`/api/athlete/nutrition/diary?date=${today}`, jsonFetcher);
    const { recipes, dietArticles, orderedCategories, isLoading: readingLoading } = useDietReading();

    // Selected day lives in the URL so coming back from a recipe keeps it.
    const [searchParams, setSearchParams] = useSearchParams();
    const [recipeToAdd, setRecipeToAdd] = useState<Article | null>(null);
    const [recipeSheetOpen, setRecipeSheetOpen] = useState(false);
    const [loggingKey, setLoggingKey] = useState<string | null>(null);

    const diet = data?.diet ?? null;
    const sortedDays = useMemo(() => [...(diet?.days ?? [])].sort((a, b) => a.dayNumber - b.dayNumber), [diet]);
    const selectedDay = Number(searchParams.get('day'));
    const activeDay = sortedDays.find((day) => day.dayNumber === selectedDay) ?? sortedDays[0];

    // "planned meal id + meal type" pairs already logged today, to mark them eaten.
    const loggedToday = useMemo(
        () => new Set((diary?.entries ?? []).filter((e) => e.source === 'meal' && e.productId).map((e) => `${e.productId}:${e.mealType}`)),
        [diary]
    );

    const openRecipe = (article: Article) => {
        setRecipeToAdd(article);
        setRecipeSheetOpen(true);
    };

    const selectDay = (dayNumber: number) => {
        haptic('tap');
        setSearchParams({ day: String(dayNumber) }, { replace: true });
    };

    const logMeal = async (dayMeal: DietDayMeal) => {
        if (!dayMeal.meal) return;
        const key = `${dayMeal.meal.id}:${dayMeal.type}`;
        setLoggingKey(key);
        try {
            const response = await apiFetch('/api/athlete/nutrition/diary', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ date: today, mealType: dayMeal.type, mealId: dayMeal.meal.id, servings: 1 }),
            });
            if (!response.ok) throw new Error('Request failed');
            haptic('success');
            toast.success(`${MEAL_TYPE_LABELS[dayMeal.type]} w dzienniczku · ${Math.round(dayMeal.meal.totalCalories)} kcal`);
            void refetchDiary();
        } catch {
            haptic('warning');
            toast.error('Nie udało się dodać posiłku. Spróbuj ponownie.');
        } finally {
            setLoggingKey(null);
        }
    };

    if (isLoading) return <LoadingView />;

    const failed = Boolean(fetchError && !data);
    const hasPlan = Boolean(diet && sortedDays.length > 0 && activeDay);

    const recipeSheet = recipeToAdd && <AddRecipeSheet article={recipeToAdd} open={recipeSheetOpen} onOpenChange={setRecipeSheetOpen} />;
    const recipeShelf = <RecipeShelf recipes={recipes} isLoading={readingLoading} onQuickAdd={openRecipe} showEmpty={!hasPlan} />;

    if (!hasPlan || !diet || !activeDay) {
        return (
            <div className="page space-y-6">
                <div className="space-y-3">
                    {failed ? (
                        <section className="rounded-2xl bg-card p-5 text-center">
                            <UtensilsCrossed className="mx-auto h-8 w-8 text-muted-foreground" />
                            <p className="mt-3 text-[15px] font-semibold">Nie udało się pobrać diety</p>
                            <p className="mt-1 text-sm text-muted-foreground">Sprawdź połączenie i spróbuj ponownie.</p>
                            <Button variant="secondary" size="sm" className="mt-4 rounded-full" onClick={() => void refetchDiet()}>
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Spróbuj ponownie
                            </Button>
                        </section>
                    ) : (
                        <NoPlanHero hasTrainer={Boolean(userProfile?.trainerId)} />
                    )}
                    <TourAnchor name="diet-diary">
                        <DiaryStrip totals={diary?.totals} goal={diary?.goal} isLoading={diaryLoading} />
                    </TourAnchor>
                </div>
                {recipeShelf}
                <DietArticles articles={dietArticles} orderedCategories={orderedCategories} isLoading={readingLoading} />
                {recipeSheet}
            </div>
        );
    }

    const dayCalories = sortedDays.map((day) => dayTotals(day).calories);
    const avgCalories = dayCalories.reduce((a, b) => a + b, 0) / sortedDays.length;
    const avgMeals = sortedDays.reduce((acc, day) => acc + day.meals.length, 0) / sortedDays.length;
    const totals = dayTotals(activeDay);
    const meals = sortDayMeals(activeDay.meals);

    return (
        <div className="page space-y-6">
            <div className="space-y-3">
                <PlanHero diet={diet} dayCount={sortedDays.length} avgCalories={avgCalories} avgMeals={avgMeals} />
                <TourAnchor name="diet-diary">
                        <DiaryStrip totals={diary?.totals} goal={diary?.goal} isLoading={diaryLoading} />
                    </TourAnchor>
            </div>

            <section className="space-y-3">
                {sortedDays.length > 1 && (
                    <TourAnchor name="diet-days">
                        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4" role="tablist" aria-label="Dni planu">
                            {sortedDays.map((day, index) => {
                                const active = day.dayNumber === activeDay.dayNumber;
                                return (
                                    <button
                                        key={day.dayNumber}
                                        type="button"
                                        role="tab"
                                        aria-selected={active}
                                        onClick={() => selectDay(day.dayNumber)}
                                        className={cn(
                                            'pressable-sm flex min-w-[4.75rem] shrink-0 flex-col items-center rounded-2xl px-3 py-2 transition-colors',
                                            active ? 'bg-foreground text-background' : 'bg-card text-foreground'
                                        )}
                                    >
                                        <span className={cn('text-[11px] font-semibold', active ? 'text-background/70' : 'text-muted-foreground')}>Dzień</span>
                                        <span className="font-display text-xl font-bold leading-none tabular-nums">{day.dayNumber}</span>
                                        <span className={cn('mt-1 text-[10px] tabular-nums', active ? 'text-background/70' : 'text-muted-foreground')}>
                                            {Math.round(dayCalories[index])} kcal
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </TourAnchor>
                )}

                <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                        key={activeDay.dayNumber}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.15 }}
                        className="space-y-3"
                    >
                        <DaySummary dayNumber={activeDay.dayNumber} totals={totals} mealCount={activeDay.meals.length} goal={diary?.goal} />

                        {meals.map((dayMeal, index) => {
                            const key = dayMeal.meal ? `${dayMeal.meal.id}:${dayMeal.type}` : `missing-${index}`;
                            return (
                                <DietMealCard
                                    key={`${dayMeal.type}-${dayMeal.time ?? ''}-${index}`}
                                    dayMeal={dayMeal}
                                    logged={loggedToday.has(key)}
                                    isLogging={loggingKey === key}
                                    onLog={logMeal}
                                />
                            );
                        })}

                        {meals.length === 0 && (
                            <div className="rounded-2xl border border-dashed bg-card/50 py-10 text-center text-sm text-muted-foreground">
                                Brak posiłków zaplanowanych na ten dzień.
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </section>

            {recipeShelf}
            {recipeSheet}
        </div>
    );
}
