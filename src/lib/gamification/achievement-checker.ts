import { connectToDatabase } from '@/lib/mongodb';
import { IGamificationProfile } from '@/models/GamificationProfile';
import { AchievementBadge, IAchievementBadge, IAchievementRequirement } from '@/models/AchievementBadge';
import { getOrCreateGamificationProfile } from './gamification-service';
import { calculateLevelFromXP } from './point-calculator';
import { CATALOG, metricValue } from './catalog';
import type { AthleteStats } from './stats';

export interface AchievementUnlock {
  achievementId: string;
  name: string;
  description: string;
  pointsAwarded: number;
  rarity: string;
  iconUrl?: string;
  /** Ikona z katalogu (nazwa), gdy osiągnięcie nie ma własnej grafiki. */
  icon?: string;
}

/** Wartość, z którą porównujemy wymaganie odznaki z panelu admina. */
export function requirementValue(
  profile: Pick<IGamificationProfile, 'streaks' | 'totalPointsEarned' | 'experiencePoints'>,
  stats: AthleteStats | null,
  requirement: IAchievementRequirement
): number {
  switch (requirement.type) {
    case 'streak':
      return Math.max(stats?.longestStreakDays ?? 0, profile.streaks.goals, profile.streaks.checkins);
    case 'streak_days':
      return stats?.longestStreakDays ?? 0;
    case 'goal_count':
      return stats?.goalsCompleted ?? 0;
    case 'workout_count':
      return stats?.workoutCount ?? 0;
    case 'total_volume':
      return stats?.totalVolumeKg ?? 0;
    case 'personal_record_count':
      return stats?.prCount ?? 0;
    case 'run_distance':
      return stats?.runKm ?? 0;
    case 'points_earned':
      return profile.totalPointsEarned;
    case 'level_reached':
      return calculateLevelFromXP(profile.experiencePoints).level;
    default:
      return 0;
  }
}

export function requirementMet(value: number, requirement: IAchievementRequirement): boolean {
  switch (requirement.comparison) {
    case 'lte':
      return value <= requirement.value;
    case 'eq':
      return value === requirement.value;
    default:
      return value >= requirement.value;
  }
}

/**
 * Check and award any new achievements for a user. Pełna synchronizacja:
 * statystyki, katalog, odznaki z bazy, cele i wyzwania.
 */
export async function checkAndAwardAchievements(userId: string): Promise<AchievementUnlock[]> {
  const { syncProgress } = await import('./engine');
  return (await syncProgress(userId)).unlocked;
}

/**
 * Get all achievements with user's progress — katalog z kodu + odznaki z bazy,
 * w kształcie używanym przez siatkę odznak.
 */
export async function getAchievementsWithProgress(
  userId: string
): Promise<{
  achievement: {
    id: string;
    name: string;
    description: string;
    iconUrl?: string;
    icon?: string;
    category: string;
    pointsReward: number;
    rarity: string;
  };
  unlocked: boolean;
  unlockedAt?: Date;
  progress: number;
  progressMax: number;
}[]> {
  await connectToDatabase();

  const profile = await getOrCreateGamificationProfile(userId);
  const stats = (profile.lifetimeStats as AthleteStats | undefined) ?? null;
  const level = calculateLevelFromXP(profile.experiencePoints).level;
  const unlockedAt = new Map((profile.unlocked ?? []).map(u => [u.key, u.unlockedAt]));

  const catalog = CATALOG.map(entry => {
    const value = stats ? metricValue(stats, level, entry.metric) : entry.metric === 'level' ? level : 0;
    return {
      achievement: {
        id: entry.key,
        name: entry.name,
        description: entry.description,
        icon: entry.icon,
        category: entry.trackId,
        pointsReward: entry.xp,
        rarity: entry.rarity,
      },
      unlocked: unlockedAt.has(entry.key),
      unlockedAt: unlockedAt.get(entry.key),
      progress: Math.min(value, entry.threshold),
      progressMax: entry.threshold,
    };
  });

  const badges = await AchievementBadge.find({ isActive: true });
  const fromDatabase = badges.map(badge => {
    const id = badge._id.toString();
    const unlocked = profile.achievements.includes(id);
    const transaction = unlocked
      ? profile.pointTransactions.find(t => t.source === 'achievement' && t.sourceId === id)
      : undefined;
    const value = requirementValue(profile, stats, badge.requirement);

    return {
      achievement: {
        id,
        name: badge.name,
        description: badge.description,
        iconUrl: badge.iconUrl,
        category: badge.category,
        pointsReward: badge.pointsReward,
        rarity: badge.rarity,
      },
      unlocked,
      unlockedAt: transaction?.createdAt,
      progress: Math.min(value, badge.requirement.value),
      progressMax: badge.requirement.value,
    };
  });

  return [...catalog, ...fromDatabase];
}

