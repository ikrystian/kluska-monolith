import type { GoalMetric } from '@/models/Goal';
import { daysBetween, dayKey } from './streaks';

/** Czyste wyliczenia postępu i tempa celu — wspólne dla API i skryptu sprawdzającego. */

export interface GoalLike {
  metric?: GoalMetric;
  target: number;
  current: number;
  startValue?: number;
  direction?: 'up' | 'down';
  deadline?: Date | string | null;
  startDate?: Date | string | null;
  createdAt?: Date | string | null;
  status?: 'active' | 'completed' | 'cancelled';
}

/**
 * Metryki, w których `current` to wartość bezwzględna, a postęp liczymy od
 * `startValue` do `target` (np. z 80 kg do 100 kg w przysiadzie).
 */
const ABSOLUTE_METRICS: GoalMetric[] = ['exercise_max_weight', 'body_weight'];

export function isAbsoluteMetric(metric?: GoalMetric): boolean {
  return ABSOLUTE_METRICS.includes(metric ?? 'manual');
}

export function goalFraction(goal: GoalLike): number {
  const { target, current } = goal;
  const start = goal.startValue ?? 0;

  if (goal.direction === 'down') {
    if (current <= target) return 1;
    if (start <= target) return 0;
    return Math.max(0, Math.min(1, (start - current) / (start - target)));
  }

  if (isAbsoluteMetric(goal.metric) && start > 0 && start < target) {
    return Math.max(0, Math.min(1, (current - start) / (target - start)));
  }

  if (target <= 0) return 0;
  return Math.max(0, Math.min(1, current / target));
}

export function isGoalReached(goal: GoalLike): boolean {
  return goal.direction === 'down' ? goal.current <= goal.target : goal.current >= goal.target;
}

export type GoalPaceStatus = 'done' | 'overdue' | 'on_track' | 'behind' | 'no_deadline' | 'not_started';

export interface GoalPace {
  status: GoalPaceStatus;
  /** Dni do terminu; ujemne = po terminie; null = bez terminu. */
  daysLeft: number | null;
  /** Przewidywany dzień osiągnięcia celu przy dotychczasowym tempie. */
  projectedDate: string | null;
}

export function goalPace(goal: GoalLike, now: Date = new Date()): GoalPace {
  const today = dayKey(now);
  const daysLeft = goal.deadline ? daysBetween(today, dayKey(goal.deadline)) : null;

  if (goal.status === 'completed' || isGoalReached(goal)) {
    return { status: 'done', daysLeft, projectedDate: null };
  }

  const fraction = goalFraction(goal);
  const startedAt = goal.startDate ?? goal.createdAt;
  const elapsedDays = startedAt ? Math.max(1, daysBetween(dayKey(startedAt), today)) : 0;

  let projectedDate: string | null = null;
  if (fraction > 0 && elapsedDays > 0) {
    const remainingDays = Math.ceil(((1 - fraction) / fraction) * elapsedDays);
    // Prognozy dalsze niż 5 lat nic nie mówią.
    if (remainingDays <= 365 * 5) {
      projectedDate = new Date(now.getTime() + remainingDays * 86_400_000).toISOString();
    }
  }

  if (daysLeft === null) return { status: 'no_deadline', daysLeft, projectedDate };
  if (daysLeft < 0) return { status: 'overdue', daysLeft, projectedDate };
  if (fraction === 0) return { status: 'not_started', daysLeft, projectedDate };

  const onTrack = projectedDate !== null && daysBetween(today, dayKey(projectedDate)) <= daysLeft;
  return { status: onTrack ? 'on_track' : 'behind', daysLeft, projectedDate };
}
