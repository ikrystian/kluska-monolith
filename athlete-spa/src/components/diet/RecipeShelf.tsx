import { Link } from 'react-router-dom';
import { ChefHat, Clock, Plus } from 'lucide-react';

import type { Article } from '@/lib/types';
import { MEAL_TYPE_LABELS } from '@/lib/nutrition';
import { haptic } from '@/lib/haptics';
import { Skeleton } from '@/components/ui/skeleton';
import { SectionHeader } from '@/components/ui/section';
import { RECIPE_CATEGORY, articleCoverUrl, hasRecipeNutrition } from '@/components/knowledge/knowledge-utils';

export const RECIPES_HREF = `/athlete/knowledge-zone?category=${encodeURIComponent(RECIPE_CATEGORY)}`;

function RecipeTile({ article, onQuickAdd }: { article: Article; onQuickAdd: (article: Article) => void }) {
    const recipe = article.recipe;
    const meta = [
        recipe?.prepMinutes ? `${recipe.prepMinutes} min` : null,
        recipe?.mealType ? MEAL_TYPE_LABELS[recipe.mealType] : null,
    ].filter(Boolean);

    return (
        <li className="relative w-[11.5rem] shrink-0 snap-start">
            <Link
                to={`/athlete/knowledge-zone/${article.id}`}
                className="pressable-sm block h-full overflow-hidden rounded-2xl bg-card"
            >
                <div className="relative aspect-[4/3] overflow-hidden bg-secondary">
                    <img src={articleCoverUrl(article, '480/360')} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                    {hasRecipeNutrition(article) && recipe && (
                        <span className="absolute bottom-2 left-2 rounded-full bg-food px-2 py-0.5 text-[11px] font-bold tabular-nums text-background">
                            {Math.round(recipe.calories)} kcal
                        </span>
                    )}
                </div>
                <div className="p-3">
                    <h3 className="line-clamp-2 h-10 text-sm font-semibold leading-5">{article.title}</h3>
                    <p className="mt-1.5 flex items-center gap-1 truncate text-[11px] text-muted-foreground">
                        {recipe?.prepMinutes ? <Clock className="h-3 w-3 shrink-0" /> : <ChefHat className="h-3 w-3 shrink-0" />}
                        {meta.length ? meta.join(' · ') : 'Przepis'}
                    </p>
                </div>
            </Link>
            <button
                type="button"
                onClick={() => {
                    haptic('tap');
                    onQuickAdd(article);
                }}
                className="absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-full bg-background/85 text-foreground shadow-sm backdrop-blur-md transition-transform active:scale-90"
                aria-label={`Dodaj „${article.title}” do jadłospisu`}
            >
                <Plus className="h-4 w-4" />
            </button>
        </li>
    );
}

interface RecipeShelfProps {
    recipes: Article[];
    isLoading: boolean;
    onQuickAdd: (article: Article) => void;
    /** Show a placeholder card instead of hiding the shelf when there are no recipes. */
    showEmpty?: boolean;
}

/** Horizontal strip of recipe posts; "+" logs the dish straight to the diary. */
export function RecipeShelf({ recipes, isLoading, onQuickAdd, showEmpty }: RecipeShelfProps) {
    if (!isLoading && recipes.length === 0 && !showEmpty) return null;

    return (
        <section data-tour="diet-recipes">
            <SectionHeader title="Przepisy" href={recipes.length ? RECIPES_HREF : undefined} />
            {isLoading && recipes.length === 0 ? (
                <div className="no-scrollbar -mx-4 flex gap-3 overflow-hidden px-4">
                    {Array.from({ length: 3 }, (_, i) => (
                        <Skeleton key={i} className="h-[13.5rem] w-[11.5rem] shrink-0 rounded-2xl" />
                    ))}
                </div>
            ) : recipes.length === 0 ? (
                <div className="flex items-center gap-3 rounded-2xl bg-card p-4">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-food/15 text-accent">
                        <ChefHat className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                        <p className="text-sm font-semibold">Przepisy już wkrótce</p>
                        <p className="text-xs text-muted-foreground">
                            Trenerzy dodadzą je w Strefie Wiedzy. Do tego czasu sięgnij po gotowe dania w{' '}
                            <Link to="/athlete/nutrition?add=1" className="font-semibold text-foreground underline underline-offset-2">
                                dzienniczku
                            </Link>
                            .
                        </p>
                    </div>
                </div>
            ) : (
                <ul className="no-scrollbar -mx-4 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 pb-1">
                    {recipes.map((article) => (
                        <RecipeTile key={article.id} article={article} onQuickAdd={onQuickAdd} />
                    ))}
                </ul>
            )}
        </section>
    );
}
