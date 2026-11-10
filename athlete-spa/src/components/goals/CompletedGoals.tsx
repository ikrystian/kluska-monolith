import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Check, Trophy } from 'lucide-react';
import type { GoalView } from '@/hooks/useRewards';
import { formatNumber } from '@/components/rewards/reward-meta';

/** Historia osiągniętych celów; każdy można upamiętnić trofeum ze zdjęciem. */
export function CompletedGoals({ goals, onMakeTrophy }: { goals: GoalView[]; onMakeTrophy: (goal: GoalView) => void }) {
  return (
    <ul className="divide-y divide-border/60 rounded-2xl bg-card">
      {goals.map(goal => (
        <li key={goal.id} className="flex items-center gap-3 p-3.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-volt text-volt-foreground">
            <Check className="h-[18px] w-[18px]" strokeWidth={3.5} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">{goal.title}</span>
            <span className="block truncate text-xs tabular-nums text-muted-foreground">
              {formatNumber(goal.target)} {goal.unit}
              {goal.completedAt && ` · ${format(new Date(goal.completedAt), 'd MMM yyyy', { locale: pl })}`}
              {goal.pointsAwarded ? ` · +${goal.pointsAwarded} pkt` : ''}
            </span>
          </span>
          <button
            type="button"
            onClick={() => onMakeTrophy(goal)}
            aria-label={`Zamień cel ${goal.title} w trofeum`}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-food active:bg-secondary"
          >
            <Trophy className="h-[18px] w-[18px]" />
          </button>
        </li>
      ))}
    </ul>
  );
}
