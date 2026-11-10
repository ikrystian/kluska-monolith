import { useMemo, useState } from 'react';
import {
  addDays,
  addMonths,
  addYears,
  format,
  getDaysInMonth,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subMonths,
  subWeeks,
  subYears,
} from 'date-fns';
import { pl } from 'date-fns/locale';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { formatHours, formatKm, type RunActivity } from './running-format';

type Period = 'week' | 'month' | 'year';

const PERIOD_OPTIONS: { id: Period; label: string }[] = [
  { id: 'week', label: 'Tydzień' },
  { id: 'month', label: 'Miesiąc' },
  { id: 'year', label: 'Rok' },
];

const PERIOD_TEXT: Record<Period, { title: string; previous: string }> = {
  week: { title: 'Ten tydzień', previous: 'poprzedni tydzień' },
  month: { title: 'Ten miesiąc', previous: 'poprzedni miesiąc' },
  year: { title: 'Ten rok', previous: 'poprzedni rok' },
};

interface Bucket {
  start: Date;
  end: Date;
  label: string;
  current: boolean;
}

/** Range of the selected period, the one before it, and the bars that split it up. */
function buildPeriod(period: Period, now: Date): { from: Date; to: Date; prevFrom: Date; buckets: Bucket[] } {
  if (period === 'week') {
    const from = startOfWeek(now, { weekStartsOn: 1 });
    const buckets = Array.from({ length: 7 }, (_, i) => {
      const start = addDays(from, i);
      return { start, end: addDays(start, 1), label: format(start, 'EEEEE', { locale: pl }), current: isToday(start) };
    });
    return { from, to: addDays(from, 7), prevFrom: subWeeks(from, 1), buckets };
  }
  if (period === 'month') {
    const from = startOfMonth(now);
    const to = addMonths(from, 1);
    const count = Math.ceil(getDaysInMonth(now) / 7);
    const buckets = Array.from({ length: count }, (_, i) => {
      const start = addDays(from, i * 7);
      const end = i === count - 1 ? to : addDays(start, 7);
      return { start, end, label: format(start, 'd'), current: now >= start && now < end };
    });
    return { from, to, prevFrom: subMonths(from, 1), buckets };
  }
  const from = startOfYear(now);
  const buckets = Array.from({ length: 12 }, (_, i) => {
    const start = addMonths(from, i);
    return { start, end: addMonths(start, 1), label: format(start, 'LLL', { locale: pl }), current: isSameMonth(start, now) };
  });
  return { from, to: addYears(from, 1), prevFrom: subYears(from, 1), buckets };
}

/** Kilometres for the selected period (split into bars) against the previous period's total. */
export function WeeklySummary({ runs, isLoading }: { runs: RunActivity[]; isLoading: boolean }) {
  const [period, setPeriod] = useState<Period>('week');

  const summary = useMemo(() => {
    const now = new Date();
    const { from, to, prevFrom, buckets } = buildPeriod(period, now);
    const inRange = (r: RunActivity, start: Date, end: Date) => r.date >= start && r.date < end;
    const bars = buckets.map(b => ({
      ...b,
      km: runs.filter(r => inRange(r, b.start, b.end)).reduce((sum, r) => sum + r.distanceKm, 0),
    }));
    const current = runs.filter(r => inRange(r, from, to));
    const prevKm = runs.filter(r => inRange(r, prevFrom, from)).reduce((sum, r) => sum + r.distanceKm, 0);
    return {
      bars,
      km: current.reduce((sum, r) => sum + r.distanceKm, 0),
      minutes: current.reduce((sum, r) => sum + r.durationMin, 0),
      count: current.length,
      prevKm,
      maxKm: Math.max(1, ...bars.map(b => b.km)),
    };
  }, [runs, period]);

  const delta = summary.km - summary.prevKm;
  const text = PERIOD_TEXT[period];
  const isWeek = period === 'week';

  return (
    <section className="rounded-2xl bg-card p-5">
      <div role="group" aria-label="Zakres podsumowania" className="inline-flex rounded-full bg-secondary p-1">
        {PERIOD_OPTIONS.map(option => (
          <button
            key={option.id}
            type="button"
            aria-pressed={period === option.id}
            onClick={() => setPeriod(option.id)}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-semibold transition-colors',
              period === option.id ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="mt-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-muted-foreground">{text.title}</p>
          {isLoading ? (
            <Skeleton className="mt-2 h-10 w-32" />
          ) : (
            <p className="mt-1 font-display text-6xl font-bold leading-none tabular-nums">
              {formatKm(summary.km, 1)}
              <span className="ml-1 font-body text-base font-semibold text-muted-foreground">km</span>
            </p>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            {summary.count} {summary.count === 1 ? 'bieg' : summary.count >= 2 && summary.count <= 4 ? 'biegi' : 'biegów'}
            {summary.minutes > 0 && ` · ${formatHours(summary.minutes)}`}
          </p>
        </div>
        {!isLoading && (summary.km > 0 || summary.prevKm > 0) && (
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold tabular-nums',
              delta >= 0 ? 'bg-volt/15 text-volt' : 'bg-secondary text-muted-foreground'
            )}
            title={`W porównaniu z: ${text.previous}`}
          >
            {delta >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
            {delta >= 0 ? '+' : '−'}
            {formatKm(Math.abs(delta), 1)} km
          </span>
        )}
      </div>

      <div
        className={cn('mt-5 grid h-28 items-end', isWeek ? 'gap-2' : 'gap-1')}
        style={{ gridTemplateColumns: `repeat(${summary.bars.length}, minmax(0, 1fr))` }}
        role="img"
        aria-label={`Kilometry: ${text.title.toLowerCase()}`}
      >
        {summary.bars.map(bar => (
          <div key={bar.start.toISOString()} className="flex h-full min-w-0 flex-col items-center justify-end gap-1.5">
            <span
              className={cn(
                'text-[11px] font-semibold tabular-nums',
                bar.km > 0 ? 'text-foreground' : 'text-transparent'
              )}
            >
              {bar.km > 0 ? formatKm(bar.km, bar.km >= 10 ? 0 : 1) : '0'}
            </span>
            <div className="relative w-full flex-1">
              <div
                className={cn(
                  'absolute inset-x-0 bottom-0 rounded-lg transition-[height] duration-500',
                  bar.km > 0 ? 'bg-volt' : 'bg-secondary'
                )}
                style={{ height: bar.km > 0 ? `${Math.max(12, (bar.km / summary.maxKm) * 100)}%` : '6px' }}
              />
            </div>
            <span
              className={cn(
                'grid h-6 min-w-[1.5rem] place-items-center rounded-full px-0.5 text-xs font-semibold',
                bar.current ? 'bg-foreground text-background' : 'text-muted-foreground'
              )}
            >
              {bar.label}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
