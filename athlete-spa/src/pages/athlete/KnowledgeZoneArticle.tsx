'use client';

import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { ArrowLeft, BookOpen, Check, Clock, Share2 } from 'lucide-react';
import { useCollection, useDoc } from '@/lib/db-hooks';
import type { Article, ArticleCategory } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { haptic } from '@/lib/haptics';
import { ArticleRow, CategoryPill } from '@/components/knowledge/ArticleCards';
import {
  UNCATEGORIZED,
  articleCoverUrl,
  categoryColor,
  readingMinutes,
  useReadArticles,
} from '@/components/knowledge/knowledge-utils';

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
  const goBack = () => {
    if (location.key !== 'default') navigate(-1);
    else navigate(BASE_PATH);
  };

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
        <Skeleton className="h-[52svh] max-h-[520px] w-full rounded-none md:mx-auto md:mt-8 md:max-w-4xl md:rounded-[2rem]" />
        <div className="relative z-10 mx-auto -mt-10 max-w-2xl space-y-4 rounded-t-[2rem] bg-background px-5 pt-7 md:mt-8 md:px-6">
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
        <Button asChild className="mt-6 rounded-full">
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

      <div className="relative md:mx-auto md:mt-8 md:max-w-4xl md:px-6">
        <div className="relative h-[52svh] max-h-[520px] min-h-[300px] overflow-hidden bg-secondary md:rounded-[2rem] md:shadow-lifted">
          <img
            src={articleCoverUrl(article, '1600/1000')}
            alt={article.imageHint || ''}
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/30" />
        </div>

        <div className="absolute inset-x-0 top-0 flex items-center justify-between px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] md:px-10 md:pt-4">
          <button
            type="button"
            onClick={goBack}
            className="grid h-10 w-10 place-items-center rounded-full bg-black/35 text-white backdrop-blur-md transition-colors hover:bg-black/50"
            aria-label="Wróć"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
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

      <div className="relative z-10 mx-auto -mt-10 max-w-2xl rounded-t-[2rem] bg-background px-5 pt-7 md:mt-0 md:rounded-none md:px-6 md:pt-10">
        <header>
          <Link to={`${BASE_PATH}?category=${encodeURIComponent(category)}`} className="inline-block">
            <CategoryPill label={category} color={color} />
          </Link>
          <h1 className="mt-3 font-headline text-[1.875rem] font-bold leading-[1.15] tracking-tight md:text-5xl">
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

        <div className="article-body mt-6" dangerouslySetInnerHTML={{ __html: article.content }} />

        <footer className="mt-10 flex items-center justify-between gap-3 rounded-[1.5rem] border border-border/60 bg-card p-4 shadow-soft">
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
          <Button size="sm" variant="outline" className="shrink-0 gap-1.5 rounded-full" onClick={share}>
            <Share2 className="h-4 w-4" />
            Udostępnij
          </Button>
        </footer>
      </div>

      {related.length > 0 && (
        <section className="mx-auto mt-12 max-w-4xl px-5 md:px-6">
          <div className="mb-3 flex items-end justify-between px-1">
            <h2 className="font-headline text-xl font-bold tracking-tight">Czytaj dalej</h2>
            <Link to={BASE_PATH} className="text-sm font-semibold text-primary hover:underline">
              Wszystkie
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
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
    </article>
  );
}
