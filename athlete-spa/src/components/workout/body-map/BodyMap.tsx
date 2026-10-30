import { useState } from 'react';
import { MuscleGroupName } from '@/lib/types';
import { cn } from '@/lib/utils';
import { BODY_PATHS, type BodyView } from './body-paths';
import { REGION_MUSCLE } from './muscle-map';

// Front and back share one coordinate space, side by side; each view is
// cropped to the extent of its figure plus a small margin.
const VIEW_BOX: Record<BodyView, string> = {
  front: '45 88 638 1260',
  back: '765 88 638 1260',
};

const VIEW_LABEL: Record<BodyView, string> = { front: 'Przód', back: 'Tył' };

const VIEWS: BodyView[] = ['front', 'back'];

interface BodyMapProps {
  onSelect: (muscle: MuscleGroupName) => void;
  className?: string;
}

function BodyFigure({
  view,
  onSelect,
  onHover,
}: {
  view: BodyView;
  onSelect: (muscle: MuscleGroupName) => void;
  onHover: (muscle: MuscleGroupName | null) => void;
}) {
  const regions = Object.entries(BODY_PATHS[view]);
  const muscles = REGION_MUSCLE[view];

  return (
    <svg viewBox={VIEW_BOX[view]} role="group" aria-label={`Sylwetka, widok: ${VIEW_LABEL[view].toLowerCase()}`} className="h-full w-full">
      {/* Silhouette first, so the muscles paint over it. */}
      {regions
        .filter(([slug]) => !muscles[slug])
        .map(([slug, paths]) =>
          paths.map((d, i) => <path key={`${slug}${i}`} d={d} className="fill-muted-foreground/25" />)
        )}

      {regions
        .filter(([slug]) => muscles[slug])
        .map(([slug, paths]) => {
          const muscle = muscles[slug];
          return (
            <g
              key={slug}
              role="button"
              tabIndex={0}
              aria-label={muscle}
              className="group/muscle cursor-pointer outline-none"
              onClick={() => onSelect(muscle)}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelect(muscle);
                }
              }}
              onPointerEnter={() => onHover(muscle)}
              onPointerLeave={() => onHover(null)}
              onFocus={() => onHover(muscle)}
              onBlur={() => onHover(null)}
            >
              <title>{muscle}</title>
              {paths.map((d, i) => (
                <path
                  key={i}
                  d={d}
                  className="fill-primary/40 stroke-background stroke-[3] transition-colors group-hover/muscle:fill-primary/70 group-focus-visible/muscle:fill-primary/70 group-active/muscle:fill-primary"
                />
              ))}
            </g>
          );
        })}
    </svg>
  );
}

/**
 * Front and back view of the body; tapping a muscle reports the muscle group
 * it stands for. Laid out after the muscle explorer of the openGym demo.
 */
export function BodyMap({ onSelect, className }: BodyMapProps) {
  const [hovered, setHovered] = useState<MuscleGroupName | null>(null);

  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      <div className="grid grid-cols-2 gap-4">
        {VIEWS.map(view => (
          <figure key={view} className="flex flex-col items-center gap-1.5">
            {/* The figure scales to fit this box, whichever of width or height is tighter. */}
            <div className="h-[min(44vh,26rem)] w-full">
              <BodyFigure view={view} onSelect={onSelect} onHover={setHovered} />
            </div>
            <figcaption className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              {VIEW_LABEL[view]}
            </figcaption>
          </figure>
        ))}
      </div>
      <p aria-live="polite" className="h-5 text-sm font-semibold">
        {hovered ?? <span className="font-normal text-muted-foreground">Dotknij partii ciała</span>}
      </p>
    </div>
  );
}
