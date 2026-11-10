import { Link } from 'react-router-dom';
import { Flame } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface WeekDay {
  label: string;
  day: number;
  isToday: boolean;
  done: boolean;
  planned: boolean;
}

/** The week as seven dates: filled once trained, ringed when planned. Opens the calendar. */
export function WeekStrip({ days, doneCount, target, streak }: { days: WeekDay[]; doneCount: number; target: number; streak?: number }) {
  return (
    <Link to="/athlete/calendar" className="block active:opacity-80" aria-label="Otwórz kalendarz">
      <div className="grid grid-cols-7">
        {days.map(day => (
          <div key={day.label} className="flex flex-col items-center gap-1.5">
            <span className={cn('text-xs font-medium', day.isToday ? 'text-foreground' : 'text-muted-foreground')}>{day.label}</span>
            <span
              className={cn(
                'grid h-10 w-10 place-items-center rounded-full font-display text-xl font-bold leading-none tabular-nums',
                day.done
                  ? 'bg-primary text-primary-foreground'
                  : day.isToday
                    ? 'bg-foreground text-background'
                    : day.planned
                      ? 'text-foreground ring-[1.5px] ring-inset ring-primary'
                      : 'text-muted-foreground'
              )}
            >
              {day.day}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-2.5 flex items-center justify-between px-1 text-[13px] text-muted-foreground">
        <span>
          W tym tygodniu <span className="font-semibold text-foreground tabular-nums">{doneCount}/{target}</span>
        </span>
        {streak ? (
          <span className="flex items-center gap-1">
            <Flame className="h-4 w-4 text-primary" />
            <span className="font-semibold text-foreground tabular-nums">{streak}</span> dni serii
          </span>
        ) : null}
      </p>
    </Link>
  );
}
