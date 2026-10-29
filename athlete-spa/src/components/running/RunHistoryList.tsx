import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { ChevronRight, Heart, Mountain, ThumbsUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { RouteThumbnail } from './RouteThumbnail';
import { formatClock, formatKm, formatPace, runTitle, type RunActivity } from './running-format';

const PAGE_SIZE = 20;
export const STRAVA_COLOR = '#FC4C02';
const APP_COLOR = 'hsl(var(--primary))';

function RunRow({ run }: { run: RunActivity }) {
  const color = run.source === 'strava' ? STRAVA_COLOR : APP_COLOR;
  const content = (
    <>
      <RouteThumbnail encoded={run.polyline} color={color} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-sm font-semibold">{runTitle(run)}</p>
          {run.source === 'strava' && (
            <span
              className="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider"
              style={{ backgroundColor: `${STRAVA_COLOR}1a`, color: STRAVA_COLOR }}
            >
              Strava
            </span>
          )}
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {format(run.date, "EEEE, d MMM · HH:mm", { locale: pl })}
          {run.notes && !run.title ? ` · ${run.notes}` : ''}
        </p>
        <div className="mt-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-xs tabular-nums text-muted-foreground">
          <span className="font-headline text-base font-bold text-foreground">
            {formatKm(run.distanceKm)}
            <span className="ml-0.5 text-xs font-semibold text-muted-foreground">km</span>
          </span>
          <span>{formatClock(run.durationMin)}</span>
          <span>{formatPace(run.avgPace)}</span>
          {run.elevationGain !== undefined && run.elevationGain > 0 && (
            <span className="flex items-center gap-0.5">
              <Mountain className="h-3 w-3" />
              {Math.round(run.elevationGain)} m
            </span>
          )}
          {run.averageHeartrate !== undefined && (
            <span className="flex items-center gap-0.5">
              <Heart className="h-3 w-3 text-destructive" />
              {Math.round(run.averageHeartrate)}
            </span>
          )}
          {!!run.kudosCount && (
            <span className="flex items-center gap-0.5">
              <ThumbsUp className="h-3 w-3" />
              {run.kudosCount}
            </span>
          )}
        </div>
      </div>
      {run.href && <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/70" />}
    </>
  );

  const className = 'flex items-center gap-3 px-4 py-3.5';
  return run.href ? (
    <Link to={run.href} className={cn(className, 'transition-colors hover:bg-secondary/50 active:bg-secondary')}>
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  );
}

/** Runs grouped by month, each group a rounded card with its monthly total. */
export function RunHistoryList({ runs }: { runs: RunActivity[] }) {
  const [limit, setLimit] = useState(PAGE_SIZE);
  const visible = runs.slice(0, limit);

  const groups = useMemo(() => {
    const byMonth = new Map<string, { label: string; runs: RunActivity[] }>();
    for (const run of visible) {
      const key = format(run.date, 'yyyy-MM');
      if (!byMonth.has(key)) byMonth.set(key, { label: format(run.date, 'LLLL yyyy', { locale: pl }), runs: [] });
      byMonth.get(key)!.runs.push(run);
    }
    return [...byMonth.values()];
  }, [visible]);

  // Month totals come from all runs, so a group cut off by paging still shows the full month.
  const monthTotals = useMemo(() => {
    const totals = new Map<string, number>();
    for (const run of runs) {
      const key = format(run.date, 'LLLL yyyy', { locale: pl });
      totals.set(key, (totals.get(key) ?? 0) + run.distanceKm);
    }
    return totals;
  }, [runs]);

  return (
    <div className="space-y-5">
      {groups.map(group => (
        <section key={group.label}>
          <div className="mb-2 flex items-baseline justify-between px-4">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{group.label}</h3>
            <span className="text-xs font-semibold tabular-nums text-muted-foreground">
              {formatKm(monthTotals.get(group.label) ?? 0, 1)} km
            </span>
          </div>
          <div className="divide-y divide-border/60 overflow-hidden rounded-[1.5rem] border border-border/60 bg-card shadow-soft">
            {group.runs.map(run => (
              <RunRow key={`${run.source}-${run.id}`} run={run} />
            ))}
          </div>
        </section>
      ))}
      {runs.length > limit && (
        <Button variant="outline" className="w-full rounded-full" onClick={() => setLimit(l => l + PAGE_SIZE)}>
          Pokaż starsze ({runs.length - limit})
        </Button>
      )}
    </div>
  );
}
