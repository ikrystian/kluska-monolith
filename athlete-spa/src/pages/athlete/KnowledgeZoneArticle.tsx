'use client';

import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { BookOpen, Check, ChefHat, Clock, Plus, Share2, Users } from 'lucide-react';
import { useCollection, useDoc } from '@/lib/db-hooks';
import type { Article, ArticleCategory } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { haptic } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import { ArticleRow, CategoryPill } from '@/components/knowledge/ArticleCards';
import {
  UNCATEGORIZED,
  articleCoverUrl,
  categoryColor,
  hasRecipeNutrition,
  isRecipeArticle,
  readingMinutes,
  useReadArticles,
} from '@/components/knowledge/knowledge-utils';
import { AddRecipeSheet } from '@/components/nutrition/AddRecipeSheet';
import { MEAL_TYPE_LABELS } from '@/lib/nutrition';
import { plural } from '@/lib/plural';

const BASE_PATH = '/athlete/knowledge-zone';
const RELATED_LIMIT = 3;

/** 0–1 share of the page scrolled, driving the top reading-progress bar. */
function useScrollProgress() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(1, window.scrollY / max) : 0);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);
  return progress;
}

const getInitials = (name: string | undefined) =>
  (name ?? '?')
    .split(' ')
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

export default function ArticlePage() {
  const { articleId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const progress = useScrollProgress();
  const { readIds, markRead } = useReadArticles();
  const [recipeSheetOpen, setRecipeSheetOpen] = useState(false);

  const { data: article, isLoading } = useDoc<Article>('articles', articleId ?? null);
  const { data: categories } = useCollection<ArticleCategory>('articleCategories');
  const { data: articles } = useCollection<Article>('articles', { status: 'published' }, { sort: { createdAt: -1 } });

  const orderedCategories = useMemo(() => categories?.map(c => c.name) ?? [], [categories]);
  const category = article?.category || UNCATEGORIZED;
  const color = categoryColor(category, orderedCategories);

  const related = useMemo(() => {
    if (!article || !articles) return [];
    const others = articles.filter(a => a.id !== article.id);
    const sameCategory = others.filter(a => (a.category || UNCATEGORIZED) === category);
    // Top up with the newest articles when the category is thin.
    const fill = others.filter(a => !sameCategory.includes(a));
    return [...sameCategory, ...fill].slice(0, RELATED_LIMIT);
  }, [article, articles, category]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [articleId]);

  useEffect(() => {
    if (article?.id) markRead(article.id);
  }, [article?.id, markRead]);

  // Opened from a shared link there is no in-app history to go back to.
  const share = async () => {
    if (!article) return;
    haptic('tap');
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: article.title, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast({ title: 'Skopiowano link do artykułu' });
      }
    } catch (err) {
      if ((err as Error)?.name !== 'AbortError') {
        toast({ title: 'Nie udało się udostępnić', variant: 'destructive' });
      }
    }
  };

  if (isLoading) {
    return (
      <div className="pb-28">
        <Skeleton className="h-[52svh] max-h-[520px] w-full rounded-none" />
        <div className="relative z-10 mx-auto -mt-10 max-w-2xl space-y-4 rounded-t-3xl bg-background px-5 pt-7">
          <Skeleton className="h-6 w-28 rounded-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-2/3" />
          <Skeleton className="h-12 w-56 rounded-full" />
          <div className="space-y-2 pt-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-4" style={{ width: `${100 - (i % 3) * 8}%` }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="mx-auto flex min-h-[60svh] max-w-md flex-col items-center justify-center px-6 text-center">
        <span className="mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-secondary text-primary">
          <BookOpen className="h-8 w-8" />
        </span>
        <h1 className="font-headline text-2xl font-bold">Nie znaleziono artykułu</h1>
        <p className="mt-2 text-sm text-muted-foreground">Mógł zostać usunięty lub przeniesiony do szkiców.</p>
        <Button asChild className="mt-6">
          <Link to={BASE_PATH}>Wróć do Strefy Wiedzy</Link>
        </Button>
      </div>
    );
  }

  const minutes = readingMinutes(article.content);
  const published = new Date(article.createdAt);
  const updated = article.updatedAt ? new Date(article.updatedAt) : null;
  const editedAt = updated && updated.getTime() - published.getTime() > 24 * 60 * 60 * 1000 ? updated : null;
  const readCount = (articles ?? []).filter(a => readIds.has(a.id)).length;
  const isRecipe = isRecipeArticle(article);
  const openRecipeSheet = () => {
    haptic('tap');
    setRecipeSheetOpen(true);
  };

  return (
    <article className="pb-28">
      <div
        className="fixed inset-x-0 top-0 z-50 h-[calc(env(safe-area-inset-top)+3px)] origin-left bg-primary transition-transform duration-100 ease-out"
        style={{ transform: `scaleX(${progress})` }}
        role="progressbar"
        aria-label="Postęp czytania"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
      />

      <div className="relative">
        <div className="relative h-[34svh] min-h-[220px] overflow-hidden bg-secondary">
          <img
            src={articleCoverUrl(article, '1600/1000')}
            alt={article.imageHint || ''}
            className="absolute inset-0 h-full w-full object-cover"
          />

        </div>

        <div className="absolute right-4 top-3">
          <button
            type="button"
            onClick={share}
            className="grid h-10 w-10 place-items-center rounded-full bg-black/35 text-white backdrop-blur-md transition-colors hover:bg-black/50"
            aria-label="Udostępnij"
          >
            <Share2 className="h-[18px] w-[18px]" />
          </button>
        </div>
      </div>

      <div className="relative z-10 -mt-6 rounded-t-3xl bg-background px-4 pt-6">
        <header>
          <Link to={`${BASE_PATH}?category=${encodeURIComponent(category)}`} className="inline-block">
            <CategoryPill label={category} color={color} />
          </Link>
          <h1 className="mt-3 font-headline text-[1.875rem] font-bold leading-[1.15] tracking-tight">
            {article.title}
          </h1>

          <div className="mt-5 flex items-center gap-3 border-b border-border/60 pb-6">
            <span
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-sm font-bold"
              style={{ backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)`, color }}
              aria-hidden
            >
              {getInitials(article.authorName)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{article.authorName}</p>
              <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                <time dateTime={published.toISOString()}>{format(published, 'd MMMM yyyy', { locale: pl })}</time>
                <span aria-hidden>·</span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {minutes} min czytania
                </span>
              </p>
            </div>
          </div>
        </header>

        {isRecipe && <RecipeCard article={article} onAdd={openRecipeSheet} />}

        <div id="knowledge-zone-article" className="article-body mt-6" dangerouslySetInnerHTML={{ __html: article.content }} />

        {isRecipe && (
          <button
            type="button"
            onClick={openRecipeSheet}
            className="pressable-sm mt-10 flex w-full items-center gap-3 rounded-2xl bg-food/10 p-4 text-left"
          >
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-food text-background">
              <ChefHat className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">Ugotowane? Zapisz w jadłospisie</span>
              <span className="block text-xs text-muted-foreground">Wybierz posiłek, a kalorie trafią do dzienniczka</span>
            </span>
            <Plus className="h-5 w-5 shrink-0 text-food" />
          </button>
        )}
        <footer className={cn(isRecipe ? 'mt-3' : 'mt-10', 'flex items-center justify-between gap-3 rounded-2xl bg-card p-4')}>
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-volt/15 text-volt">
              <Check className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold">Przeczytane</p>
              <p className="text-xs text-muted-foreground">
                {editedAt
                  ? `Zaktualizowano ${format(editedAt, 'd MMM yyyy', { locale: pl })}`
                  : articles
                    ? `${readCount} z ${articles.length} w Strefie Wiedzy`
                    : 'Dzięki za lekturę'}
              </p>
            </div>
          </div>
          <Button size="sm" variant="outline" className="shrink-0 gap-1.5" onClick={share}>
            <Share2 className="h-4 w-4" />
            Udostępnij
          </Button>
        </footer>
      </div>

      {related.length > 0 && (
        <section className="mx-auto mt-12 max-w-4xl px-5">
          <div className="mb-3 flex items-end justify-between px-1">
            <h2 className="font-headline text-xl font-bold tracking-tight">Czytaj dalej</h2>
            <Link to={BASE_PATH} className="text-sm font-semibold text-primary hover:underline">
              Wszystkie
            </Link>
          </div>
          <div className="grid gap-3">
            {related.map(item => (
              <ArticleRow
                key={item.id}
                article={item}
                href={`${BASE_PATH}/${item.id}`}
                color={categoryColor(item.category || UNCATEGORIZED, orderedCategories)}
                isRead={readIds.has(item.id)}
              />
            ))}
          </div>
        </section>
      )}

      {isRecipe && <AddRecipeSheet article={article} open={recipeSheetOpen} onOpenChange={setRecipeSheetOpen} />}
    </article>
  );
}

/** Per-serving macros of a recipe, right under the title, with the way into the diary. */
function RecipeCard({ article, onAdd }: { article: Article; onAdd: () => void }) {
  const recipe = article.recipe;
  const hasNutrition = hasRecipeNutrition(article);
  const macros = recipe
    ? [
        { label: 'Białko', value: recipe.protein },
        { label: 'Węgle', value: recipe.carbs },
        { label: 'Tłuszcz', value: recipe.fat },
      ]
    : [];

  return (
    <section className="mt-6 rounded-2xl bg-card p-4" aria-label="Wartości odżywcze">
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-[15px] font-semibold">
          <ChefHat className="h-4 w-4 text-food" />
          {hasNutrition ? 'Na 1 porcję' : 'Przepis'}
        </p>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {recipe?.prepMinutes ? (
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {recipe.prepMinutes} min
            </span>
          ) : null}
          {recipe && recipe.servings > 1 && (
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {plural(recipe.servings, 'porcja', 'porcje', 'porcji')}
            </span>
          )}
        </div>
      </div>

      {hasNutrition && recipe ? (
        <div className="mt-3 flex items-stretch gap-3">
          <div className="flex min-w-[5.5rem] flex-col justify-center rounded-xl bg-food/15 px-3 py-2">
            <span className="font-display text-3xl font-bold leading-none tabular-nums text-food">{Math.round(recipe.calories)}</span>
            <span className="mt-1 text-[11px] font-medium text-muted-foreground">kcal</span>
          </div>
          <div className="grid flex-1 grid-cols-3 gap-2">
            {macros.map(item => (
              <div key={item.label} className="flex flex-col justify-center">
                <span className="text-lg font-bold leading-none tabular-nums">{Math.round(item.value)}</span>
                <span className="mt-1 text-[11px] text-muted-foreground">{item.label} (g)</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">
          Autor nie podał makroskładników — przy dodawaniu wpiszesz własny szacunek na porcję.
        </p>
      )}

      <Button className="mt-4 h-12 w-full rounded-2xl text-[15px]" onClick={onAdd}>
        <Plus className="mr-2 h-4 w-4" />
        Dodaj do jadłospisu
      </Button>
      {recipe?.mealType && (
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Najlepiej pasuje na: <span className="font-semibold text-foreground">{MEAL_TYPE_LABELS[recipe.mealType].toLowerCase()}</span>
        </p>
      )}
    </section>
  );
}
