import { ArrowDownRight, ArrowUpRight, Minus, Plus, Scale } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { formatDelta, relativeDays, type SeriesPoint } from './measurement-utils';

/** Tiny dependency-free trend line: the last few weigh-ins as a filled path. */
function Sparkline({ points }: { points: SeriesPoint[] }) {
  if (points.length < 2) return null;

  const W = 160;
  const H = 48;
  const values = points.map(p => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const coords = points.map((p, i) => [(i / (points.length - 1)) * W, H - 6 - ((p.value - min) / span) * (H - 12)] as const);
  const line = coords.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const [lastX, lastY] = coords[coords.length - 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-12 w-full overflow-visible" preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="white" stopOpacity="0.35" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line} L${W},${H} L0,${H} Z`} fill="url(#spark-fill)" />
      <path d={line} fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      <circle cx={lastX} cy={lastY} r="3.5" fill="white" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function DeltaPill({ delta, label }: { delta: number; label: string }) {
  const Icon = delta > 0 ? ArrowUpRight : delta < 0 ? ArrowDownRight : Minus;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-xs font-semibold tabular-nums backdrop-blur-sm">
      <Icon className="h-3.5 w-3.5" />
      {formatDelta(delta, 'kg')}
      <span className="font-normal text-white/75">{label}</span>
    </span>
  );
}

interface MeasurementHeroProps {
  weights: SeriesPoint[];
  isLoading: boolean;
  onAdd: () => void;
}

/** Headline of the page: current weight, how it moved, and the one action that matters. */
export function MeasurementHero({ weights, isLoading, onAdd }: MeasurementHeroProps) {
  if (isLoading) return <Skeleton className="h-64 rounded-[2rem]" />;

  const latest = weights[weights.length - 1];
  const previous = weights[weights.length - 2];
  const first = weights[0];
  const days = latest ? Math.max(0, Math.round((Date.now() - latest.date.getTime()) / 86_400_000)) : 0;
  const overdue = !!latest && days >= 7;

  return (
    <section className="hero-ember texture-grain relative overflow-hidden rounded-[2rem] p-5 text-white shadow-glow md:p-7">
      <div aria-hidden className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full border-[1.5rem] border-white/10" />

      <div className="relative">
        <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-white/80">
          <Scale className="h-3.5 w-3.5" /> Aktualna waga
        </p>

        {latest ? (
          <>
            <p className="mt-2 font-display text-6xl font-extrabold leading-none tabular-nums md:text-7xl">
              {latest.value.toFixed(1)}
              <span className="ml-2 text-2xl font-bold text-white/75">kg</span>
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {previous && <DeltaPill delta={latest.value - previous.value} label="od poprzedniego" />}
              {first && first.id !== latest.id && previous?.id !== first.id && (
                <DeltaPill delta={latest.value - first.value} label="od startu" />
              )}
            </div>

            <div className="mt-4 -mb-1">
              <Sparkline points={weights.slice(-12)} />
            </div>
          </>
        ) : (
          <div className="mt-3 max-w-md">
            <p className="font-display text-2xl font-extrabold uppercase leading-tight">Zacznij mierzyć postępy</p>
            <p className="mt-2 text-sm text-white/85">
              Zapisz wagę, obwody i zdjęcia sylwetki. Po kilku pomiarach zobaczysz wykresy i porównanie przed/po.
            </p>
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <p className={cn('text-sm', overdue ? 'font-semibold text-white' : 'text-white/80')}>
            {latest
              ? overdue
                ? `Minęło ${days} dni — czas na nowy pomiar`
                : `Ostatni pomiar: ${relativeDays(days)}`
              : 'Pierwszy pomiar zajmie minutę'}
          </p>
          <Button onClick={onAdd} variant="secondary" className="h-11 rounded-full px-5 font-bold text-primary shadow-lg">
            <Plus className="mr-1.5 h-4 w-4" /> Dodaj pomiar
          </Button>
        </div>
      </div>
    </section>
  );
}
