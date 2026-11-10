import { Check } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { Quest } from '@/hooks/useRewards';
import { formatNumber } from './reward-meta';

function questValue(quest: Quest, value: number) {
  return quest.unit === 'kg' ? `${formatNumber(value / 1000, 1)} t` : formatNumber(value, 0);
}

/** Trzy zadania na bieżący tydzień; nagroda wpada sama po spełnieniu. */
export function WeeklyQuests({ quests }: { quests: Quest[] }) {
  if (quests.length === 0) return null;

  return (
    <ul className="divide-y divide-border/60 rounded-2xl bg-card">
      {quests.map(quest => (
        <li key={quest.id} className="flex items-center gap-3 p-3.5">
          <span
            className={cn(
              'grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-bold tabular-nums',
              quest.completed ? 'bg-volt text-volt-foreground' : 'bg-secondary text-muted-foreground'
            )}
          >
            {quest.completed ? <Check className="h-[18px] w-[18px]" strokeWidth={3.5} /> : `${Math.round((quest.progress / quest.target) * 100)}%`}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <p className={cn('truncate text-sm font-semibold', quest.completed && 'text-muted-foreground')}>{quest.title}</p>
              <p className="shrink-0 text-xs font-semibold tabular-nums text-volt">+{quest.xp} XP</p>
            </div>
            <Progress value={(quest.progress / quest.target) * 100} className="mt-2 h-1.5" />
            <p className="mt-1 text-xs tabular-nums text-muted-foreground">
              {questValue(quest, quest.progress)} / {questValue(quest, quest.target)}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
