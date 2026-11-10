import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { CheckCircle2, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from '@/components/ui/carousel';
import { SectionHeader } from '@/components/ui/section';
import { Skeleton } from '@/components/ui/skeleton';
import { useCollection } from '@/lib/db-hooks';
import type { Article, ArticleCategory } from '@/lib/types';
import { CategoryPill } from '@/components/knowledge/ArticleCards';
import {
  UNCATEGORIZED,
  articleCoverUrl,
  categoryColor,
  excerpt,
  readingMinutes,
  useReadArticles,
} from '@/components/knowledge/knowledge-utils';

export function KnowledgeSlider() {
  const { data: articles, isLoading: articlesLoading } = useCollection<Article>(
    'articles',
    { status: 'published' },
    { sort: { createdAt: -1 }, limit: 8 }
  );

  const { data: categories } = useCollection<ArticleCategory>('articleCategories');
  const { readIds } = useReadArticles();

  const [api, setApi] = useState<CarouselApi>();
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  useEffect(() => {
    if (!api) return;

    const onSelect = () => {
      setCanScrollPrev(api.canScrollPrev());
      setCanScrollNext(api.canScrollNext());
    };

    onSelect();
    api.on('select', onSelect);
    api.on('reInit', onSelect);

    return () => {
      api.off('select', onSelect);
      api.off('reInit', onSelect);
    };
  }, [api]);

  const orderedCategories = useMemo(
    () => categories?.map(c => c.name) ?? [],
    [categories]
  );

  // If data has loaded and there are no published articles, keep dashboard tidy
  if (!articlesLoading && (!articles || articles.length === 0)) {
    return null;
  }

  return (
    <section>
      <SectionHeader
        title="Baza wiedzy"
        action={
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-0.5">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground"
                disabled={!canScrollPrev}
                onClick={() => api?.scrollPrev()}
                aria-label="Poprzedni artykuł"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground"
                disabled={!canScrollNext}
                onClick={() => api?.scrollNext()}
                aria-label="Następny artykuł"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Link
              to="/athlete/knowledge-zone"
              className="-my-2 flex shrink-0 items-center gap-0.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground active:text-foreground"
            >
              Wszystkie
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        }
      />

      <div className="-mx-4">
        <Carousel
          setApi={setApi}
          opts={{
            align: 'start',
            containScroll: 'trimSnaps',
            dragFree: false,
          }}
          className="w-full px-4"
        >
          <CarouselContent className="-ml-3">
            {articlesLoading && !articles
              ? Array.from({ length: 3 }).map((_, index) => (
                  <CarouselItem
                    key={`skeleton-${index}`}
                    className="basis-[76%] pl-3 sm:basis-[48%] md:basis-[36%] max-w-[320px]"
                  >
                    <div className="overflow-hidden rounded-2xl border border-border/50 bg-card">
                      <Skeleton className="aspect-[16/10] w-full rounded-none" />
                      <div className="space-y-2.5 p-3.5">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-2/3" />
                      </div>
                    </div>
                  </CarouselItem>
                ))
              : (articles ?? []).map(article => {
                  const color = categoryColor(
                    article.category || UNCATEGORIZED,
                    orderedCategories
                  );
                  const isRead = readIds.has(article.id);
                  const minutes = readingMinutes(article.content);
                  const coverUrl = articleCoverUrl(article, '600/380');

                  return (
                    <CarouselItem
                      key={article.id}
                      className="basis-[76%] pl-3 sm:basis-[48%] md:basis-[36%] max-w-[320px]"
                    >
                      <Link
                        to={`/athlete/knowledge-zone/${article.id}`}
                        className="group/card flex h-full flex-col overflow-hidden rounded-2xl border border-border/50 bg-card shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.99]"
                      >
                        <div className="relative aspect-[16/10] w-full overflow-hidden bg-secondary">
                          <img
                            src={coverUrl}
                            alt=""
                            loading="lazy"
                            className="h-full w-full object-cover transition-transform duration-500 group-hover/card:scale-105"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />

                          <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                            <CategoryPill
                              label={article.category || UNCATEGORIZED}
                              color={color}
                              className="text-[11px] py-0.5 shadow-xs backdrop-blur-md"
                            />
                          </div>

                          {isRead && (
                            <span className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-emerald-300 backdrop-blur-md">
                              <CheckCircle2 className="h-3 w-3" />
                              Przeczytany
                            </span>
                          )}

                          <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center justify-between text-[11px] font-medium text-white/85">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {minutes} min
                            </span>
                            <span>
                              {format(new Date(article.createdAt), 'd MMM yyyy', {
                                locale: pl,
                              })}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-1 flex-col justify-between p-3.5">
                          <div>
                            <h3 className="line-clamp-2 text-[14px] font-bold leading-snug text-foreground transition-colors group-hover/card:text-primary">
                              {article.title}
                            </h3>
                            <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                              {excerpt(article.content, 90)}
                            </p>
                          </div>
                          <div className="mt-3 flex items-center justify-between border-t border-border/40 pt-2.5 text-xs font-semibold text-primary">
                            <span>Czytaj artykuł</span>
                            <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover/card:translate-x-0.5" />
                          </div>
                        </div>
                      </Link>
                    </CarouselItem>
                  );
                })}
          </CarouselContent>
        </Carousel>
      </div>
    </section>
  );
}
