'use client';

import { ChevronRight, ImageIcon, X } from 'lucide-react';
import type { AdBadge, AdFormat, AdTone } from '@/lib/ads';
import { resolveStoredImageUrl } from '@/lib/upload';
import { cn } from '@/lib/utils';

export interface AdPreviewData {
  format: AdFormat;
  title?: string;
  text?: string;
  imageUrl?: string;
  ctaLabel?: string;
  badge: AdBadge;
  tone: AdTone;
  dismissible: boolean;
}

// The athlete app's palette (graphite, ember, lime), fixed here so the preview
// looks like the app regardless of the panel's own theme.
const SURFACE: Record<AdTone, string> = {
  neutral: 'bg-[#1d1f22] text-[#f4f1ea]',
  lime: 'bg-[#c8f04b] text-[#16180f]',
  ember: 'bg-[#ff6a1f] text-[#1a0d05]',
};

const CTA: Record<AdTone, string> = {
  neutral: 'bg-[#f4f1ea] text-[#131416]',
  lime: 'bg-[#16180f] text-[#c8f04b]',
  ember: 'bg-[#1a0d05] text-[#ff6a1f]',
};

function BadgeTag({ badge, onPhoto }: { badge: AdBadge; onPhoto?: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex h-5 items-center rounded-full px-2 text-[10px] font-semibold uppercase tracking-wide',
        onPhoto ? 'bg-black/55 text-white' : 'bg-black/10 text-current opacity-80'
      )}
    >
      {badge}
    </span>
  );
}

/** How an ad will look in the athlete app (same layout as the app's AdSlot). */
export function AdPreview({ ad }: { ad: AdPreviewData }) {
  const image = ad.imageUrl ? resolveStoredImageUrl(ad.imageUrl) : '';
  const close = ad.dismissible && (
    <span className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-black/45 text-white">
      <X className="h-3.5 w-3.5" strokeWidth={2.5} />
    </span>
  );

  let card: React.ReactNode;

  if (ad.format === 'banner') {
    card = (
      <div className="relative overflow-hidden rounded-2xl bg-[#1d1f22]">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" className="aspect-[16/7] w-full object-cover" />
        ) : (
          <div className="grid aspect-[16/7] w-full place-items-center text-[#8b8f96]">
            <ImageIcon className="h-8 w-8" />
          </div>
        )}
        <span className="absolute left-2 top-2">
          <BadgeTag badge={ad.badge} onPhoto />
        </span>
        {close}
      </div>
    );
  } else if (ad.format === 'card') {
    card = (
      <div className={cn('relative overflow-hidden rounded-2xl', SURFACE[ad.tone])}>
        {image && (
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image} alt="" className="aspect-[16/8] w-full object-cover" />
            <span className="absolute left-2 top-2">
              <BadgeTag badge={ad.badge} onPhoto />
            </span>
          </div>
        )}
        <div className="flex flex-col p-4">
          {!image && (
            <span className="mb-2">
              <BadgeTag badge={ad.badge} />
            </span>
          )}
          <span className="text-lg font-bold leading-tight">{ad.title || 'Tytuł reklamy'}</span>
          {ad.text && <span className="mt-1 text-sm opacity-80">{ad.text}</span>}
          {ad.ctaLabel && (
            <span
              className={cn(
                'mt-3 inline-flex h-9 items-center gap-0.5 self-start rounded-full pl-3.5 pr-2.5 text-sm font-semibold',
                CTA[ad.tone]
              )}
            >
              {ad.ctaLabel}
              <ChevronRight className="h-4 w-4" />
            </span>
          )}
        </div>
        {close}
      </div>
    );
  } else {
    card = (
      <div
        className={cn(
          'relative flex items-center gap-3 rounded-2xl bg-[#1d1f22] p-2.5 text-[#f4f1ea]',
          ad.tone === 'lime' && 'ring-1 ring-inset ring-[#c8f04b]/50',
          ad.tone === 'ember' && 'ring-1 ring-inset ring-[#ff6a1f]/50',
          ad.dismissible && 'pr-10'
        )}
      >
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
        ) : (
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-[#2a2d31] text-[#8b8f96]">
            <ImageIcon className="h-5 w-5" />
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block text-[10px] font-semibold uppercase tracking-wide text-[#8b8f96]">{ad.badge}</span>
          <span className="block truncate text-[15px] font-semibold leading-tight">{ad.title || 'Tytuł reklamy'}</span>
          {ad.text && <span className="mt-0.5 line-clamp-2 block text-xs text-[#a3a7ae]">{ad.text}</span>}
        </span>
        {ad.ctaLabel && !ad.dismissible && (
          <span className="flex shrink-0 items-center text-sm font-semibold text-[#ff6a1f]">
            {ad.ctaLabel}
            <ChevronRight className="h-4 w-4" />
          </span>
        )}
        {ad.dismissible && (
          <span className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center text-[#8b8f96]">
            <X className="h-3.5 w-3.5" strokeWidth={2.5} />
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[22rem] rounded-[1.75rem] border-4 border-[#2a2d31] bg-[#131416] p-3">
      <div className="mb-3 space-y-2">
        <div className="h-3 w-24 rounded-full bg-[#2a2d31]" />
        <div className="h-10 rounded-xl bg-[#1d1f22]" />
      </div>
      {card}
      <div className="mt-3 space-y-2">
        <div className="h-10 rounded-xl bg-[#1d1f22]" />
        <div className="h-10 rounded-xl bg-[#1d1f22]" />
      </div>
    </div>
  );
}
