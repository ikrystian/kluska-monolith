import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BodyMeasurement } from '@/lib/types';
import { CIRCUMFERENCES, formatDelta, lastDelta, seriesOf, type MetricKey } from './measurement-utils';

interface MetricTilesProps {
  measurements: BodyMeasurement[];
  selected: MetricKey;
  onSelect: (key: MetricKey) => void;
}

/** One tile per circumference that has ever been recorded; tapping a tile charts it. */
export function MetricTiles({ measurements, selected, onSelect }: MetricTilesProps) {
  const tiles = CIRCUMFERENCES.map(metric => {
    const series = seriesOf(measurements, metric.key);
    return { metric, latest: series[series.length - 1]?.value, delta: lastDelta(series) };
  }).filter(t => t.latest !== undefined);

  if (tiles.length === 0) return null;

  return (
    <section aria-label="Obwody">
      <h2 className="mb-2 px-1 text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Obwody</h2>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4">
        {tiles.map(({ metric, latest, delta }) => {
          const active = selected === metric.key;
          const Icon = delta === null || delta === 0 ? Minus : delta > 0 ? ArrowUpRight : ArrowDownRight;
          return (
            <button
              key={metric.key}
              type="button"
              onClick={() => onSelect(metric.key)}
              aria-pressed={active}
              className={cn(
                'rounded-[1.4rem] border bg-card p-4 text-left shadow-soft transition-all active:scale-[0.97]',
                active ? 'border-primary ring-2 ring-primary/30' : 'border-border/60 hover:border-border'
              )}
            >
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{metric.label}</p>
              <p className="mt-1 font-headline text-2xl font-bold tabular-nums leading-none">
                {latest!.toFixed(1)}
                <span className="ml-1 text-sm font-medium text-muted-foreground">{metric.unit}</span>
              </p>
              {delta !== null && (
                <p className="mt-2 inline-flex items-center gap-0.5 text-xs font-semibold tabular-nums text-muted-foreground">
                  <Icon className="h-3.5 w-3.5" />
                  {formatDelta(delta, metric.unit)}
                </p>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
