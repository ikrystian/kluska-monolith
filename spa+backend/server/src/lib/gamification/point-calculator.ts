import { GoalDifficulty } from '../../models/Goal';

export interface PointCalculationInput {
    goalId: string;
    athleteId: string;
    completionTime: Date;
    goalDifficulty: GoalDifficulty;
    deadline?: Date;
    currentStreak: number;
    trainerApproval: boolean;
    basePoints: number;
}

export interface PointCalculationResult {
    totalPoints: number;
    breakdown: {
        basePoints: number;
        difficultyBonus: number;
        timeBonus: number;
        streakBonus: number;
        approvalBonus: number;
    };
}

const DIFFICULTY_MULTIPLIERS: Record<GoalDifficulty, number> = {
    easy: 1.0,
    medium: 1.5,
    hard: 2.0,
    expert: 3.0,
};

const TIME_BONUS_POINTS = 50;
const STREAK_BONUS_PER_GOAL = 10;
const TRAINER_APPROVAL_BONUS = 25;

/**
 * Get the difficulty multiplier for a given difficulty level
 */
export function getDifficultyMultiplier(difficulty: GoalDifficulty): number {
    return DIFFICULTY_MULTIPLIERS[difficulty] || 1.0;
}

/**
 * Calculate time bonus if goal was completed before deadline
 */
export function calculateTimeBonus(completionTime: Date, deadline?: Date): number {
    if (!deadline) return 0;

    const completedBeforeDeadline = completionTime < deadline;
    return completedBeforeDeadline ? TIME_BONUS_POINTS : 0;
}

/**
 * Calculate streak bonus based on consecutive goal completions
 */
export function calculateStreakBonus(currentStreak: number): number {
    return currentStreak * STREAK_BONUS_PER_GOAL;
}

/**
 * Calculate trainer approval bonus
 */
export function calculateApprovalBonus(trainerApproval: boolean): number {
    return trainerApproval ? TRAINER_APPROVAL_BONUS : 0;
}

/**
 * Calculate total points for completing a goal
 */
export function calculatePoints(input: PointCalculationInput): PointCalculationResult {
    const basePoints = input.basePoints || 100;
    const difficultyMultiplier = getDifficultyMultiplier(input.goalDifficulty);
    const difficultyBonus = Math.round(basePoints * (difficultyMultiplier - 1));
    const timeBonus = calculateTimeBonus(input.completionTime, input.deadline);
    const streakBonus = calculateStreakBonus(input.currentStreak);
    const approvalBonus = calculateApprovalBonus(input.trainerApproval);

    const totalPoints = Math.round(
        basePoints + difficultyBonus + timeBonus + streakBonus + approvalBonus
    );

    return {
        totalPoints,
        breakdown: {
            basePoints,
            difficultyBonus,
            timeBonus,
            streakBonus,
            approvalBonus,
        },
    };
}

/**
 * Calculate experience points needed for next level
 */
export function calculateXPForLevel(level: number): number {
    // Exponential growth: each level requires more XP
    return Math.floor(100 * Math.pow(1.5, level - 1));
}

/**
 * Calculate current level based on total experience points
 */
export function calculateLevelFromXP(totalXP: number): { level: number; currentXP: number; xpForNextLevel: number } {
    let level = 1;
    let remainingXP = totalXP;

    while (remainingXP >= calculateXPForLevel(level)) {
        remainingXP -= calculateXPForLevel(level);
        level++;
    }

    return {
        level,
        currentXP: remainingXP,
        xpForNextLevel: calculateXPForLevel(level),
    };
}

/**
 * Calculate workout completion points
 */
export function calculateWorkoutPoints(
    workoutDurationMinutes: number,
    exerciseCount: number,
    isPlanned: boolean
): number {
    const basePoints = 50;
    const durationBonus = Math.min(Math.floor(workoutDurationMinutes / 10) * 5, 50); // Max 50 points
    const exerciseBonus = Math.min(exerciseCount * 5, 30); // Max 30 points
    const plannedBonus = isPlanned ? 20 : 0;

    return basePoints + durationBonus + exerciseBonus + plannedBonus;
}

/**
 * Calculate streak maintenance bonus
 */
export function calculateStreakMilestoneBonus(streakDays: number): number {
    if (streakDays >= 100) return 500;
    if (streakDays >= 30) return 200;
    if (streakDays >= 7) return 50;
    return 0;
}
