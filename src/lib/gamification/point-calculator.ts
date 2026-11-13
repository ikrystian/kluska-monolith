import { GoalDifficulty } from '@/models/Goal';

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
 * Punkty za trening siłowy: 20 bazowo + 5 za każde 10 min (maks. 30)
 * + 1 za każde 100 kg tonażu (maks. 200). Tonaż to główny składnik —
 * czas zostaje, żeby trening bez ciężarów nie był wart prawie nic.
 */
export function calculateWorkoutPoints(workoutDurationMinutes: number, volumeKg: number): number {
  const durationBonus = Math.min(Math.floor(Math.max(0, workoutDurationMinutes) / 10) * 5, 30);
  const volumeBonus = Math.min(Math.floor(Math.max(0, volumeKg) / 100), 200);
  return 20 + durationBonus + volumeBonus;
}

/** Tygodnie z rzędu z min. 3 aktywnymi dniami → mnożnik punktów za trening i bieg. */
export function weeklyMultiplier(weekStreak: number): number {
  if (weekStreak >= 4) return 1.5;
  if (weekStreak >= 2) return 1.25;
  if (weekStreak >= 1) return 1.1;
  return 1;
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

const STREAK_MILESTONES: [days: number, bonus: number][] = [
  [7, 50],
  [30, 200],
  [100, 500],
];

/**
 * Bonus za kamienie milowe serii przekroczone między `previous` a `next`.
 * Każdy próg płaci raz przy przejściu, a nie codziennie po jego osiągnięciu.
 */
export function streakMilestoneCrossed(previous: number, next: number): number {
  return STREAK_MILESTONES.reduce((sum, [days, bonus]) => (previous < days && next >= days ? sum + bonus : sum), 0);
}

/** Bonus wytrzymałości za długie wybieganie. */
export function runEnduranceBonus(distanceKm: number): number {
  if (distanceKm >= 21) return 50;
  if (distanceKm >= 10) return 20;
  return 0;
}

/** Punkty za bieg: 10 za każdy kilometr + bonus wytrzymałości, maksymalnie 300. */
export function calculateRunPoints(distanceKm: number): number {
  const km = Math.max(0, distanceKm);
  return Math.min(300, Math.round(km * 10) + runEnduranceBonus(km));
}
