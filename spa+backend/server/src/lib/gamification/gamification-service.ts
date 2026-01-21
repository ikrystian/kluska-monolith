import { connectToDatabase } from '../../db';
import { GamificationProfile, IGamificationProfile, IPointTransaction } from '../../models/GamificationProfile';
import { Goal, IGoal } from '../../models/Goal';
import { Reward, IReward } from '../../models/Reward';
import { AchievementBadge, IAchievementBadge } from '../../models/AchievementBadge';
import {
    calculatePoints,
    calculateLevelFromXP,
    calculateWorkoutPoints,
    calculateStreakMilestoneBonus,
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

    let profile = await GamificationProfile.findOne({ userId });

    if (!profile) {
        profile = await GamificationProfile.create({
            userId,
            totalPointsEarned: 0,
            currentFitCoins: 0,
            level: 1,
            experiencePoints: 0,
            streaks: {
                workout: 0,
                goals: 0,
                checkins: 0,
            },
            achievements: [],
            redeemedRewards: [],
            pointTransactions: [],
        });
    }

    return profile;
}

/**
 * Get gamification stats for a user
 */
export async function getGamificationStats(userId: string): Promise<GamificationStats> {
    const profile = await getOrCreateGamificationProfile(userId);
    const levelInfo = calculateLevelFromXP(profile.experiencePoints);

    return {
        totalPointsEarned: profile.totalPointsEarned, // This might be undefined in some cases, ensure model has default
        currentFitCoins: profile.currentFitCoins,
        level: levelInfo.level,
        experiencePoints: profile.experiencePoints,
        xpForNextLevel: levelInfo.xpForNextLevel,
        currentXP: levelInfo.currentXP,
        streaks: profile.streaks,
        achievementCount: profile.achievements ? profile.achievements.length : 0,
        redeemedRewardsCount: profile.redeemedRewards ? profile.redeemedRewards.length : 0,
        rank: profile.rank,
    };
}

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

    const input: PointCalculationInput = {
        goalId,
        athleteId: userId,
        completionTime: new Date(),
        goalDifficulty: goal.difficulty,
        deadline: goal.deadline,
        currentStreak: profile.streaks.goals,
        trainerApproval,
        basePoints: goal.basePoints,
    };

    const result = calculatePoints(input);
    const previousLevel = calculateLevelFromXP(profile.experiencePoints).level;

    // Update profile
    profile.totalPointsEarned += result.totalPoints;
    profile.currentFitCoins += result.totalPoints;
    profile.experiencePoints += result.totalPoints;
    profile.streaks.goals += 1;
    profile.streaks.lastGoalDate = new Date();

    // Add transaction
    const transaction: IPointTransaction = {
        amount: result.totalPoints,
        type: 'earned',
        source: 'goal_completion',
        sourceId: goalId,
        description: `Completed goal: ${goal.title}`,
        createdAt: new Date(),
    };
    profile.pointTransactions.push(transaction);

    await profile.save();

    // Update goal with points awarded
    goal.pointsAwarded = result.totalPoints;
    goal.completedAt = new Date();
    await goal.save();

    const newLevel = calculateLevelFromXP(profile.experiencePoints).level;

    return {
        points: result.totalPoints,
        newBalance: profile.currentFitCoins,
        levelUp: newLevel > previousLevel,
    };
}

/**
 * Award points for completing a workout
 */
export async function awardWorkoutCompletionPoints(
    userId: string,
    workoutDurationMinutes: number,
    exerciseCount: number,
    isPlanned: boolean,
    workoutId?: string
): Promise<{ points: number; newBalance: number }> {
    await connectToDatabase();

    const profile = await getOrCreateGamificationProfile(userId);
    const points = calculateWorkoutPoints(workoutDurationMinutes, exerciseCount, isPlanned);

    // Check for streak milestone bonus
    const streakBonus = calculateStreakMilestoneBonus(profile.streaks.workout + 1);
    const totalPoints = points + streakBonus;

    // Update profile
    profile.totalPointsEarned += totalPoints;
    profile.currentFitCoins += totalPoints;
    profile.experiencePoints += totalPoints;
    profile.streaks.workout += 1;
    profile.streaks.lastWorkoutDate = new Date();

    // Add transaction
    const transaction: IPointTransaction = {
        amount: totalPoints,
        type: 'earned',
        source: 'workout_completion',
        sourceId: workoutId,
        description: `Completed workout (${workoutDurationMinutes} min, ${exerciseCount} exercises)`,
        createdAt: new Date(),
    };
    profile.pointTransactions.push(transaction);

    await profile.save();

    return {
        points: totalPoints,
        newBalance: profile.currentFitCoins,
    };
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

    // Ensure profile exists
    await getOrCreateGamificationProfile(userId);

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

    // If trainerId is provided, get only athletes of that trainer
    let userFilter = {};
    if (trainerId) {
        const { User } = await import('../../models/User');
        const athletes = await User.find({ trainerId }).select('_id name');
        const athleteIds = athletes.map(a => a._id.toString());
        userFilter = { userId: { $in: athleteIds } };
    }

    const profiles = await GamificationProfile.find(userFilter)
        .sort({ totalPointsEarned: -1 })
        .limit(limit);

    const { User } = await import('../../models/User');

    const leaderboard: LeaderboardEntry[] = [];

    for (let i = 0; i < profiles.length; i++) {
        const profile = profiles[i];
        const user = await User.findById(profile.userId).select('name');

        leaderboard.push({
            rank: i + 1,
            userId: profile.userId,
            userName: user?.name || 'Unknown',
            totalPoints: profile.totalPointsEarned,
            level: calculateLevelFromXP(profile.experiencePoints).level,
        });
    }

    return leaderboard;
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

    // Award check-in points
    const points = 10 + calculateStreakMilestoneBonus(profile.streaks.checkins + 1);

    profile.streaks.checkins += 1;
    profile.streaks.lastCheckinDate = now;
    profile.totalPointsEarned += points;
    profile.currentFitCoins += points;
    profile.experiencePoints += points;

    const transaction: IPointTransaction = {
        amount: points,
        type: 'earned',
        source: 'streak_bonus',
        description: `Daily check-in (${profile.streaks.checkins} day streak)`,
        createdAt: now,
    };
    profile.pointTransactions.push(transaction);

    await profile.save();

    return { points, streak: profile.streaks.checkins };
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
