import { useMemo } from 'react';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { formatKm } from '@/components/running/running-format';
import { pluralForm } from '@/lib/plural';
import { lastFourWeeks, rollingWindows, totalsOf, type CalendarDay, type HistoryItem } from './history-model';

const WEEKDAYS = ['P', 'W', 'Ś', 'C', 'P', 'S', 'N'];

/** Lime for a gym day, blue for a run; a day with both is lime with a blue corner dot. */
function dayClasses(day: CalendarDay): string {
  if (day.workout) return 'bg-lime text-lime-foreground';
  if (day.run) return 'bg-run text-white dark:text-lime-foreground';
  return 'bg-secondary/60 text-muted-foreground/60';
}

function Stat({ value, unit, label }: { value: string; unit?: string; label: string }) {
  return (
    <div className="min-w-0">
      <p className="font-display text-[1.75rem] font-bold leading-none tabular-nums">
        {value}
        {unit && <span className="ml-0.5 font-body text-xs font-semibold text-muted-foreground">{unit}</span>}
      </p>
      <p className="mt-1 truncate text-xs font-semibold text-muted-foreground">{label}</p>
    </div>
  );
}

/** The last 30 days at a glance, plus a four-week grid of which days had a session. */
export function HistorySummary({ items, isLoading }: { items: HistoryItem[]; isLoading: boolean }) {
  const { totals, delta, days } = useMemo(() => {
    const today = new Date();
    const { current, previousCount } = rollingWindows(items, today);
    return {
      totals: totalsOf(current),
      delta: current.length - previousCount,
      days: lastFourWeeks(items, today),
    };
  }, [items]);

  if (isLoading) {
    return (
      <div className="rounded-2xl bg-card p-4">
        <Skeleton className="h-4 w-28" />
        <div className="mt-3 grid grid-cols-3 gap-3">
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
        </div>
        <Skeleton className="mt-4 h-24" />
      </div>
    );
  }

  const sessions = totals.workouts + totals.runs;

  return (
    <section className="rounded-2xl bg-card p-4" aria-label="Ostatnie 30 dni">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xs font-semibold text-muted-foreground">Ostatnie 30 dni</h2>
        {delta !== 0 && (
          <span
            className={cn(
              'inline-flex items-center gap-1 text-xs font-semibold tabular-nums',
              delta > 0 ? 'text-volt' : 'text-muted-foreground'
            )}
          >
            {delta > 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
            {delta > 0 ? '+' : '−'}
            {Math.abs(delta)} vs poprzednie
          </span>
        )}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-3">
        <Stat
          value={String(sessions)}
          label={pluralForm(sessions, 'sesja', 'sesje', 'sesji')}
        />
        <Stat value={Math.round(totals.volume).toLocaleString('pl-PL')} unit="kg" label="objętość" />
        <Stat value={formatKm(totals.km, 1)} unit="km" label="biegi" />
      </div>

      <div className="mt-4 border-t border-border/60 pt-3">
        <div className="grid grid-cols-7 gap-1.5" role="img" aria-label="Dni z aktywnością w ostatnich czterech tygodniach">
          {WEEKDAYS.map((label, i) => (
            <span key={i} className="text-center text-[10px] font-semibold text-muted-foreground/70">
              {label}
            </span>
          ))}
          {days.map(day => {
            return (
              <span
                key={day.key}
                className={cn(
                  'relative grid h-[30px] place-items-center rounded-lg text-[10px] font-bold tabular-nums',
                  dayClasses(day),
                  day.isFuture && 'opacity-0',
                  day.isToday && 'ring-2 ring-foreground/70 ring-offset-2 ring-offset-card'
                )}
              >
                {day.date.getDate()}
                {day.workout && day.run && (
                  <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-run ring-1 ring-lime" />
                )}
              </span>
            );
          })}
        </div>

        <div className="mt-3 flex items-center gap-4 text-xs font-medium text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-lime" />
            Siłownia
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-run" />
            Bieg
          </span>
        </div>
      </div>
    </section>
  );
}
