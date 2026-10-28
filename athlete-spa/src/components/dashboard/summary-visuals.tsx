import { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  differenceInCalendarDays,
  differenceInCalendarMonths,
  endOfWeek,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
  addDays,
  addMonths,
  addWeeks,
  addYears,
} from 'date-fns';
import { pl } from 'date-fns/locale';
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts';
import { Globe2 } from 'lucide-react';
import { ChartContainer, type ChartConfig } from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/* ---------- Constants & colour identity ---------- */

/** Equatorial circumference of the Earth. */
export const EQUATOR_KM = 40_075;
/** Combat weight of a T-55 main battle tank. */
export const T55_TONS = 36;

/** Each activity keeps one colour everywhere in the summary. */
export const SUMMARY_COLORS = {
  running: 'hsl(var(--chart-2))',
  strength: 'hsl(var(--chart-1))',
  workouts: 'hsl(var(--chart-3))',
} as const;

/* ---------- Formatting ---------- */

export const fmtNumber = (value: number, maxFractionDigits = 0) =>
  value.toLocaleString('pl-PL', { maximumFractionDigits: maxFractionDigits, minimumFractionDigits: 0 });

/** Enough decimals that small-but-nonzero values don't collapse to 0. */
function fmtSmart(value: number): string {
  if (value === 0) return '0';
  if (value >= 10) return fmtNumber(value, 0);
  if (value >= 1) return fmtNumber(value, 1);
  if (value >= 0.1) return fmtNumber(value, 2);
  return fmtNumber(value, 3);
}

/**
 * Polish plural form. Fractions always take the genitive singular
 * ("2,5 czołgu"); integers follow the 1 / 2–4 / 5+ rule.
 */
export function pluralPl(n: number, forms: { one: string; few: string; many: string; fraction: string }): string {
  if (!Number.isInteger(n)) return forms.fraction;
  if (n === 1) return forms.one;
  const lastDigit = n % 10;
  const lastTwo = n % 100;
  if (lastDigit >= 2 && lastDigit <= 4 && (lastTwo < 12 || lastTwo > 14)) return forms.few;
  return forms.many;
}

/* ---------- Count-up animation ---------- */

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

/** Animates from the previously shown value to `target` with an ease-out curve. */
export function useCountUp(target: number, durationMs = 900): number {
  const [value, setValue] = useState(target);
  const fromRef = useRef(0);

  useEffect(() => {
    const from = fromRef.current;
    if (prefersReducedMotion() || from === target) {
      fromRef.current = target;
      setValue(target);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / durationMs);
      const eased = 1 - (1 - progress) ** 3;
      const current = from + (target - from) * eased;
      fromRef.current = current;
      setValue(current);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs]);

  return value;
}

export function CountUp({ value, digits = 0 }: { value: number; digits?: number }) {
  const shown = useCountUp(value);
  return <>{fmtNumber(shown, digits)}</>;
}

/* ---------- Equator ---------- */

function EquatorGlobe({ fraction }: { fraction: number }) {
  const progress = Math.min(1, fraction);
  return (
    <svg viewBox="0 0 120 120" className="h-28 w-28 shrink-0" aria-hidden>
      <circle cx="60" cy="60" r="50" className="fill-secondary stroke-border" strokeWidth="1.5" />
      {/* meridians & parallels */}
      <ellipse cx="60" cy="60" rx="22" ry="50" fill="none" className="stroke-border" strokeWidth="1" />
      <ellipse cx="60" cy="60" rx="40" ry="50" fill="none" className="stroke-border" strokeWidth="1" />
      <ellipse cx="60" cy="34" rx="43" ry="9" fill="none" className="stroke-border" strokeWidth="1" />
      <ellipse cx="60" cy="86" rx="43" ry="9" fill="none" className="stroke-border" strokeWidth="1" />
      {/* equator track + distance covered */}
      <ellipse cx="60" cy="60" rx="50" ry="14" fill="none" className="stroke-foreground/15" strokeWidth="4" />
      <ellipse
        cx="60"
        cy="60"
        rx="50"
        ry="14"
        fill="none"
        stroke={SUMMARY_COLORS.running}
        strokeWidth="4"
        strokeLinecap="round"
        pathLength={100}
        strokeDasharray={`${Math.max(progress * 100, progress > 0 ? 1.5 : 0)} 100`}
        transform="rotate(180 60 60)"
        className="transition-[stroke-dasharray] duration-1000 ease-out"
      />
    </svg>
  );
}

