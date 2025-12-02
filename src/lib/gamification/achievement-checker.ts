import { connectToDatabase } from '@/lib/mongodb';
import { GamificationProfile, IGamificationProfile, IPointTransaction } from '@/models/GamificationProfile';
import { AchievementBadge, IAchievementBadge, IAchievementRequirement } from '@/models/AchievementBadge';
import { getOrCreateGamificationProfile } from './gamification-service';
import { calculateLevelFromXP } from './point-calculator';

export interface AchievementUnlock {
  achievementId: string;
  name: string;
  description: string;
  pointsAwarded: number;
  rarity: string;
  iconUrl?: string;
}

/**
 * Check if a user meets the requirement for an achievement
 */
async function checkRequirement(
  profile: IGamificationProfile,
  requirement: IAchievementRequirement
): Promise<boolean> {
  let currentValue: number;

  switch (requirement.type) {
    case 'streak':
      // Check the highest streak value
      currentValue = Math.max(
        profile.streaks.workout,
        profile.streaks.goals,
        profile.streaks.checkins
      );
      break;
    case 'goal_count':
      // Count completed goals from transactions
      currentValue = profile.pointTransactions.filter(
        t => t.source === 'goal_completion'
      ).length;
      break;
    case 'workout_count':
      // Count completed workouts from transactions
      currentValue = profile.pointTransactions.filter(
        t => t.source === 'workout_completion'
      ).length;
      break;
    case 'points_earned':
      currentValue = profile.totalPointsEarned;
      break;
    case 'level_reached':
      currentValue = calculateLevelFromXP(profile.experiencePoints).level;
      break;
    case 'custom':
      // Custom requirements need special handling
      currentValue = 0;
      break;
    default:
      currentValue = 0;
  }

  switch (requirement.comparison) {
    case 'gte':
      return currentValue >= requirement.value;
    case 'lte':
      return currentValue <= requirement.value;
    case 'eq':
      return currentValue === requirement.value;
    default:
      return false;
  }
}

/**
 * Check and award any new achievements for a user
 */
export async function checkAndAwardAchievements(
  userId: string
): Promise<AchievementUnlock[]> {
  await connectToDatabase();

  const profile = await getOrCreateGamificationProfile(userId);
  const allAchievements = await AchievementBadge.find({ isActive: true });

  const unlockedAchievements: AchievementUnlock[] = [];

  for (const achievement of allAchievements) {
    // Skip if already earned
    if (profile.achievements.includes(achievement._id.toString())) {
      continue;
    }

    // Check if requirement is met
    const requirementMet = await checkRequirement(profile, achievement.requirement);

    if (requirementMet) {
      // Award the achievement
      profile.achievements.push(achievement._id.toString());

      // Award points for the achievement
      if (achievement.pointsReward > 0) {
        profile.totalPointsEarned += achievement.pointsReward;
        profile.currentFitCoins += achievement.pointsReward;
        profile.experiencePoints += achievement.pointsReward;

        const transaction: IPointTransaction = {
          amount: achievement.pointsReward,
          type: 'bonus',
          source: 'achievement',
          sourceId: achievement._id.toString(),
          description: `Achievement unlocked: ${achievement.name}`,
          createdAt: new Date(),
        };
        profile.pointTransactions.push(transaction);
      }

      unlockedAchievements.push({
        achievementId: achievement._id.toString(),
        name: achievement.name,
        description: achievement.description,
        pointsAwarded: achievement.pointsReward,
        rarity: achievement.rarity,
        iconUrl: achievement.iconUrl,
      });
    }
  }

  if (unlockedAchievements.length > 0) {
    await profile.save();
  }

  return unlockedAchievements;
}

/**
 * Get all achievements with user's progress
 */
export async function getAchievementsWithProgress(
  userId: string
): Promise<{
  achievement: IAchievementBadge;
  unlocked: boolean;
  unlockedAt?: Date;
  progress: number;
  progressMax: number;
}[]> {
  await connectToDatabase();

  const profile = await getOrCreateGamificationProfile(userId);
  const allAchievements = await AchievementBadge.find({ isActive: true });

  const result = [];

  for (const achievement of allAchievements) {
    const unlocked = profile.achievements.includes(achievement._id.toString());

    // Find unlock date from transactions
    let unlockedAt: Date | undefined;
    if (unlocked) {
      const transaction = profile.pointTransactions.find(
        t => t.source === 'achievement' && t.sourceId === achievement._id.toString()
      );
      unlockedAt = transaction?.createdAt;
    }

    // Calculate progress
    let progress = 0;
    const progressMax = achievement.requirement.value;

    switch (achievement.requirement.type) {
      case 'streak':
        progress = Math.max(
          profile.streaks.workout,
          profile.streaks.goals,
          profile.streaks.checkins
        );
        break;
      case 'goal_count':
        progress = profile.pointTransactions.filter(
          t => t.source === 'goal_completion'
        ).length;
        break;
      case 'workout_count':
        progress = profile.pointTransactions.filter(
          t => t.source === 'workout_completion'
        ).length;
        break;
      case 'points_earned':
        progress = profile.totalPointsEarned;
        break;
      case 'level_reached':
        progress = calculateLevelFromXP(profile.experiencePoints).level;
        break;
    }

    result.push({
      achievement,
      unlocked,
      unlockedAt,
      progress: Math.min(progress, progressMax),
      progressMax,
    });
  }

  return result;
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