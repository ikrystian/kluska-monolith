import { useEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import useSWR from 'swr';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { ChevronRight, X } from 'lucide-react';
import { resolveMediaUrl } from '@/lib/api-client';
import {
  dismissAd,
  eligibleAds,
  pickWeighted,
  readDismissedAds,
  trackAdClick,
  trackAdImpression,
  type AdPlacement,
  type AdTone,
  type LiveAd,
} from '@/lib/ads';
import { jsonFetcher, useUser } from '@/lib/db-hooks';
import { haptic } from '@/lib/haptics';
import { resolveStoredImageUrl } from '@/lib/upload';
import { cn } from '@/lib/utils';

/** How long an ad must stay at least half visible before it counts as seen. */
const VIEW_MS = 1000;

const mediaUrl = (stored: string | undefined) => (stored ? resolveMediaUrl(resolveStoredImageUrl(stored)) : undefined);

const SURFACE: Record<AdTone, string> = {
  lime: 'bg-lime text-lime-foreground',
  ember: 'bg-primary text-primary-foreground',
  neutral: 'bg-card text-foreground',
};

const CTA_PILL: Record<AdTone, string> = {
  lime: 'bg-lime-foreground text-lime',
  ember: 'bg-primary-foreground text-primary',
  neutral: 'bg-foreground text-background',
};

/** The tag that marks paid or promoted content as such. */
function AdBadge({ label, onPhoto }: { label: string; onPhoto?: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex h-5 items-center rounded-full px-2 text-[10px] font-semibold uppercase tracking-wide',
        onPhoto ? 'bg-black/55 text-white backdrop-blur-sm' : 'bg-foreground/10 opacity-80'
      )}
    >
      {label}
    </span>
  );
}