export function EquatorCard({ km, isLoading }: { km: number; isLoading: boolean }) {
  const fraction = km / EQUATOR_KM;
  const laps = Math.floor(fraction * 100) / 100;

  const headline =
    fraction >= 1
      ? `${fmtNumber(laps, 2)} ${pluralPl(laps, { one: 'okrążenie', few: 'okrążenia', many: 'okrążeń', fraction: 'okrążenia' })} równika`
      : `${fmtSmart(fraction * 100)}% długości równika`;

  return (
    <div className="flex items-center gap-4 rounded-[1.75rem] border border-border/60 bg-card p-4 shadow-soft">
      <EquatorGlobe fraction={fraction} />
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Dookoła świata</p>
        {isLoading ? (
          <Skeleton className="mt-2 h-7 w-40" />
        ) : (
          <p className="mt-1.5 font-headline text-xl font-bold leading-tight tracking-tight">{headline}</p>
        )}
        <p className="mt-1.5 flex items-center gap-1 text-[11px] text-muted-foreground">
          <Globe2 className="h-3 w-3" />
          {fraction >= 1
            ? `${fmtNumber(km, 0)} km przy ${fmtNumber(EQUATOR_KM)} km obwodu`
            : `zostało ${fmtNumber(Math.max(0, EQUATOR_KM - km), 0)} km do pełnego okrążenia`}
        </p>
      </div>
    </div>
  );
}

/* ---------- T-55 tanks ---------- */

/** Side silhouette of a T-55: tracks with road wheels, hull, dome turret, long gun. */
function TankShape({ className }: { className?: string }) {
  return (
    <g className={className}>
      <rect x="3" y="21" width="46" height="9" rx="4.5" />
      <path d="M2 21 L8 15 H47 L52 21 Z" />
      <path d="M17 15 C18 8.5 23 7 29 7 C35 7 38.5 9 39.5 15 Z" />
      <rect x="37" y="9.3" width="25" height="2.4" rx="1" />
    </g>
  );
}

function TankIcon({ fill }: { fill: number }) {
  const clipId = useId();
  return (
    <svg viewBox="0 0 64 32" className="h-6 w-12" aria-hidden>
      <defs>
        <clipPath id={clipId}>
          <rect x="0" y="0" width={64 * fill} height="32" />
        </clipPath>
      </defs>
      <TankShape className="fill-foreground/10" />
      <g clipPath={`url(#${clipId})`} style={{ fill: SUMMARY_COLORS.strength }}>
        <TankShape />
      </g>
      {/* road wheels */}
      {[10, 18, 26, 34, 42].map(cx => (
        <circle key={cx} cx={cx} cy="25.5" r="2.6" className="fill-card" />
      ))}
    </svg>
  );
}

const MAX_TANK_ICONS = 10;

