'use client';

import { useDeferredValue, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { BookOpen, Pencil, Search, SearchX, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useCollection, useUser, useDoc } from '@/lib/db-hooks';
import { haptic } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import type { Article, ArticleCategory, UserProfile } from '@/lib/types';
import { ArticleRow, FeaturedArticleCard } from '@/components/knowledge/ArticleCards';
import { UNCATEGORIZED, categoryColor, stripHtml, useReadArticles } from '@/components/knowledge/knowledge-utils';

const ALL = 'all';

export interface KnowledgeZoneViewProps {
  /** Base path for article links (e.g., '/trainer/knowledge-zone' or '/athlete/knowledge-zone') */
  basePath: string;
  /** Path to the manage articles page */
  managePath?: string;
  /** Whether to show the manage button (defaults to checking user role) */
  showManageButton?: boolean;
}

export function KnowledgeZoneView({
  basePath,
  managePath,
  showManageButton,
}: KnowledgeZoneViewProps) {
  const { user } = useUser();
  const { data: userProfile } = useDoc<UserProfile>(user ? 'users' : null, user?.uid ?? null);
  const { data: categories, isLoading: categoriesLoading } = useCollection<ArticleCategory>('articleCategories');
  const { data: articles, isLoading: articlesLoading, error, refetch } = useCollection<Article>(
    'articles',
    { status: 'published' },
    { sort: { createdAt: -1 } }
  );
  const { readIds } = useReadArticles();

  // Category lives in the URL so "back" from an article returns to the same filter.
  const [searchParams, setSearchParams] = useSearchParams();
  const activeCategory = searchParams.get('category') ?? ALL;
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

  const canManage = showManageButton ?? (userProfile?.role === 'admin' || userProfile?.role === 'trainer');
  const manageHref = managePath ?? `${basePath}/manage`;

  const orderedCategories = useMemo(() => categories?.map(c => c.name) ?? [], [categories]);

  const countsByCategory = useMemo(() => {
    const counts = new Map<string, number>();
    for (const article of articles ?? []) {
      const name = article.category || UNCATEGORIZED;
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    return counts;
  }, [articles]);

  const chips = useMemo(() => {
    const known = orderedCategories.filter(name => countsByCategory.has(name));
    const extra = [...countsByCategory.keys()].filter(name => !orderedCategories.includes(name));
    return [...known, ...extra];
  }, [orderedCategories, countsByCategory]);

  // Index plain text once per fetch instead of re-parsing HTML on every keystroke.
  const searchIndex = useMemo(
    () => new Map((articles ?? []).map(a => [a.id, `${a.title} ${a.authorName} ${stripHtml(a.content)}`.toLowerCase()])),
    [articles]
  );

  const visibleArticles = useMemo(() => {
    return (articles ?? []).filter(article => {
      if (activeCategory !== ALL && (article.category || UNCATEGORIZED) !== activeCategory) return false;
      if (deferredQuery && !searchIndex.get(article.id)?.includes(deferredQuery)) return false;
      return true;
    });
  }, [articles, activeCategory, deferredQuery, searchIndex]);

  const selectCategory = (name: string) => {
    haptic('tap');
    setSearchParams(name === ALL ? {} : { category: name }, { replace: true });
  };

  const isLoading = articlesLoading || categoriesLoading;
  const readCount = (articles ?? []).filter(a => readIds.has(a.id)).length;
  const isSearching = deferredQuery.length > 0;
  const [featured, ...rest] = visibleArticles;
  const listArticles = isSearching ? visibleArticles : rest;
  const colorOf = (article: Article) => categoryColor(article.category || UNCATEGORIZED, orderedCategories);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-28 pt-5 md:px-6 md:pt-8">
      <header className="mb-5 flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">Wiedza od trenerów</p>
          <h1 className="font-headline text-3xl font-bold tracking-tight md:text-4xl">Strefa Wiedzy</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isLoading
              ? 'Ładowanie artykułów…'
              : `${pluralizeArticles(articles?.length ?? 0)}${readCount > 0 ? ` · przeczytane: ${readCount}` : ''}`}
          </p>
        </div>
        {canManage && (
          <Button asChild size="sm" variant="outline" className="shrink-0 gap-1.5 rounded-full">
            <Link to={manageHref}>
              <Pencil className="h-4 w-4" />
              <span className="hidden sm:inline">Zarządzaj</span>
            </Link>
          </Button>
        )}
      </header>

      <div className="sticky top-[env(safe-area-inset-top)] z-20 -mx-4 mb-5 space-y-3 bg-background/85 px-4 py-2 backdrop-blur-md md:top-16 md:-mx-6 md:px-6">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Szukaj artykułów…"
            aria-label="Szukaj artykułów"
            className="h-11 rounded-full border-border/60 bg-card pl-10 pr-10 shadow-soft [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:bg-secondary"
              aria-label="Wyczyść wyszukiwanie"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {(isLoading || chips.length > 1) && (
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:-mx-6 md:px-6 [&::-webkit-scrollbar]:hidden" role="tablist" aria-label="Kategorie">
            {isLoading
              ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-9 w-24 shrink-0 rounded-full" />)
              : [ALL, ...chips].map(name => {
                  const active = activeCategory === name;
                  const count = name === ALL ? articles?.length ?? 0 : countsByCategory.get(name) ?? 0;
                  return (
                    <button
                      key={name}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => selectCategory(name)}
                      className={cn(
                        'flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-semibold transition-colors',
                        active
                          ? 'border-foreground bg-foreground text-background'
                          : 'border-border/60 bg-card text-foreground hover:bg-secondary'
                      )}
                    >
                      {name !== ALL && (
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: categoryColor(name, orderedCategories) }} />
                      )}
                      {name === ALL ? 'Wszystkie' : name}
                      <span className={cn('text-xs tabular-nums', active ? 'text-background/60' : 'text-muted-foreground')}>
                        {count}
                      </span>
                    </button>
                  );
                })}
          </div>
        )}
      </div>

      {error ? (
        <EmptyState
          icon={BookOpen}
          text="Nie udało się załadować artykułów."
          action={
            <Button size="sm" variant="outline" className="mt-4 rounded-full" onClick={() => refetch()}>
              Spróbuj ponownie
            </Button>
          }
        />
      ) : isLoading ? (
        <div className="space-y-4">
          <Skeleton className="aspect-[4/5] w-full rounded-[1.75rem] sm:aspect-[16/9]" />
          <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-[7.5rem] rounded-[1.5rem] sm:h-72" />
            ))}
          </div>
        </div>
      ) : !articles?.length ? (
        <EmptyState icon={BookOpen} text="Brak artykułów w strefie wiedzy. Wkrótce pojawią się tu porady trenerów." />
      ) : !visibleArticles.length ? (
        <EmptyState
          icon={SearchX}
          text={isSearching ? `Brak wyników dla „${query.trim()}”.` : 'Brak artykułów w tej kategorii.'}
          action={
            <Button
              size="sm"
              variant="outline"
              className="mt-4 rounded-full"
              onClick={() => {
                setQuery('');
                selectCategory(ALL);
              }}
            >
              Pokaż wszystkie
            </Button>
          }
        />
      ) : (
        <div className="space-y-6">
          {!isSearching && featured && (
            <FeaturedArticleCard
              article={featured}
              href={`${basePath}/${featured.id}`}
              color={colorOf(featured)}
              isRead={readIds.has(featured.id)}
            />
          )}

          {listArticles.length > 0 && (
            <section>
              <h2 className="mb-3 px-1 text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                {isSearching ? `Wyniki · ${listArticles.length}` : 'Więcej artykułów'}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
                {listArticles.map(article => (
                  <ArticleRow
                    key={article.id}
                    article={article}
                    href={`${basePath}/${article.id}`}
                    color={colorOf(article)}
                    isRead={readIds.has(article.id)}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function pluralizeArticles(n: number): string {
  if (n === 1) return '1 artykuł';
  const lastTwo = n % 100;
  const last = n % 10;
  const few = last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14);
  return `${n} ${few ? 'artykuły' : 'artykułów'}`;
}

function EmptyState({
  icon: Icon,
  text,
  action,
}: {
  icon: typeof BookOpen;
  text: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-[1.75rem] border border-dashed border-border bg-card/50 p-8 text-center">
      <span className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-secondary text-primary">
        <Icon className="h-7 w-7" />
      </span>
      <p className="text-sm text-muted-foreground">{text}</p>
      {action}
    </div>
  );
}
