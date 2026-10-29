import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { ArrowUpRight, CheckCircle2, Clock } from 'lucide-react';
import { tint } from '@/components/profile/profile-ui';
import { cn } from '@/lib/utils';
import type { Article } from '@/lib/types';
import { articleCoverUrl, excerpt, readingMinutes } from './knowledge-utils';

interface ArticleCardProps {
  article: Article;
  href: string;
  color: string;
  isRead?: boolean;
}

export function CategoryPill({ label, color, className }: { label: string; color: string; className?: string }) {
  return (
    <span
      className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em]', className)}
      style={{ backgroundColor: tint(color, 15), color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

function ReadingMeta({ article, isRead, className }: { article: Article; isRead?: boolean; className?: string }) {
  return (
    <span className={cn('flex items-center gap-3 text-xs tabular-nums', className)}>
      <span className="flex items-center gap-1">
        <Clock className="h-3.5 w-3.5" />
        {readingMinutes(article.content)} min
      </span>
      <span>{format(new Date(article.createdAt), 'd MMM yyyy', { locale: pl })}</span>
      {isRead && (
        <span className="flex items-center gap-1 font-semibold">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Przeczytany
        </span>
      )}
    </span>
  );
}

/** Large cover card for the newest article in the current view. */
export function FeaturedArticleCard({ article, href, color, isRead }: ArticleCardProps) {
  return (
    <Link
      to={href}
      className="group relative block overflow-hidden rounded-[1.75rem] bg-secondary shadow-lifted outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="relative aspect-[4/5] w-full sm:aspect-[16/9]">
        <img
          src={articleCoverUrl(article, '1200/900')}
          alt=""
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/5" />
        <div className="absolute inset-x-0 bottom-0 p-5 text-white sm:p-7">
          <div className="mb-3 flex items-center gap-2">
            <span className="rounded-full bg-primary px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-primary-foreground">
              Najnowszy
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] backdrop-blur-md">
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
              {article.category || 'Bez kategorii'}
            </span>
          </div>
          <h2 className="font-headline text-2xl font-bold leading-tight sm:text-3xl">{article.title}</h2>
          <p className="mt-2 line-clamp-2 text-sm text-white/75">{excerpt(article.content, 180)}</p>
          <div className="mt-4 flex items-center justify-between gap-3">
            <ReadingMeta article={article} isRead={isRead} className="text-white/70" />
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-black transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5">
              <ArrowUpRight className="h-5 w-5" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

/** Compact thumbnail row; switches to a stacked card from `sm` up. */
export function ArticleRow({ article, href, color, isRead }: ArticleCardProps) {
  return (
    <Link
      to={href}
      className={cn(
        'group flex gap-4 rounded-[1.5rem] border border-border/60 bg-card p-3 shadow-soft outline-none transition-all',
        'hover:-translate-y-0.5 hover:shadow-lifted focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.99]',
        'sm:flex-col sm:gap-0 sm:p-0 sm:overflow-hidden'
      )}
    >
      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-secondary sm:aspect-[16/10] sm:h-auto sm:w-full sm:rounded-none">
        <img
          src={articleCoverUrl(article, '600/400')}
          alt=""
          loading="lazy"
          className={cn(
            'absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105',
            isRead && 'opacity-70'
          )}
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col py-0.5 sm:p-4">
        <span
          className="mb-1 text-[11px] font-bold uppercase tracking-[0.12em]"
          style={{ color }}
        >
          {article.category || 'Bez kategorii'}
        </span>
        <h3 className="line-clamp-2 font-headline text-base font-bold leading-snug">{article.title}</h3>
        <div className="hidden sm:block">
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{excerpt(article.content)}</p>
        </div>
        <ReadingMeta article={article} isRead={isRead} className="mt-auto pt-2 text-muted-foreground" />
      </div>
    </Link>
  );
}
