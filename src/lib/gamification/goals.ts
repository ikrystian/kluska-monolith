import { connectToDatabase } from '@/lib/mongodb';
import { Goal, IGoal, GoalMetric } from '@/models/Goal';
import { BodyMeasurement } from '@/models/BodyMeasurement';
import { User } from '@/models/User';
import type { AthleteStats } from './stats';
import { awardGoalCompletionPoints } from './gamification-service';
import { getExerciseBestWeight } from './records';
import { goalFraction, goalPace, isGoalReached, GoalPace } from './goal-progress';
import { dayKey } from './streaks';

const round = (value: number, digits = 1) => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

/** Jednostka i sposób liczenia każdej metryki automatycznej. */
export const GOAL_METRIC_UNITS: Record<GoalMetric, string | null> = {
  manual: null,
  total_volume: 't',
  workout_count: 'treningów',
  exercise_max_weight: 'kg',
  body_weight: 'kg',
  run_distance: 'km',
  streak_days: 'dni',
  habit_days: 'odhaczeń',
};

async function latestBodyWeight(userId: string): Promise<number> {
  const latest = await BodyMeasurement.findOne({ ownerId: userId }).sort({ date: -1 }).select('weight').lean();
  if (latest?.weight) return latest.weight;
  const user = await User.findById(userId).select('weight').lean();
  return (user as { weight?: number } | null)?.weight ?? 0;
}

/** Surowa wartość metryki „na teraz” — punkt odniesienia zapisywany przy zakładaniu celu. */
export async function rawMetricValue(
  userId: string,
  metric: GoalMetric,
  stats: AthleteStats,
  exerciseId?: string
): Promise<number> {
  switch (metric) {
    case 'total_volume':
      return stats.totalVolumeKg;
    case 'workout_count':
      return stats.workoutCount;
    case 'run_distance':
      return stats.runKm;
    case 'habit_days':
      return stats.habitCompletions;
    case 'streak_days':
      return stats.currentStreakDays;
    case 'exercise_max_weight':
      return exerciseId ? getExerciseBestWeight(userId, exerciseId) : 0;
    case 'body_weight':
      return latestBodyWeight(userId);
    default:
      return 0;
  }
}

/** Zamienia surową wartość metryki na `current` celu (przyrost od startu albo wartość bezwzględna). */
export function currentFromRaw(metric: GoalMetric, raw: number, startValue: number): number {
  switch (metric) {
    case 'total_volume':
      return round(Math.max(0, raw - startValue) / 1000, 2);
    case 'workout_count':
    case 'habit_days':
      return Math.max(0, raw - startValue);
    case 'run_distance':
      return round(Math.max(0, raw - startValue), 1);
    default:
      return round(raw, 1);
  }
}

export interface GoalCompletion {
  id: string;
  title: string;
  points: number;
}

/** Zamyka cel (raz) i przyznaje punkty. Zwraca null, jeśli cel nie był aktywny. */
export async function completeGoal(goalId: string, userId: string): Promise<GoalCompletion | null> {
  await connectToDatabase();

  const goal = await Goal.findOneAndUpdate(
    { _id: goalId, ownerId: userId, status: 'active' },
    { $set: { status: 'completed', completedAt: new Date() } },
    { new: true }
  );
  if (!goal) return null;

  const { points } = await awardGoalCompletionPoints(goalId, userId);
  return { id: String(goal._id), title: goal.title, points };
}

/** Odświeża `current` celów automatycznych i zamyka te, które osiągnęły target. */
export async function syncAutoGoals(userId: string, stats: AthleteStats): Promise<GoalCompletion[]> {
  await connectToDatabase();

  const goals = await Goal.find({ ownerId: userId, status: 'active', metric: { $nin: ['manual', null] } });
  const today = dayKey(new Date());
  const completed: GoalCompletion[] = [];

  for (const goal of goals) {
    const raw = await rawMetricValue(userId, goal.metric, stats, goal.exerciseId);
    // Brak danych (np. żadnego pomiaru wagi) nie może „osiągnąć” celu na spadek.
    if (goal.metric === 'body_weight' && raw <= 0) continue;

    const current = currentFromRaw(goal.metric, raw, goal.startValue ?? 0);
    if (current !== goal.current) {
      const log = (goal.progressLog ?? []).filter(point => point.date !== today);
      log.push({ date: today, value: current });
      await Goal.updateOne({ _id: goal._id }, { $set: { current, progressLog: log.slice(-60) } });
      goal.current = current;
    }

    if (isGoalReached(goal)) {
      const done = await completeGoal(String(goal._id), userId);
      if (done) completed.push(done);
    }
  }

  return completed;
}

export interface GoalView {
  id: string;
  title: string;
  description?: string;
  metric: GoalMetric;
  auto: boolean;
  target: number;
  current: number;
  startValue: number;
  unit: string;
  direction: 'up' | 'down';
  deadline?: string;
  status: 'active' | 'completed' | 'cancelled';
  exerciseId?: string;
  exerciseName?: string;
  ownerId: string;
  createdAt?: string;
  completedAt?: string;
  pointsAwarded?: number;
  /** Postęp 0–100. */
  percent: number;
  reached: boolean;
  pace: GoalPace;
  progressLog: { date: string; value: number }[];
}

const iso = (date?: Date | string | null) => (date ? new Date(date).toISOString() : undefined);

export function toGoalView(goal: IGoal, now: Date = new Date()): GoalView {
  const metric = goal.metric ?? 'manual';
  const like = {
    metric,
    target: goal.target,
    current: goal.current,
    startValue: goal.startValue ?? 0,
    direction: goal.direction ?? 'up',
    deadline: goal.deadline,
    startDate: goal.startDate,
    createdAt: goal.createdAt,
    status: goal.status,
  };

  return {
    id: String(goal._id),
    title: goal.title,
    description: goal.description,
    metric,
    auto: metric !== 'manual',
    target: goal.target,
    current: goal.current,
    startValue: goal.startValue ?? 0,
    unit: goal.unit,
    direction: goal.direction ?? 'up',
    deadline: iso(goal.deadline),
    status: goal.status,
    exerciseId: goal.exerciseId,
    exerciseName: goal.exerciseName,
    ownerId: goal.ownerId,
    createdAt: iso(goal.createdAt),
    completedAt: iso(goal.completedAt),
    pointsAwarded: goal.pointsAwarded,
    percent: goal.status === 'completed' ? 100 : Math.round(goalFraction(like) * 100),
    reached: isGoalReached(like),
    pace: goalPace(like, now),
    progressLog: (goal.progressLog ?? []).map(point => ({ date: point.date, value: point.value })),
  };
}

export async function listGoals(userId: string): Promise<{ active: GoalView[]; completed: GoalView[] }> {
  await connectToDatabase();

  const goals = await Goal.find({ ownerId: userId, status: { $ne: 'cancelled' } }).sort({ createdAt: -1 });
  const now = new Date();
  const views = goals.map(goal => toGoalView(goal, now));

  return {
    active: views.filter(goal => goal.status === 'active'),
    completed: views
      .filter(goal => goal.status === 'completed')
      .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''))
      .slice(0, 30),
  };
}