function AdBody({ ad }: { ad: LiveAd }) {
  const image = mediaUrl(ad.imageUrl);

  if (ad.format === 'banner') {
    return (
      <span className="relative block overflow-hidden rounded-2xl bg-card">
        <img src={image} alt={ad.title ?? ''} loading="lazy" className="aspect-[16/7] w-full object-cover" />
        <span className="absolute left-2 top-2">
          <AdBadge label={ad.badge} onPhoto />
        </span>
      </span>
    );
  }

  if (ad.format === 'card') {
    return (
      <span className={cn('relative block overflow-hidden rounded-2xl', SURFACE[ad.tone])}>
        {image && (
          <span className="relative block">
            <img src={image} alt="" loading="lazy" className="aspect-[2/1] w-full object-cover" />
            <span className="absolute left-2 top-2">
              <AdBadge label={ad.badge} onPhoto />
            </span>
          </span>
        )}
        <span className={cn('flex flex-col p-4', !image && ad.dismissible && 'pr-11')}>
          {!image && (
            <span className="mb-2">
              <AdBadge label={ad.badge} />
            </span>
          )}
          <span className="text-lg font-bold leading-tight">{ad.title}</span>
          {ad.text && <span className="mt-1 text-sm opacity-80">{ad.text}</span>}
          {ad.ctaLabel && (
            <span
              className={cn(
                'mt-3 inline-flex h-9 items-center gap-0.5 self-start rounded-full pl-3.5 pr-2.5 text-sm font-semibold',
                CTA_PILL[ad.tone]
              )}
            >
              {ad.ctaLabel}
              <ChevronRight className="h-4 w-4" />
            </span>
          )}
        </span>
      </span>
    );
  }

  return (
    <span
      className={cn(
        'flex items-center gap-3 rounded-2xl bg-card p-2.5',
        ad.tone !== 'neutral' && 'ring-1 ring-inset',
        ad.tone === 'lime' && 'ring-volt/40',
        ad.tone === 'ember' && 'ring-primary/40',
        ad.dismissible && 'pr-11'
      )}
    >
      {image && <img src={image} alt="" loading="lazy" className="h-14 w-14 shrink-0 rounded-xl object-cover" />}
      <span className={cn('min-w-0 flex-1', !image && 'pl-1.5')}>
        <span className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{ad.badge}</span>
        <span className="block truncate text-[15px] font-semibold leading-tight">{ad.title}</span>
        {ad.text && <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">{ad.text}</span>}
      </span>
      {ad.ctaLabel && !ad.dismissible && (
        <span className="flex shrink-0 items-center gap-0.5 text-sm font-semibold text-primary">
          {ad.ctaLabel}
          <ChevronRight className="h-4 w-4" />
        </span>
      )}
    </span>
  );
}

interface AdSlotProps {
  /** The screen this slot sits on; the admin picks screens per ad. */
  placement: AdPlacement;
  className?: string;
}

/**
 * One ad for this screen, chosen among the live ones the admin assigned to it
 * (panel: „Reklamy”). Renders nothing — and takes no space — when there is
 * none. A view is reported once the ad has really been on screen; a tap opens
 * its link.
 */
export function AdSlot({ placement, className }: AdSlotProps) {
  const { user } = useUser();
  const { data } = useSWR<{ ads: LiveAd[] }>(user ? '/api/ads' : null, jsonFetcher);
  const [dismissed, setDismissed] = useState(readDismissedAds);
  const ref = useRef<HTMLDivElement>(null);

  // Chosen once per visit to the screen: re-rolling on every render would make the ad flicker.
  const candidates = useMemo(() => eligibleAds(data?.ads ?? [], placement, dismissed), [data, placement, dismissed]);
  const candidateKey = candidates.map(ad => ad.id).join(',');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const ad = useMemo(() => pickWeighted(candidates), [candidateKey]);

  useEffect(() => {
    const node = ref.current;
    if (!ad || !node || typeof IntersectionObserver === 'undefined') return;

    let timer: ReturnType<typeof setTimeout> | null = null;
    let reported = false;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (reported) return;
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          timer ??= setTimeout(() => {
            reported = true;
            trackAdImpression(ad, placement);
            observer.disconnect();
          }, VIEW_MS);
        } else if (timer) {
          clearTimeout(timer);
          timer = null;
        }
      },
      { threshold: [0, 0.5] }
    );
    observer.observe(node);

    return () => {
      observer.disconnect();
      if (timer) clearTimeout(timer);
    };
  }, [ad, placement]);

  if (!ad) return null;

  const label = ad.title ?? ad.badge;
  const tapClass = 'block transition-transform active:scale-[0.99]';

  const onTap = (event: MouseEvent<HTMLAnchorElement>) => {
    trackAdClick(ad, placement);
    if (ad.link && !ad.link.startsWith('/') && Capacitor.isNativePlatform()) {
      // Inside the native app a plain link would replace the app's own page.
      event.preventDefault();
      void Browser.open({ url: ad.link });
    }
  };

  let body: ReactNode;
  if (!ad.link) {
    body = <AdBody ad={ad} />;
  } else if (ad.link.startsWith('/')) {
    body = (
      <Link to={ad.link} aria-label={label} onClick={onTap} className={tapClass}>
        <AdBody ad={ad} />
      </Link>
    );
  } else {
    body = (
      <a href={ad.link} target="_blank" rel="noopener noreferrer sponsored" aria-label={label} onClick={onTap} className={tapClass}>
        <AdBody ad={ad} />
      </a>
    );
  }

  const onPhoto = ad.format === 'banner' || (ad.format === 'card' && Boolean(ad.imageUrl));

  return (
    <aside ref={ref} aria-label={ad.badge} className={cn('relative', className)}>
      {body}
      {ad.dismissible && (
        <button
          type="button"
          aria-label={`Zamknij: ${label}`}
          onClick={() => {
            haptic('tap');
            dismissAd(ad.id);
            setDismissed(readDismissedAds());
          }}
          className={cn(
            // The pseudo-element widens the tap area to 44px without growing the icon.
            'absolute grid h-8 w-8 place-items-center rounded-full before:absolute before:-inset-1.5 active:scale-90',
            ad.format === 'native' ? 'right-1.5 top-1/2 -translate-y-1/2' : 'right-2 top-2',
            onPhoto
              ? 'bg-black/45 text-white backdrop-blur-sm'
              : ad.format === 'card' && ad.tone === 'lime'
                ? 'text-lime-foreground/70'
                : ad.format === 'card' && ad.tone === 'ember'
                  ? 'text-primary-foreground/70'
                  : 'text-muted-foreground'
          )}
        >
          <X className="h-4 w-4" strokeWidth={2.5} />
        </button>
      )}
    </aside>
  );
}
