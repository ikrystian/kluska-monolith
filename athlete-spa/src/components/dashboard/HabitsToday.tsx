import { Check } from 'lucide-react';
import { SectionHeader } from '@/components/ui/section';
import { cn } from '@/lib/utils';
import type { Habit } from '@/lib/types';

/** Tick habits right here, without opening the habits screen. */
export function HabitsToday({ habits, isDone, onToggle, doneCount }: { habits: Habit[]; isDone: (id: string) => boolean; onToggle: (id: string) => void; doneCount: number }) {
  return (
    <section>
      <SectionHeader title={`Nawyki ${doneCount}/${habits.length}`} href="/athlete/habits" linkLabel="Zarządzaj" />
      <div className="no-scrollbar -mx-4 flex gap-1 overflow-x-auto px-3">
        {habits.map(habit => {
          const done = isDone(habit.id);
          return (
            <button
              key={habit.id}
              type="button"
              onClick={() => onToggle(habit.id)}
              aria-pressed={done}
              aria-label={`${habit.name}: ${done ? 'zrobione' : 'do zrobienia'}`}
              className="flex w-[4.75rem] shrink-0 flex-col items-center gap-1.5 rounded-xl px-1 py-1 transition-transform active:scale-95"
            >
              <span
                className={cn(
                  'relative grid h-14 w-14 place-items-center rounded-full text-2xl transition-colors',
                  done ? 'bg-volt/20 ring-2 ring-inset ring-volt' : 'bg-card'
                )}
              >
                {habit.icon || '💪'}
                {done && (
                  <span className="absolute -bottom-0.5 -right-0.5 grid h-5 w-5 place-items-center rounded-full bg-volt text-volt-foreground ring-2 ring-background">
                    <Check className="h-3 w-3" strokeWidth={3.5} />
                  </span>
                )}
              </span>
              <span className={cn('line-clamp-2 text-center text-xs font-medium leading-tight', done ? 'text-foreground' : 'text-muted-foreground')}>
                {habit.name}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
