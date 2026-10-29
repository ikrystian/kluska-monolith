import { useMemo } from 'react';
import { addDays, format, isSameDay, isToday, startOfWeek, subWeeks } from 'date-fns';
import { pl } from 'date-fns/locale';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { formatHours, formatKm, type RunActivity } from './running-format';

/** This week's kilometres per day (Mon–Sun) against last week's total. */
export function WeeklySummary({ runs, isLoading }: { runs: RunActivity[]; isLoading: boolean }) {
  const week = useMemo(() => {
    const now = new Date();
    const start = startOfWeek(now, { weekStartsOn: 1 });
    const lastStart = subWeeks(start, 1);
    const days = Array.from({ length: 7 }, (_, i) => {
      const day = addDays(start, i);
      const km = runs.filter(r => isSameDay(r.date, day)).reduce((sum, r) => sum + r.distanceKm, 0);
      return { day, km };
    });
    const thisWeek = runs.filter(r => r.date >= start);
    const lastWeekKm = runs
      .filter(r => r.date >= lastStart && r.date < start)
      .reduce((sum, r) => sum + r.distanceKm, 0);
    return {
      days,
      km: thisWeek.reduce((sum, r) => sum + r.distanceKm, 0),
      minutes: thisWeek.reduce((sum, r) => sum + r.durationMin, 0),
      count: thisWeek.length,
      lastWeekKm,
      maxKm: Math.max(1, ...days.map(d => d.km)),
    };
  }, [runs]);

  const delta = week.km - week.lastWeekKm;

  return (
    <section className="rounded-[1.75rem] border border-border/60 bg-card p-5 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Ten tydzień</p>
          {isLoading ? (
            <Skeleton className="mt-2 h-10 w-32" />
          ) : (
            <p className="mt-1 font-display text-4xl font-extrabold leading-none tabular-nums">
              {formatKm(week.km, 1)}
              <span className="ml-1 font-headline text-base font-bold text-muted-foreground">km</span>
            </p>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            {week.count} {week.count === 1 ? 'bieg' : week.count >= 2 && week.count <= 4 ? 'biegi' : 'biegów'}
            {week.minutes > 0 && ` · ${formatHours(week.minutes)}`}
          </p>
        </div>
        {!isLoading && (week.km > 0 || week.lastWeekKm > 0) && (
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold tabular-nums',
              delta >= 0 ? 'bg-volt/15 text-volt' : 'bg-secondary text-muted-foreground'
            )}
            title="W porównaniu z poprzednim tygodniem"
          >
            {delta >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
            {delta >= 0 ? '+' : '−'}
            {formatKm(Math.abs(delta), 1)} km
          </span>
        )}
      </div>

      <div className="mt-5 grid h-28 grid-cols-7 items-end gap-2" role="img" aria-label="Kilometry w kolejnych dniach tygodnia">
        {week.days.map(({ day, km }) => {
          const today = isToday(day);
          return (
            <div key={day.toISOString()} className="flex h-full flex-col items-center justify-end gap-1.5">
              <span className={cn('text-[10px] font-semibold tabular-nums', km > 0 ? 'text-foreground' : 'text-transparent')}>
                {km > 0 ? formatKm(km, km >= 10 ? 0 : 1) : '0'}
              </span>
              <div className="relative w-full flex-1">
                <div
                  className={cn(
                    'absolute inset-x-0 bottom-0 rounded-full transition-[height] duration-500',
                    km > 0 ? 'hero-ember' : 'bg-secondary'
                  )}
                  style={{ height: km > 0 ? `${Math.max(12, (km / week.maxKm) * 100)}%` : '6px' }}
                />
              </div>
              <span
                className={cn(
                  'grid h-6 w-6 place-items-center rounded-full text-[11px] font-bold uppercase',
                  today ? 'bg-foreground text-background' : 'text-muted-foreground'
                )}
              >
                {format(day, 'EEEEE', { locale: pl })}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
