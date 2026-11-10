import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Dumbbell, Footprints, MapPin, Trash2, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatClock, formatKm, formatPace, runTitle } from '@/components/running/running-format';
import { STRAVA_COLOR } from '@/components/running/RunHistoryList';
import { pluralForm, setsLabel } from '@/lib/plural';
import type { HistoryItem } from './history-model';

function formatMinutes(minutes?: number): string | null {
  if (!minutes || minutes <= 0) return null;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m} min`;
  return m > 0 ? `${h} h ${m} min` : `${h} h`;
}

/** Three letters at most, so the column keeps one width ("niedz." would not). */
const WEEKDAY_SHORT = ['ndz', 'pon', 'wt', 'śr', 'czw', 'pt', 'sob'];

function DateBlock({ date }: { date: Date }) {
  return (
    <div className="w-9 shrink-0 text-center">
      <p className="font-display text-[1.65rem] font-bold leading-none tabular-nums">{format(date, 'd')}</p>
      <p className="mt-1 text-[11px] font-semibold uppercase leading-none text-muted-foreground">
        {WEEKDAY_SHORT[date.getDay()]}
      </p>
    </div>
  );
}

function Metric({ value, unit }: { value: string; unit: string }) {
  return (
    <div className="shrink-0 text-right">
      <p className="font-display text-xl font-bold leading-none tabular-nums">{value}</p>
      <p className="mt-1 text-xs font-semibold text-muted-foreground">{unit}</p>
    </div>
  );
}

interface HistoryRowProps {
  item: HistoryItem;
  /** Edit mode: workouts show a delete button instead of opening. */
  editing: boolean;
  deleting: boolean;
  onDelete: (item: Extract<HistoryItem, { kind: 'workout' }>) => void;
}

export function HistoryRow({ item, editing, deleting, onDelete }: HistoryRowProps) {
  const layout = 'flex items-center gap-3 px-4 py-3.5';

  if (item.kind === 'run') {
    const { run } = item;
    const title = runTitle(run);
    const time = formatClock(run.durationMin);
    const content = (
      <>
        <DateBlock date={item.date} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <Footprints className="h-3.5 w-3.5 shrink-0 text-run" aria-hidden />
            <p className="truncate text-[15px] font-semibold">{title}</p>
            {run.source === 'strava' && (
              <span
                className="shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                style={{ backgroundColor: `${STRAVA_COLOR}1a`, color: STRAVA_COLOR }}
              >
                Strava
              </span>
            )}
          </div>
          <p className="mt-1 truncate text-xs tabular-nums text-muted-foreground">
            {time} · {formatPace(run.avgPace)}
          </p>
        </div>
        <Metric value={formatKm(run.distanceKm)} unit="km" />
        {/* Keeps the metric column aligned with the workout rows' delete buttons. */}
        {editing && <span className="-mr-1 h-10 w-10 shrink-0" aria-hidden />}
      </>
    );

    return run.href ? (
      <Link to={run.href} state={{ title }} className={cn(layout, 'row-tap')}>
        {content}
      </Link>
    ) : (
      <div className={layout}>{content}</div>
    );
  }

  const { log, stats } = item;
  const duration = formatMinutes(stats.durationMin);
  const hasVolume = stats.volume > 0;
  const details = [stats.sets > 0 ? setsLabel(stats.sets) : null, duration].filter(Boolean).join(' · ');

  const content = (
    <>
      <DateBlock date={item.date} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <Dumbbell className="h-3.5 w-3.5 shrink-0 text-volt" aria-hidden />
          <p className="truncate text-[15px] font-semibold">{log.workoutName}</p>
          {stats.records > 0 && (
            <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-lime/15 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-volt">
              <Trophy className="h-2.5 w-2.5" aria-hidden />
              {stats.records}
            </span>
          )}
        </div>
        {details && <p className="mt-1 truncate text-xs tabular-nums text-muted-foreground">{details}</p>}
        {log.gymName && !editing && (
          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3 shrink-0" aria-hidden />
            <span className="truncate">{log.gymName}</span>
          </p>
        )}
      </div>
      {hasVolume ? (
        <Metric value={Math.round(stats.volume).toLocaleString('pl-PL')} unit="kg" />
      ) : (
        <Metric value={String(stats.sets)} unit={pluralForm(stats.sets, 'seria', 'serie', 'serii')} />
      )}
    </>
  );

  if (editing) {
    return (
      <div className={layout}>
        {content}
        <button
          type="button"
          onClick={() => onDelete(item)}
          disabled={deleting}
          aria-label={`Usuń trening ${log.workoutName}`}
          className="-mr-1 grid h-10 w-10 shrink-0 place-items-center rounded-full bg-destructive/12 text-destructive transition-colors active:bg-destructive/25 disabled:opacity-50"
        >
          <Trash2 className="h-[18px] w-[18px]" />
        </button>
      </div>
    );
  }

  return (
    <Link to={`/athlete/history/${log.id}`} state={{ title: log.workoutName }} className={cn(layout, 'row-tap')}>
      {content}
    </Link>
  );
}
