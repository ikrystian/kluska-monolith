import { useCallback } from 'react';
import useSWR from 'swr';
import { apiFetch } from '@/lib/api-client';
import { jsonFetcher } from '@/lib/db-hooks';

/**
 * Dane ekranu „Cele i nagrody”. Kształty odpowiadają backendowi
 * (`src/lib/gamification/{engine,goals,catalog,quests}.ts` w aplikacji głównej).
 */

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

export type GoalMetric =
  | 'manual'
  | 'total_volume'
  | 'workout_count'
  | 'exercise_max_weight'
  | 'body_weight'
  | 'run_distance'
  | 'streak_days'
  | 'habit_days';

export type GoalPaceStatus = 'done' | 'overdue' | 'on_track' | 'behind' | 'no_deadline' | 'not_started';

export interface GoalView {
  id: string;
  title: string;
  description?: string;
  metric: GoalMetric;
  /** Postęp liczy serwer z realnych danych. */
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
  /** 0–100 */
  percent: number;
  reached: boolean;
  pace: { status: GoalPaceStatus; daysLeft: number | null; projectedDate: string | null };
  progressLog: { date: string; value: number }[];
}

export interface AchievementUnlock {
  achievementId: string;
  name: string;
  description: string;
  pointsAwarded: number;
  rarity: Rarity | string;
  iconUrl?: string;
  icon?: string;
}

export interface TrackTier {
  key: string;
  name: string;
  description: string;
  threshold: number;
  rarity: Rarity;
  xp: number;
  unlocked: boolean;
  unlockedAt?: string;
}

export interface Track {
  id: string;
  title: string;
  blurb: string;
  unit: string;
  icon: string;
  value: number;
  tiers: TrackTier[];
  unlockedCount: number;
  nextThreshold: number | null;
  /** 0–1 */
  progressToNext: number;
}

export interface Quest {
  id: 'workouts' | 'volume' | 'active_days';
  title: string;
  target: number;
  progress: number;
  unit: string;
  xp: number;
  completed: boolean;
  rewarded: boolean;
}

export interface AthleteStats {
  totalVolumeKg: number;
  bestWorkoutVolumeKg: number;
  workoutCount: number;
  totalSets: number;
  totalReps: number;
  totalMinutes: number;
  activeDays: number;
  currentStreakDays: number;
  longestStreakDays: number;
  runKm: number;
  prCount: number;
  goalsCompleted: number;
}

export interface RewardsOverview {
  profile: {
    level: number;
    currentXP: number;
    xpForNextLevel: number;
    totalPointsEarned: number;
    currentFitCoins: number;
    streakDays: number;
    longestStreakDays: number;
    achievementCount: number;
    achievementTotal: number;
  };
  stats: AthleteStats;
  tracks: Track[];
  quests: { weekKey: string; items: Quest[] };
  unseen: AchievementUnlock[];
  recentPoints: { amount: number; source: string; description: string; createdAt: string }[];
  goals: { active: GoalView[]; completed: GoalView[] };
}

/** Podsumowanie nagród zapisane na ukończonym treningu (`workoutLog.rewards`). */
export interface RewardSummary {
  xp: number;
  workoutXp: number;
  level: number;
  levelUp: { from: number; to: number } | null;
  streakDays: number;
  streakBonus: number;
  newRecords: { exerciseId: string; exerciseName: string; type: string; value: number; reps?: number }[];
  unlocked: AchievementUnlock[];
  goalsCompleted: { id: string; title: string; points: number }[];
  quests: { id: string; title: string; xp: number }[];
}

export interface GoalInput {
  title: string;
  description?: string;
  metric: GoalMetric;
  target: number;
  current?: number;
  unit?: string;
  deadline?: string;
  exerciseId?: string;
  exerciseName?: string;
}

export interface GoalCompletionResult {
  success: boolean;
  points: number;
  newBalance: number;
  levelUp: boolean;
  level: number;
  newAchievements: AchievementUnlock[];
}

export const OVERVIEW_KEY = '/api/gamification/overview';

async function send<T>(path: string, method: string, body?: unknown): Promise<T> {
  const response = await apiFetch(path, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error || 'Coś poszło nie tak. Spróbuj ponownie.');
  }
  return payload as T;
}

/**
 * Jeden odczyt dla całego ekranu. Każda udana mutacja przez `apiFetch`
 * odświeża widoczne klucze SWR, więc po zapisie dane wracają same.
 */
export function useRewardsOverview(enabled = true) {
  const { data, error, isLoading, mutate } = useSWR<RewardsOverview>(enabled ? OVERVIEW_KEY : null, jsonFetcher);

  const createGoal = useCallback((input: GoalInput) => send<GoalView>('/api/athlete/goals', 'POST', input), []);

  const updateGoal = useCallback(
    (id: string, input: Partial<Omit<GoalInput, 'metric' | 'deadline'>> & { deadline?: string | null }) =>
      send<GoalView>(`/api/athlete/goals/${id}`, 'PATCH', input),
    []
  );

  const deleteGoal = useCallback((id: string) => send<{ success: boolean }>(`/api/athlete/goals/${id}`, 'DELETE'), []);

  const completeGoal = useCallback(
    (id: string) => send<GoalCompletionResult>(`/api/gamification/goals/${id}/complete`, 'POST', {}),
    []
  );

  /** Po pokazaniu celebracji — żeby te same osiągnięcia nie wracały przy kolejnym wejściu. */
  const markSeen = useCallback(async () => {
    await send(OVERVIEW_KEY, 'POST', { action: 'seen' });
  }, []);

  return { overview: data, error, isLoading, refresh: mutate, createGoal, updateGoal, deleteGoal, completeGoal, markSeen };
}
