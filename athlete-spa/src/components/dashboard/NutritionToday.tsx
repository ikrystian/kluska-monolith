import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { BigNumber } from '@/components/ui/section';
import type { DiaryGoal, DiaryTotals } from '@/lib/nutrition';

export function Macro({ label, value, target }: { label: string; value: number; target?: number }) {
  const percent = target ? Math.min(100, (value / target) * 100) : 0;
  return (
    <div className="min-w-0">
      <p className="truncate text-xs text-muted-foreground">
        {label} <span className="font-semibold tabular-nums text-foreground">{Math.round(value)}</span>
        {target ? <span className="tabular-nums">/{target}</span> : null}
      </p>
      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-secondary">
        <div className="h-full rounded-full bg-food transition-[width] duration-500" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

/** Calories left today and the three macros, with a straight path to logging a meal. */
export function NutritionToday({ totals, goal }: { totals: DiaryTotals; goal: DiaryGoal | null }) {
  const remaining = goal ? goal.dailyCalories - totals.calories : null;
  const over = remaining !== null && remaining < 0;

  return (
    <section className="rounded-2xl bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <Link to="/athlete/nutrition" className="min-w-0 active:opacity-70">
          <p className="text-[15px] font-semibold">Jedzenie</p>
          <p className="mt-2">
            <BigNumber value={Math.abs(remaining ?? totals.calories).toLocaleString('pl-PL')} className="text-[2.5rem]" />
            <span className="ml-1.5 text-sm font-medium text-muted-foreground">
              {remaining === null ? 'kcal dziś' : over ? 'kcal ponad cel' : 'kcal zostało'}
            </span>
          </p>
        </Link>
        <Link
          to="/athlete/nutrition?add=1"
          className="flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-secondary px-3 text-sm font-semibold transition-transform active:scale-95"
        >
          <Plus className="h-4 w-4" /> Posiłek
        </Link>
      </div>
      <div className="mt-3.5 grid grid-cols-3 gap-3">
        <Macro label="Białko" value={totals.protein} target={goal?.dailyProtein} />
        <Macro label="Węgle" value={totals.carbs} target={goal?.dailyCarbs} />
        <Macro label="Tłuszcz" value={totals.fat} target={goal?.dailyFat} />
      </div>
    </section>
  );
}
