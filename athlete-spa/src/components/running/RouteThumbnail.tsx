import { memo, useMemo } from 'react';
import * as polyline from 'polyline-encoded';
import { Footprints } from 'lucide-react';
import { cn } from '@/lib/utils';

const SIZE = 64;
const PADDING = 8;
const MAX_POINTS = 120;

/** Route shape as an SVG path scaled into a SIZE×SIZE box, aspect ratio kept. */
function routePath(encoded: string): string | null {
  let points: [number, number][];
  try {
    points = polyline.decode(encoded);
  } catch {
    return null;
  }
  if (points.length < 2) return null;

  const step = Math.max(1, Math.ceil(points.length / MAX_POINTS));
  const sampled = points.filter((_, i) => i % step === 0 || i === points.length - 1);

  // Longitude degrees shrink towards the poles; scale x so the shape isn't stretched.
  const midLat = sampled.reduce((sum, [lat]) => sum + lat, 0) / sampled.length;
  const lngScale = Math.cos((midLat * Math.PI) / 180);
  const xy = sampled.map(([lat, lng]) => [lng * lngScale, -lat] as const);

  const xs = xy.map(([x]) => x);
  const ys = xy.map(([, y]) => y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const spanX = Math.max(...xs) - minX;
  const spanY = Math.max(...ys) - minY;
  const span = Math.max(spanX, spanY) || 1;
  const scale = (SIZE - PADDING * 2) / span;
  const offsetX = PADDING + (SIZE - PADDING * 2 - spanX * scale) / 2;
  const offsetY = PADDING + (SIZE - PADDING * 2 - spanY * scale) / 2;

  return xy
    .map(([x, y], i) => `${i ? 'L' : 'M'}${(offsetX + (x - minX) * scale).toFixed(1)} ${(offsetY + (y - minY) * scale).toFixed(1)}`)
    .join('');
}

/** Small route silhouette for history rows; falls back to an icon for runs without GPS. */
export const RouteThumbnail = memo(function RouteThumbnail({
  encoded,
  color,
  className,
}: {
  encoded?: string;
  color: string;
  className?: string;
}) {
  const path = useMemo(() => (encoded ? routePath(encoded) : null), [encoded]);

  return (
    <span
      className={cn('grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl', className)}
      style={{ backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)`, color }}
      aria-hidden
    >
      {path ? (
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-full w-full">
          <path d={path} fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <Footprints className="h-6 w-6" />
      )}
    </span>
  );
});