/**
 * Get user's unlocked achievements
 */
export async function getUnlockedAchievements(
  userId: string
): Promise<IAchievementBadge[]> {
  await connectToDatabase();

  const profile = await getOrCreateGamificationProfile(userId);

  if (profile.achievements.length === 0) {
    return [];
  }

  const achievements = await AchievementBadge.find({
    _id: { $in: profile.achievements },
  });

  return achievements;
}

/**
 * Create default achievements if none exist
 */
export async function seedDefaultAchievements(): Promise<void> {
  await connectToDatabase();

  const existingCount = await AchievementBadge.countDocuments();
  if (existingCount > 0) {
    return;
  }

  const defaultAchievements = [
    // Consistency achievements
    {
      name: 'First Steps',
      description: 'Complete your first workout',
      category: 'consistency',
      requirement: { type: 'workout_count', value: 1, comparison: 'gte' },
      pointsReward: 50,
      rarity: 'common',
    },
    {
      name: 'Week Warrior',
      description: 'Maintain a 7-day workout streak',
      category: 'consistency',
      requirement: { type: 'streak', value: 7, comparison: 'gte' },
      pointsReward: 100,
      rarity: 'rare',
    },
    {
      name: 'Month Master',
      description: 'Maintain a 30-day workout streak',
      category: 'consistency',
      requirement: { type: 'streak', value: 30, comparison: 'gte' },
      pointsReward: 500,
      rarity: 'epic',
    },
    {
      name: 'Century Club',
      description: 'Maintain a 100-day workout streak',
      category: 'consistency',
      requirement: { type: 'streak', value: 100, comparison: 'gte' },
      pointsReward: 1000,
      rarity: 'legendary',
    },
    // Performance achievements
    {
      name: 'Goal Getter',
      description: 'Complete your first goal',
      category: 'performance',
      requirement: { type: 'goal_count', value: 1, comparison: 'gte' },
      pointsReward: 50,
      rarity: 'common',
    },
    {
      name: 'Goal Crusher',
      description: 'Complete 10 goals',
      category: 'performance',
      requirement: { type: 'goal_count', value: 10, comparison: 'gte' },
      pointsReward: 200,
      rarity: 'rare',
    },
    {
      name: 'Goal Machine',
      description: 'Complete 50 goals',
      category: 'performance',
      requirement: { type: 'goal_count', value: 50, comparison: 'gte' },
      pointsReward: 500,
      rarity: 'epic',
    },
    // Milestone achievements
    {
      name: 'Rising Star',
      description: 'Reach level 5',
      category: 'milestone',
      requirement: { type: 'level_reached', value: 5, comparison: 'gte' },
      pointsReward: 100,
      rarity: 'common',
    },
    {
      name: 'Fitness Pro',
      description: 'Reach level 10',
      category: 'milestone',
      requirement: { type: 'level_reached', value: 10, comparison: 'gte' },
      pointsReward: 250,
      rarity: 'rare',
    },
    {
      name: 'Elite Athlete',
      description: 'Reach level 25',
      category: 'milestone',
      requirement: { type: 'level_reached', value: 25, comparison: 'gte' },
      pointsReward: 750,
      rarity: 'epic',
    },
    {
      name: 'Legend',
      description: 'Reach level 50',
      category: 'milestone',
      requirement: { type: 'level_reached', value: 50, comparison: 'gte' },
      pointsReward: 2000,
      rarity: 'legendary',
    },
    // Points achievements
    {
      name: 'Point Collector',
      description: 'Earn 1,000 total points',
      category: 'milestone',
      requirement: { type: 'points_earned', value: 1000, comparison: 'gte' },
      pointsReward: 100,
      rarity: 'common',
    },
    {
      name: 'Point Hoarder',
      description: 'Earn 10,000 total points',
      category: 'milestone',
      requirement: { type: 'points_earned', value: 10000, comparison: 'gte' },
      pointsReward: 500,
      rarity: 'rare',
    },
    {
      name: 'Point Master',
      description: 'Earn 100,000 total points',
      category: 'milestone',
      requirement: { type: 'points_earned', value: 100000, comparison: 'gte' },
      pointsReward: 2500,
      rarity: 'legendary',
    },
  ];

  await AchievementBadge.insertMany(defaultAchievements);
}