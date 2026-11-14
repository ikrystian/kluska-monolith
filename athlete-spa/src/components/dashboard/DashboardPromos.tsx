import { useState, type MouseEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import useSWR from 'swr';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { ChevronRight, Megaphone, X } from 'lucide-react';
import { GarmentArt } from '@/components/shop/GarmentArt';
import { resolveMediaUrl } from '@/lib/api-client';
import { jsonFetcher, useUser } from '@/lib/db-hooks';
import { haptic } from '@/lib/haptics';
import { PRODUCTS, formatPrice } from '@/lib/shop';
import { resolveStoredImageUrl } from '@/lib/upload';
import { cn } from '@/lib/utils';

type PromoTone = 'lime' | 'ember' | 'neutral';

/** Mirrors `LiveDashboardPromo` in the backend's `src/lib/dashboard-promos.ts`. */
interface DashboardPromo {
  id: string;
  type: 'banner' | 'product' | 'article' | 'announcement';
  title: string;
  text?: string;
  imageUrl?: string;
  ctaLabel?: string;
  /** In-app path (`/athlete/...`) or an external `https://` address. */
  link?: string;
  productId?: string;
  article?: { id: string; title: string; category?: string; coverImageUrl?: string };
  tone: PromoTone;
  dismissible: boolean;
  endsAt: string | null;
}

/** More than this stops being a highlight and becomes a feed. */
const MAX_PROMOS = 5;

const DISMISSED_KEY = 'athlete-spa:dismissed-promos';

function readDismissed(): string[] {
  try {
    const stored = JSON.parse(localStorage.getItem(DISMISSED_KEY) ?? '[]');
    return Array.isArray(stored) ? stored.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

/** Promos closed on this device stay closed — a per-viewer convenience, so browser storage is enough. */
function useDismissedPromos() {
  const [dismissed, setDismissed] = useState(readDismissed);

  const dismiss = (id: string) => {
    // Bounded: ids of promos deleted long ago would otherwise pile up forever.
    const next = [...dismissed.filter(other => other !== id), id].slice(-50);
    setDismissed(next);
    try {
      localStorage.setItem(DISMISSED_KEY, JSON.stringify(next));
    } catch {
      // Storage unavailable: the promo stays closed until the app restarts.
    }
  };

  return { dismissed, dismiss };
}

const mediaUrl = (stored: string | undefined) => (stored ? resolveMediaUrl(resolveStoredImageUrl(stored)) : undefined);

const SURFACE: Record<PromoTone, string> = {
  lime: 'bg-lime text-lime-foreground',
  ember: 'bg-primary text-primary-foreground',
  neutral: 'bg-card text-foreground',
};

/** The call to action reads as a button on each surface. */
const CTA_PILL: Record<PromoTone, string> = {
  lime: 'bg-lime-foreground text-lime',
  ember: 'bg-primary-foreground text-primary',
  neutral: 'bg-foreground text-background',
};

/** The close button sits beside the card, not inside it, so it needs the surface's ink spelled out. */
const DISMISS_INK: Record<PromoTone, string> = {
  lime: 'text-lime-foreground/70',
  ember: 'text-primary-foreground/70',
  neutral: 'text-muted-foreground',
};

const ICON_TINT: Record<PromoTone, string> = {
  lime: 'bg-lime/15 text-volt',
  ember: 'bg-primary/15 text-primary',
  neutral: 'bg-secondary text-muted-foreground',
};

/**
 * One promo: the whole card is the tap target (a route, an external page, or
 * nothing), with the close button laid over it as a sibling — a button cannot
 * live inside a link.
 */
function PromoCard({
  href,
  label,
  className,
  children,
  onDismiss,
  dismissClassName,
}: {
  href?: string;
  label: string;
  className: string;
  children: ReactNode;
  onDismiss?: () => void;
  dismissClassName?: string;
}) {
  const openExternal = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!Capacitor.isNativePlatform() || !href) return;
    // Inside the native app a plain link would replace the app's own page.
    event.preventDefault();
    void Browser.open({ url: href });
  };

  const body = !href ? (
    <div className={className}>{children}</div>
  ) : href.startsWith('/') ? (
    <Link to={href} aria-label={label} className={cn(className, 'transition-transform active:scale-[0.99]')}>
      {children}
    </Link>
  ) : (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      onClick={openExternal}
      className={cn(className, 'transition-transform active:scale-[0.99]')}
    >
      {children}
    </a>
  );

  return (
    <div className="relative h-full">
      {body}
      {onDismiss && (
        <button
          type="button"
          aria-label={`Zamknij: ${label}`}
          onClick={onDismiss}
          className={cn(
            // The pseudo-element widens the tap area to 44px without growing the icon.
            'absolute grid h-8 w-8 place-items-center rounded-full before:absolute before:-inset-1.5 active:scale-90',
            dismissClassName
          )}
        >
          <X className="h-4 w-4" strokeWidth={2.5} />
        </button>
      )}
    </div>
  );
}

function CtaPill({ tone, children }: { tone: PromoTone | 'photo'; children: ReactNode }) {
  return (
    <span
      className={cn(
        'mt-3 inline-flex h-9 items-center gap-0.5 self-start rounded-full pl-3.5 pr-2.5 text-sm font-semibold',
        tone === 'photo' ? 'bg-white text-black' : CTA_PILL[tone]
      )}
    >
      {children}
      <ChevronRight className="h-4 w-4" />
    </span>
  );
}

function BannerPromo({ promo, onDismiss }: { promo: DashboardPromo; onDismiss?: () => void }) {
  const image = mediaUrl(promo.imageUrl);

  return (
    <PromoCard
      href={promo.link}
      label={promo.title}
      onDismiss={onDismiss}
      dismissClassName={cn('right-2 top-2', image ? 'bg-black/45 text-white backdrop-blur-sm' : DISMISS_INK[promo.tone])}
      className={cn(
        'relative flex h-full flex-col overflow-hidden rounded-2xl p-4',
        // Tall enough that some of the picture stays clear above the text.
        image ? 'min-h-[12.5rem] justify-end text-white' : SURFACE[promo.tone]
      )}
    >
      {image && (
        <>
          <img src={image} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover" />
          {/* Scrim keeps the title readable on any picture. */}
          <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/10" />
        </>
      )}
      <div className={cn('relative flex flex-col', !image && onDismiss && 'pr-8')}>
        {/* Size before leading: tailwind-merge drops a leading-* that a text size follows. */}
        <h2 className={cn('line-clamp-2 font-display font-bold uppercase', image ? 'text-[2rem]' : 'text-[2.25rem]', 'leading-[0.95]')}>
          {promo.title}
        </h2>
        {promo.text && (
          <p className={cn('mt-1.5 text-sm font-medium opacity-80', image ? 'line-clamp-1' : 'line-clamp-2')}>{promo.text}</p>
        )}
        {promo.ctaLabel && <CtaPill tone={image ? 'photo' : promo.tone}>{promo.ctaLabel}</CtaPill>}
      </div>
    </PromoCard>
  );
}

/** Thumbnail on the left, a short pitch on the right: shared by product and article promos. */
function MediaPromo({
  href,
  label,
  media,
  eyebrow,
  title,
  text,
  price,
  cta,
  onDismiss,
}: {
  href: string;
  label: string;
  media: ReactNode;
  eyebrow: string;
  title: string;
  text?: string;
  price?: string;
  cta: string;
  onDismiss?: () => void;
}) {
  return (
    <PromoCard
      href={href}
      label={label}
      onDismiss={onDismiss}
      dismissClassName="right-1.5 top-1.5 text-muted-foreground"
      className="flex h-full items-stretch gap-3.5 overflow-hidden rounded-2xl bg-card p-2.5"
    >
      {media}
      <span className="flex min-w-0 flex-1 flex-col py-1 pr-1">
        <span className={cn('truncate text-xs font-semibold text-volt', onDismiss && 'pr-8')}>{eyebrow}</span>
        <span className="mt-0.5 line-clamp-2 text-[17px] font-semibold leading-tight">{title}</span>
        {text && <span className="mt-1 line-clamp-2 text-xs text-muted-foreground">{text}</span>}
        <span className="mt-auto flex items-end justify-between gap-2 pt-2.5">
          {price ? <span className="font-display text-[1.75rem] font-bold leading-none tabular-nums">{price}</span> : <span />}
          <span className="flex shrink-0 items-center gap-0.5 text-sm font-semibold text-primary">
            {cta}
            <ChevronRight className="h-4 w-4" />
          </span>
        </span>
      </span>
    </PromoCard>
  );
}

function ProductPromo({ promo, onDismiss }: { promo: DashboardPromo; onDismiss?: () => void }) {
  const product = PRODUCTS.find(candidate => candidate.id === promo.productId);
  if (!product) return null;

  return (
    <MediaPromo
      href={`/athlete/shop?product=${encodeURIComponent(product.id)}`}
      label={product.name}
      onDismiss={onDismiss}
      eyebrow={promo.title || 'Polecamy ze sklepu'}
      title={product.name}
      text={promo.text || product.tagline}
      price={formatPrice(product.price)}
      cta={promo.ctaLabel || 'Zobacz'}
      media={
        <span className="block aspect-[3/4] w-[5.75rem] shrink-0 overflow-hidden rounded-xl bg-secondary">
          {product.image ? (
            <img src={product.image} alt="" className="h-full w-full object-cover" />
          ) : (
            <GarmentArt category={product.category} color={product.colors[0]} print={product.print} className="h-full w-full p-2" />
          )}
        </span>
      }
    />
  );
}

function ArticlePromo({ promo, onDismiss }: { promo: DashboardPromo; onDismiss?: () => void }) {
  const article = promo.article;
  if (!article) return null;
  const cover = mediaUrl(article.coverImageUrl) ?? `https://picsum.photos/seed/${article.id}/300/300`;

  return (
    <MediaPromo
      href={`/athlete/knowledge-zone/${article.id}`}
      label={article.title}
      onDismiss={onDismiss}
      eyebrow={promo.title || 'Warto przeczytać'}
      title={article.title}
      text={promo.text || article.category}
      cta={promo.ctaLabel || 'Czytaj'}
      media={
        <span className="block aspect-square w-[5.75rem] shrink-0 self-center overflow-hidden rounded-xl bg-secondary">
          <img src={cover} alt="" loading="lazy" className="h-full w-full object-cover" />
        </span>
      }
    />
  );
}

function AnnouncementPromo({ promo, onDismiss }: { promo: DashboardPromo; onDismiss?: () => void }) {
  return (
    <PromoCard
      href={promo.link}
      label={promo.title}
      onDismiss={onDismiss}
      dismissClassName="right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground"
      className={cn(
        'flex h-full items-center gap-3 rounded-2xl bg-card px-3.5 py-3',
        promo.tone !== 'neutral' && 'ring-1 ring-inset',
        promo.tone === 'lime' && 'ring-volt/40',
        promo.tone === 'ember' && 'ring-primary/40',
        onDismiss && 'pr-11'
      )}
    >
      <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-xl', ICON_TINT[promo.tone])}>
        <Megaphone className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold leading-tight">{promo.title}</span>
        {promo.text && <span className="mt-0.5 line-clamp-3 block text-xs text-muted-foreground">{promo.text}</span>}
      </span>
      {promo.link && !onDismiss && <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" />}
    </PromoCard>
  );
}

const RENDERERS = {
  banner: BannerPromo,
  product: ProductPromo,
  article: ArticlePromo,
  announcement: AnnouncementPromo,
} as const;

/** Whether this build can draw the promo at all (an older app may not know a newer product or type). */
function isDrawable(promo: DashboardPromo): boolean {
  if (!(promo.type in RENDERERS)) return false;
  if (promo.type === 'product') return PRODUCTS.some(product => product.id === promo.productId);
  if (promo.type === 'article') return Boolean(promo.article);
  return Boolean(promo.title);
}

/**
 * Content the admin put on the home screen (panel: „Ekran główny”): banners,
 * a recommended product or article, announcements. One shows as a card,
 * several as a swipeable row. Renders nothing while there is none.
 */
export function DashboardPromos() {
  const { user } = useUser();
  const { data } = useSWR<{ promos: DashboardPromo[] }>(user ? '/api/dashboard-promos' : null, jsonFetcher);
  const { dismissed, dismiss } = useDismissedPromos();

  const now = Date.now();
  const promos = (data?.promos ?? [])
    // The list may come from a snapshot older than a promo's end date.
    .filter(promo => !promo.endsAt || new Date(promo.endsAt).getTime() > now)
    .filter(promo => !dismissed.includes(promo.id))
    .filter(isDrawable)
    .slice(0, MAX_PROMOS);

  if (promos.length === 0) return null;

  const cards = promos.map(promo => {
    const Renderer = RENDERERS[promo.type];
    const onDismiss = promo.dismissible
      ? () => {
          haptic('tap');
          dismiss(promo.id);
        }
      : undefined;
    return { id: promo.id, node: <Renderer promo={promo} onDismiss={onDismiss} /> };
  });

  if (cards.length === 1) {
    return <section aria-label="Wyróżnione">{cards[0].node}</section>;
  }

  return (
    <section aria-label="Wyróżnione" className="-mx-4">
      <ul className="no-scrollbar flex snap-x snap-mandatory gap-2.5 overflow-x-auto scroll-px-4 px-4">
        {cards.map(card => (
          // Narrower than the screen, so the next card peeks in and invites a swipe.
          <li key={card.id} className="w-[88%] max-w-[26rem] shrink-0 snap-start">
            {card.node}
          </li>
        ))}
      </ul>
    </section>
  );
}
