import { useState } from 'react';
import { MapPin } from 'lucide-react';
import { resolveMediaUrl } from '@/lib/api-client';
import { cn } from '@/lib/utils';

/**
 * Gym logo on a white tile (logos are usually drawn for a light background).
 * When the gym has no logo or the file fails to load, a pin stands in — or
 * nothing at all with `fallback="none"`, for places that sit on top of
 * something that already marks the gym (the map's dots).
 */
export function GymLogo({
  url,
  className,
  iconClassName,
  fallback = 'pin',
}: {
  url?: string;
  className?: string;
  iconClassName?: string;
  fallback?: 'pin' | 'none';
}) {
  const [failed, setFailed] = useState(false);
  const src = resolveMediaUrl(url);

  if ((!src || failed) && fallback === 'none') return null;

  return src && !failed ? (
    <span className={cn('grid shrink-0 place-items-center overflow-hidden bg-white', className)}>
      <img src={src} alt="" onError={() => setFailed(true)} className="h-full w-full object-contain p-[12%]" />
    </span>
  ) : (
    <span className={cn('grid shrink-0 place-items-center overflow-hidden bg-primary/10 text-primary', className)}>
      <MapPin className={iconClassName ?? 'h-4 w-4'} />
    </span>
  );
}