export function TankCard({ tons, isLoading }: { tons: number; isLoading: boolean }) {
  const count = tons / T55_TONS;
  const shown = count >= 10 ? Math.round(count) : Math.round(count * 10) / 10;
  const isTiny = count > 0 && shown === 0;
  const full = Math.floor(count);
  const partial = count - full;
  const iconFills = [
    ...Array.from({ length: Math.min(full, MAX_TANK_ICONS) }, () => 1),
    ...(full < MAX_TANK_ICONS ? [partial] : []),
  ];
  const overflow = full - MAX_TANK_ICONS;

  return (
    <div className="rounded-[1.75rem] border border-border/60 bg-card p-4 shadow-soft">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Ciężka artyleria</p>
      {isLoading ? (
        <Skeleton className="mt-2 h-7 w-40" />
      ) : (
        <p className="mt-1.5 font-headline text-xl font-bold leading-tight tracking-tight">
          {isTiny ? '< 0,1' : fmtNumber(shown, 1)}{' '}
          {isTiny ? 'czołgu' : pluralPl(shown, { one: 'czołg', few: 'czołgi', many: 'czołgów', fraction: 'czołgu' })} T-55
        </p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-x-1 gap-y-1.5" role="img" aria-label={`${fmtNumber(count, 1)} czołgu T-55`}>
        {iconFills.map((f, i) => (
          <TankIcon key={i} fill={f} />
        ))}
        {overflow > 0 && (
          <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-bold tabular-nums">+{fmtNumber(overflow)}</span>
        )}
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">
        {fmtNumber(tons, 1)} t podniesione · 1 T-55 waży ok. {T55_TONS} t
      </p>
    </div>
  );
}

/* ---------- Time split ---------- */

export function TimeSplit({
  strengthMinutes,
  runMinutes,
  formatMinutes,
}: {
  strengthMinutes: number;
  runMinutes: number;
  formatMinutes: (min: number) => string;
}) {
  const total = strengthMinutes + runMinutes;
  if (total <= 0) return null;
  const parts = [
    { label: 'Siłownia', minutes: strengthMinutes, color: SUMMARY_COLORS.strength },
    { label: 'Bieganie', minutes: runMinutes, color: SUMMARY_COLORS.running },
  ].filter(p => p.minutes > 0);

  return (
    <div className="rounded-[1.75rem] border border-border/60 bg-card p-4 shadow-soft">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Czas aktywności</p>
        <p className="font-headline text-lg font-bold tabular-nums">{formatMinutes(total)}</p>
      </div>
      <div className="mt-3 flex h-3 gap-0.5 overflow-hidden rounded-full">
        {parts.map(p => (
          <div
            key={p.label}
            className="h-full first:rounded-l-full last:rounded-r-full"
            style={{ width: `${(p.minutes / total) * 100}%`, backgroundColor: p.color }}
          />
        ))}
      </div>
      <div className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1">
        {parts.map(p => (
          <p key={p.label} className="flex items-center gap-1.5 text-xs">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: p.color }} />
            <span className="font-semibold">{p.label}</span>
            <span className="tabular-nums text-muted-foreground">
              {formatMinutes(p.minutes)} · {Math.round((p.minutes / total) * 100)}%
            </span>
          </p>
        ))}
      </div>
    </div>
  );
}

/* ---------- Activity over time ---------- */

export interface ActivityEntry {
  date: Date;
  km: number;
  kg: number;
  /** 1 for every workout or run. */
  sessions: number;
}

type Granularity = 'day' | 'week' | 'month' | 'year';

const GRANULARITY = {
  day: {
    start: (d: Date) => startOfDay(d),
    next: (d: Date) => addDays(d, 1),
    tick: (d: Date) => format(d, 'd.MM'),
    full: (d: Date) => format(d, 'EEEE, d MMMM yyyy', { locale: pl }),
    noun: 'dzień',
  },
  week: {
    start: (d: Date) => startOfWeek(d, { weekStartsOn: 1 }),
    next: (d: Date) => addWeeks(d, 1),
    tick: (d: Date) => format(d, 'd MMM', { locale: pl }),
    full: (d: Date) =>
      `${format(d, 'd MMM', { locale: pl })} – ${format(endOfWeek(d, { weekStartsOn: 1 }), 'd MMM yyyy', { locale: pl })}`,
    noun: 'tydzień',
  },
  month: {
    start: (d: Date) => startOfMonth(d),
    next: (d: Date) => addMonths(d, 1),
    // January carries the year so multi-year ranges stay unambiguous
    tick: (d: Date) => format(d, d.getMonth() === 0 ? 'LLL yy' : 'LLL', { locale: pl }),
    full: (d: Date) => format(d, 'LLLL yyyy', { locale: pl }),
    noun: 'miesiąc',
  },
  year: {
    start: (d: Date) => startOfYear(d),
    next: (d: Date) => addYears(d, 1),
    tick: (d: Date) => format(d, 'yyyy'),
    full: (d: Date) => format(d, 'yyyy'),
    noun: 'rok',
  },
} satisfies Record<Granularity, unknown>;

function pickGranularity(from: Date, to: Date): Granularity {
  if (differenceInCalendarDays(to, from) <= 31) return 'day';
  if (differenceInCalendarDays(to, from) <= 182) return 'week';
  if (differenceInCalendarMonths(to, from) <= 36) return 'month';
  return 'year';
}

const METRICS = {
  km: { label: 'Kilometry', unit: 'km', color: SUMMARY_COLORS.running, digits: 1 },
  tons: { label: 'Tony', unit: 't', color: SUMMARY_COLORS.strength, digits: 1 },
  sessions: { label: 'Treningi', unit: '', color: SUMMARY_COLORS.workouts, digits: 0 },
} as const;

