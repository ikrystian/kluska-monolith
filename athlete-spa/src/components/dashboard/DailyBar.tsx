import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface BarPlate {
  id: string;
  /** Plate weight in kg; picks its colour and how much it adds to the bar. */
  kg: 25 | 20 | 15 | 10;
  label: string;
  hint: string;
  loaded: boolean;
  href: string;
}

const BAR_KG = 20;

/** Olympic plate colours, by weight. */
const PLATE_STYLE: Record<BarPlate['kg'], { color: string; dot: string; height: number }> = {
  25: { color: 'hsl(var(--primary))', dot: 'bg-primary', height: 74 },
  20: { color: 'hsl(var(--run))', dot: 'bg-run', height: 74 },
  15: { color: 'hsl(var(--food))', dot: 'bg-food', height: 60 },
  10: { color: 'hsl(var(--volt))', dot: 'bg-volt', height: 48 },
};

const WIDTH = 343;
const HEIGHT = 82;
const MID = HEIGHT / 2;
/** Where the sleeve starts, measured from the bar's end. */
const SLEEVE = 96;
const PLATE_W = 15;
const GAP = 1.5;

function Sleeve({ plates }: { plates: BarPlate[] }) {
  const reduceMotion = useReducedMotion();
  // Heaviest plate sits against the collar and lighter ones stack outwards,
  // like on a real bar; plates still to earn wait as outlines behind them.
  const ordered = [...plates].sort((a, b) => Number(b.loaded) - Number(a.loaded) || b.kg - a.kg);

  return (
    <>
      {ordered.map((plate, index) => {
        const { color, height } = PLATE_STYLE[plate.kg];
        const x = SLEEVE - 5 - (index + 1) * (PLATE_W + GAP);
        return (
          <motion.rect
            key={plate.id}
            initial={false}
            animate={{ x, opacity: plate.loaded ? 1 : 0.35 }}
            transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 260, damping: 24 }}
            y={MID - height / 2}
            width={PLATE_W}
            height={height}
            rx={3}
            fill={plate.loaded ? color : 'transparent'}
            stroke={plate.loaded ? 'none' : 'hsl(var(--muted-foreground))'}
            strokeWidth={1}
            strokeDasharray={plate.loaded ? undefined : '3 3'}
          />
        );
      })}
    </>
  );
}

/**
 * "Sztanga dnia": every daily target is a plate. Finish it and it slides onto
 * the bar, so the day's progress reads at a glance and in a lifter's own units.
 */
export function DailyBar({ plates }: { plates: BarPlate[] }) {
  const loadedKg = plates.filter(plate => plate.loaded).reduce((sum, plate) => sum + plate.kg, 0);
  const total = BAR_KG + loadedKg * 2;
  const max = BAR_KG + plates.reduce((sum, plate) => sum + plate.kg, 0) * 2;
  const isFull = total === max;

  return (
    <section className="rounded-2xl bg-card pb-1 pt-3.5">
      <div className="flex items-baseline justify-between px-4">
        <h2 className="text-[15px] font-semibold">Sztanga dnia</h2>
        <p className={cn('text-sm font-medium', isFull ? 'font-semibold text-volt' : 'text-muted-foreground')}>
          {isFull ? 'Lightweight, baby!' : `do pełna ${max - total} kg`}
        </p>
      </div>

      <div className="px-4">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="mt-2 block h-auto w-full"
          role="img"
          aria-label={`Na sztandze ${total} z ${max} kilogramów`}
        >
          {/* Shaft */}
          <rect x={0} y={MID - 1.5} width={WIDTH} height={3} fill="hsl(var(--muted-foreground))" opacity={0.55} />
          {/* Sleeves */}
          <rect x={0} y={MID - 3.5} width={SLEEVE - 5} height={7} rx={2} fill="hsl(var(--muted-foreground))" opacity={0.8} />
          <rect x={WIDTH - SLEEVE + 5} y={MID - 3.5} width={SLEEVE - 5} height={7} rx={2} fill="hsl(var(--muted-foreground))" opacity={0.8} />
          {/* Collars */}
          <rect x={SLEEVE - 5} y={MID - 8} width={5} height={16} rx={1.5} fill="hsl(var(--muted-foreground))" />
          <rect x={WIDTH - SLEEVE} y={MID - 8} width={5} height={16} rx={1.5} fill="hsl(var(--muted-foreground))" />

          <g>
            <Sleeve plates={plates} />
          </g>
          <g transform={`translate(${WIDTH} 0) scale(-1 1)`}>
            <Sleeve plates={plates} />
          </g>

          {/* Readout, sitting on the shaft like a tag on the bar */}
          <rect x={WIDTH / 2 - 52} y={MID - 24} width={104} height={48} fill="hsl(var(--card))" />
          <text x={WIDTH / 2} y={MID + 15} textAnchor="middle" className="fill-foreground font-display text-[44px] font-bold tabular-nums">
            {total}
            <tspan dx={3} className="fill-muted-foreground font-body text-[15px] font-semibold">kg</tspan>
          </text>
        </svg>
      </div>

      <ul className="mt-1 grid grid-cols-4 gap-px px-2">
        {plates.map(plate => (
          <li key={plate.id} className="min-w-0">
            <Link to={plate.href} className="row-tap block rounded-xl px-2 py-2">
              <span className={cn('block h-1 rounded-full', plate.loaded ? PLATE_STYLE[plate.kg].dot : 'bg-secondary')} />
              <span className="mt-1.5 block truncate text-[13px] font-semibold leading-tight">{plate.label}</span>
              <span className="block truncate text-xs tabular-nums text-muted-foreground">{plate.hint}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
