import { connectToDatabase } from '@/lib/mongodb';
import { GamificationProfile, IGamificationProfile, IPointTransaction } from '@/models/GamificationProfile';
import { Goal } from '@/models/Goal';
import { Reward, IReward } from '@/models/Reward';
import { User } from '@/models/User';
import { dayKey, effectiveStreak } from './streaks';
import {
  calculatePoints,
  calculateLevelFromXP,
  calculateWorkoutPoints,
  streakMilestoneCrossed,
  PointCalculationInput
} from './point-calculator';

export interface GamificationStats {
  totalPointsEarned: number;
  currentFitCoins: number;
  level: number;
  experiencePoints: number;
  xpForNextLevel: number;
  currentXP: number;
  streaks: {
    workout: number;
    goals: number;
    checkins: number;
  };
  achievementCount: number;
  redeemedRewardsCount: number;
  rank?: number;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  userName: string;
  totalPoints: number;
  level: number;
}

/**
 * Get or create gamification profile for a user
 */
export async function getOrCreateGamificationProfile(userId: string): Promise<IGamificationProfile> {
  await connectToDatabase();

  // Atomowy upsert: dwa równoległe żądania nie stworzą dwóch profili.
  const profile = await GamificationProfile.findOneAndUpdate(
    { userId },
    { $setOnInsert: { userId } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  return profile!;
}

export interface PointGrant {
  profile: IGamificationProfile;
  level: number;
  previousLevel: number;
}

/**
 * Jedyna droga przyznawania punktów: atomowy `$inc` (bez read-modify-save),
 * historia przycięta do 200 wpisów i utrwalony poziom.
 */
export async function grantPoints(
  userId: string,
  amount: number,
  transaction: Omit<IPointTransaction, 'amount' | 'createdAt' | 'type'> & { type?: IPointTransaction['type'] },
  extra: { inc?: Record<string, number>; set?: Record<string, unknown> } = {}
): Promise<PointGrant> {
  const before = await getOrCreateGamificationProfile(userId);
  const previousLevel = calculateLevelFromXP(before.experiencePoints).level;

  const entry: IPointTransaction = {
    amount,
    type: transaction.type ?? 'earned',
    source: transaction.source,
    sourceId: transaction.sourceId,
    description: transaction.description,
    createdAt: new Date(),
  };

  const profile = (await GamificationProfile.findOneAndUpdate(
    { userId },
    {
      $inc: { totalPointsEarned: amount, currentFitCoins: amount, experiencePoints: amount, ...extra.inc },
      $push: { pointTransactions: { $each: [entry], $slice: -200 } },
      ...(extra.set ? { $set: extra.set } : {}),
    },
    { new: true }
  ))!;

  const level = calculateLevelFromXP(profile.experiencePoints).level;
  if (level !== profile.level) {
    await GamificationProfile.updateOne({ userId }, { $set: { level } });
    profile.level = level;
  }

  return { profile, level, previousLevel };
}

/**
 * Get gamification stats for a user
 */
export async function getGamificationStats(userId: string): Promise<GamificationStats> {
  let profile = await getOrCreateGamificationProfile(userId);

  // Pierwszy odczyt po wdrożeniu: policz dorobek z dotychczasowej historii.
  if (!profile.statsUpdatedAt) {
    const { syncProgress } = await import('./engine');
    profile = (await syncProgress(userId)).profile;
  }

  const levelInfo = calculateLevelFromXP(profile.experiencePoints);
  const snapshot = profile.lifetimeStats;

  return {
    totalPointsEarned: profile.totalPointsEarned,
    currentFitCoins: profile.currentFitCoins,
    level: levelInfo.level,
    experiencePoints: profile.experiencePoints,
    xpForNextLevel: levelInfo.xpForNextLevel,
    currentXP: levelInfo.currentXP,
    streaks: {
      // Seria w dniach kalendarzowych; wygasa, gdy wczoraj i dziś nic się nie działo.
      workout: effectiveStreak(snapshot?.currentStreakDays ?? 0, snapshot?.lastActiveDay, dayKey(new Date())),
      goals: profile.streaks.goals,
      checkins: profile.streaks.checkins,
    },
    achievementCount: profile.achievements.length + (profile.unlocked?.length ?? 0),
    redeemedRewardsCount: profile.redeemedRewards.length,
    rank: profile.rank,
  };
}

/** Cel młodszy niż doba nie daje punktów — inaczej dałoby się je „drukować” celami na 1 powtórzenie. */
const MIN_GOAL_AGE_MS = 24 * 60 * 60 * 1000;

/**
 * Award points for completing a goal
 */
export async function awardGoalCompletionPoints(
  goalId: string,
  userId: string,
  trainerApproval: boolean = false
): Promise<{ points: number; newBalance: number; levelUp: boolean }> {
  await connectToDatabase();

  const goal = await Goal.findById(goalId);
  if (!goal) {
    throw new Error('Goal not found');
  }

  const profile = await getOrCreateGamificationProfile(userId);
  const now = new Date();

  // Idempotencja: punkty za ten cel już przyznane.
  if (typeof goal.pointsAwarded === 'number') {
    return { points: 0, newBalance: profile.currentFitCoins, levelUp: false };
  }

  const startedAt = goal.startDate ?? goal.createdAt ?? now;
  if (now.getTime() - new Date(startedAt).getTime() < MIN_GOAL_AGE_MS) {
    await Goal.updateOne({ _id: goal._id }, { $set: { pointsAwarded: 0, completedAt: goal.completedAt ?? now } });
    return { points: 0, newBalance: profile.currentFitCoins, levelUp: false };
  }

  const input: PointCalculationInput = {
    goalId,
    athleteId: userId,
    completionTime: now,
    goalDifficulty: goal.difficulty,
    deadline: goal.deadline,
    currentStreak: Math.min(profile.streaks.goals, 10),
    trainerApproval,
    basePoints: goal.basePoints,
  };

  const result = calculatePoints(input);

  // Atomowe „zajęcie” nagrody — równoległe zamknięcie celu nie przyzna jej dwa razy.
  const claimed = await Goal.updateOne(
    { _id: goal._id, pointsAwarded: { $exists: false } },
    { $set: { pointsAwarded: result.totalPoints, completedAt: goal.completedAt ?? now } }
  );
  if (claimed.modifiedCount === 0) {
    return { points: 0, newBalance: profile.currentFitCoins, levelUp: false };
  }

  const grant = await grantPoints(
    userId,
    result.totalPoints,
    { source: 'goal_completion', sourceId: goalId, description: `Cel osiągnięty: ${goal.title}` },
    { inc: { 'streaks.goals': 1 }, set: { 'streaks.lastGoalDate': now } }
  );

  return {
    points: result.totalPoints,
    newBalance: grant.profile.currentFitCoins,
    levelUp: grant.level > grant.previousLevel,
  };
}

/**
 * Award points for completing a workout. Serię dni i kamienie milowe liczy
 * `engine.onWorkoutCompleted` — tu tylko punkty za sam trening.
 */
export async function awardWorkoutCompletionPoints(
  userId: string,
  workoutDurationMinutes: number,
  volumeKg: number,
  workoutId?: string
): Promise<{ points: number; newBalance: number }> {
  const points = calculateWorkoutPoints(workoutDurationMinutes, volumeKg);

  const grant = await grantPoints(
    userId,
    points,
    {
      source: 'workout_completion',
      sourceId: workoutId,
      description: `Trening ukończony (${Math.round(workoutDurationMinutes)} min)`,
    },
    { set: { 'streaks.lastWorkoutDate': new Date() } }
  );

  return { points, newBalance: grant.profile.currentFitCoins };
}

/**
 * Redeem a reward
 */
export async function redeemReward(
  userId: string,
  rewardId: string
): Promise<{ success: boolean; newBalance: number; error?: string }> {
  await connectToDatabase();

  const reward = await Reward.findById(rewardId);
  if (!reward) {
    return { success: false, newBalance: 0, error: 'Reward not found' };
  }

  if (!reward.isActive) {
    return { success: false, newBalance: 0, error: 'Reward is not available' };
  }

  if (reward.maxRedemptions && reward.currentRedemptions >= reward.maxRedemptions) {
    return { success: false, newBalance: 0, error: 'Reward is sold out' };
  }

  if (reward.validUntil && new Date() > reward.validUntil) {
    return { success: false, newBalance: 0, error: 'Reward has expired' };
  }

  const profile = await getOrCreateGamificationProfile(userId);

  if (profile.currentFitCoins < reward.fitCoinCost) {
    return {
      success: false,
      newBalance: profile.currentFitCoins,
      error: 'Insufficient FitCoins'
    };
  }

  // Deduct FitCoins
  profile.currentFitCoins -= reward.fitCoinCost;

  // Add to redeemed rewards
  profile.redeemedRewards.push({
    rewardId: rewardId,
    redeemedAt: new Date(),
    fitCoinsCost: reward.fitCoinCost,
  });

  // Add transaction
  const transaction: IPointTransaction = {
    amount: -reward.fitCoinCost,
    type: 'spent',
    source: 'reward_redemption',
    sourceId: rewardId,
    description: `Redeemed reward: ${reward.title}`,
    createdAt: new Date(),
  };
  profile.pointTransactions.push(transaction);

  await profile.save();

  // Update reward redemption count
  reward.currentRedemptions += 1;
  await reward.save();

  return {
    success: true,
    newBalance: profile.currentFitCoins,
  };
}

/**
 * Get available rewards for a user
 */
export async function getAvailableRewards(userId: string): Promise<IReward[]> {
  await connectToDatabase();

  const profile = await getOrCreateGamificationProfile(userId);

  const rewards = await Reward.find({
    isActive: true,
    $and: [
      {
        $or: [
          { validUntil: { $exists: false } },
          { validUntil: { $gte: new Date() } },
        ],
      },
      {
        $or: [
          { maxRedemptions: { $exists: false } },
          { $expr: { $lt: ['$currentRedemptions', '$maxRedemptions'] } },
        ],
      },
    ],
  }).sort({ fitCoinCost: 1 });

  return rewards;
}

/**
 * Get leaderboard
 */
export async function getLeaderboard(
  limit: number = 10,
  trainerId?: string
): Promise<LeaderboardEntry[]> {
  await connectToDatabase();

  const safeLimit = Math.max(1, Math.min(Number.isFinite(limit) ? limit : 10, 100));

  // Konta gości nie trafiają do rankingu; opcjonalnie tylko podopieczni trenera.
  const eligible = await User.find({ isGuest: { $ne: true }, ...(trainerId ? { trainerId } : {}) })
    .select('_id name')
    .lean();
  const names = new Map(eligible.map(u => [String(u._id), u.name]));

  const profiles = await GamificationProfile.find({ userId: { $in: [...names.keys()] } })
    .sort({ totalPointsEarned: -1 })
    .limit(safeLimit)
    .select('userId totalPointsEarned experiencePoints')
    .lean();

  return profiles.map((profile, index) => ({
    rank: index + 1,
    userId: profile.userId,
    userName: names.get(profile.userId) || 'Sportowiec',
    totalPoints: profile.totalPointsEarned,
    level: calculateLevelFromXP(profile.experiencePoints).level,
  }));
}

/**
 * Update user rank in leaderboard
 */
export async function updateUserRanks(): Promise<void> {
  await connectToDatabase();

  const profiles = await GamificationProfile.find()
    .sort({ totalPointsEarned: -1 });

  for (let i = 0; i < profiles.length; i++) {
    profiles[i].rank = i + 1;
    await profiles[i].save();
  }
}

/**
 * Reset daily streaks if needed
 */
export async function checkAndResetStreaks(userId: string): Promise<void> {
  await connectToDatabase();

  const profile = await getOrCreateGamificationProfile(userId);
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Reset workout streak if no workout in last 24 hours
  if (profile.streaks.lastWorkoutDate && profile.streaks.lastWorkoutDate < oneDayAgo) {
    profile.streaks.workout = 0;
  }

  // Reset checkin streak if no checkin in last 24 hours
  if (profile.streaks.lastCheckinDate && profile.streaks.lastCheckinDate < oneDayAgo) {
    profile.streaks.checkins = 0;
  }

  await profile.save();
}

/**
 * Record a daily check-in
 */
export async function recordCheckin(userId: string): Promise<{ points: number; streak: number }> {
  await connectToDatabase();

  const profile = await getOrCreateGamificationProfile(userId);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Check if already checked in today
  if (profile.streaks.lastCheckinDate) {
    const lastCheckin = new Date(profile.streaks.lastCheckinDate);
    const lastCheckinDay = new Date(lastCheckin.getFullYear(), lastCheckin.getMonth(), lastCheckin.getDate());

    if (lastCheckinDay.getTime() === today.getTime()) {
      return { points: 0, streak: profile.streaks.checkins };
    }
  }

  // Wczorajszy check-in przedłuża serię, starszy zaczyna ją od nowa.
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const last = profile.streaks.lastCheckinDate ? new Date(profile.streaks.lastCheckinDate) : null;
  const streak = last && last >= yesterday ? profile.streaks.checkins + 1 : 1;
  const points = 10 + streakMilestoneCrossed(streak - 1, streak);

  await grantPoints(
    userId,
    points,
    { source: 'streak_bonus', description: `Dzienny check-in (seria: ${streak})` },
    { set: { 'streaks.checkins': streak, 'streaks.lastCheckinDate': now } }
  );

  return { points, streak };
}

/**
 * Get point transaction history
 */
export async function getPointHistory(
  userId: string,
  limit: number = 50
): Promise<IPointTransaction[]> {
  await connectToDatabase();

  const profile = await getOrCreateGamificationProfile(userId);

  return profile.pointTransactions
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, limit);
}