type MetricId = keyof typeof METRICS;

interface Bucket {
  key: number;
  tick: string;
  full: string;
  km: number;
  tons: number;
  sessions: number;
}

function TrendTooltip({ active, payload, metric }: { active?: boolean; payload?: { payload: Bucket }[]; metric: MetricId }) {
  const bucket = payload?.[0]?.payload;
  if (!active || !bucket) return null;
  const m = METRICS[metric];
  return (
    <div className="rounded-xl border border-border/60 bg-background px-3 py-2 text-xs shadow-lifted">
      <p className="font-semibold capitalize">{bucket.full}</p>
      <p className="mt-1 flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: m.color }} />
        <span className="tabular-nums">
          {fmtNumber(bucket[metric], m.digits)} {m.unit || pluralPl(bucket.sessions, { one: 'trening', few: 'treningi', many: 'treningów', fraction: 'treningu' })}
        </span>
      </p>
    </div>
  );
}

export function ActivityTrend({
  entries,
  from,
  to,
  isLoading,
}: {
  entries: ActivityEntry[];
  /** `null` = since the first recorded activity. */
  from: Date | null;
  to: Date;
  isLoading: boolean;
}) {
  const [metric, setMetric] = useState<MetricId>('km');

  const { buckets, granularity } = useMemo(() => {
    const start = from ?? entries.reduce<Date | null>((min, e) => (!min || e.date < min ? e.date : min), null) ?? to;
    const granularity = pickGranularity(start, to);
    const g = GRANULARITY[granularity];

    const buckets: Bucket[] = [];
    const index = new Map<number, Bucket>();
    for (let d = g.start(start); d <= to; d = g.next(d)) {
      const bucket = { key: d.getTime(), tick: g.tick(d), full: g.full(d), km: 0, tons: 0, sessions: 0 };
      buckets.push(bucket);
      index.set(bucket.key, bucket);
    }
    for (const e of entries) {
      const bucket = index.get(g.start(e.date).getTime());
      if (!bucket) continue;
      bucket.km += e.km;
      bucket.tons += e.kg / 1000;
      bucket.sessions += e.sessions;
    }
    return { buckets, granularity };
  }, [entries, from, to]);

  const m = METRICS[metric];
  const config = { [metric]: { label: m.label, color: m.color } } satisfies ChartConfig;
  const hasData = buckets.some(b => b[metric] > 0);

  return (
    <div className="rounded-[1.75rem] border border-border/60 bg-card p-4 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Aktywność w czasie</p>
          <p className="text-xs text-muted-foreground">{m.label} na {GRANULARITY[granularity].noun}</p>
        </div>
        <div className="flex rounded-full bg-muted p-1" role="tablist" aria-label="Miara na wykresie">
          {(Object.keys(METRICS) as MetricId[]).map(id => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={metric === id}
              onClick={() => setMetric(id)}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-semibold text-muted-foreground transition-all active:scale-[0.96]',
                metric === id && 'bg-background text-foreground shadow-soft'
              )}
            >
              {METRICS[id].label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="mt-4 h-48 w-full rounded-2xl" />
      ) : !hasData ? (
        <div className="mt-4 grid h-48 place-items-center rounded-2xl border border-dashed border-border text-sm text-muted-foreground">
          Brak danych w tym okresie
        </div>
      ) : (
        <ChartContainer config={config} className="mt-4 aspect-auto h-48 w-full">
          <BarChart data={buckets} margin={{ top: 4, right: 4, left: -16, bottom: 0 }} barCategoryGap={2}>
            <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.6} />
            <XAxis dataKey="tick" tickLine={false} axisLine={false} tickMargin={8} minTickGap={16} />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={4}
              width={44}
              allowDecimals={metric !== 'sessions'}
              tickFormatter={v => fmtNumber(Number(v), 1)}
            />
            <Tooltip cursor={{ fill: 'hsl(var(--muted))', opacity: 0.6 }} content={<TrendTooltip metric={metric} />} />
            <Bar dataKey={metric} fill={m.color} radius={[4, 4, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ChartContainer>
      )}
    </div>
  );
}
