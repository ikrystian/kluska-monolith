export {
  calculatePoints,
  calculateLevelFromXP,
  calculateWorkoutPoints,
  calculateStreakMilestoneBonus,
  getDifficultyMultiplier,
  calculateTimeBonus,
  calculateStreakBonus,
  calculateApprovalBonus,
  calculateXPForLevel,
  calculateRunPoints,
  runEnduranceBonus,
  weeklyMultiplier,
  streakMilestoneCrossed,
  type PointCalculationInput,
  type PointCalculationResult,
} from './point-calculator';

export {
  getOrCreateGamificationProfile,
  grantPoints,
  getGamificationStats,
  awardGoalCompletionPoints,
  awardWorkoutCompletionPoints,
  redeemReward,
  getAvailableRewards,
  getLeaderboard,
  updateUserRanks,
  checkAndResetStreaks,
  recordCheckin,
  getPointHistory,
  type GamificationStats,
  type LeaderboardEntry,
} from './gamification-service';

export {
  checkAndAwardAchievements,
  getAchievementsWithProgress,
  getUnlockedAchievements,
  seedDefaultAchievements,
  type AchievementUnlock,
} from './achievement-checker';

export {
  syncProgress,
  onWorkoutCompleted,
  onRunLogged,
  onActivityLogged,
  getOverview,
  markAchievementsSeen,
  type RewardSummary,
  type RunRewardSummary,
  type GamificationOverview,
  type SyncResult,
} from './engine';

export { computeAthleteStats, summarizeActivity, workoutVolumeKg, type AthleteStats } from './stats';
export { CATALOG, TRACKS, buildTracks, evaluateCatalog, type TrackView } from './catalog';
export { completeGoal, listGoals, syncAutoGoals, toGoalView, rawMetricValue, currentFromRaw, GOAL_METRIC_UNITS, type GoalView } from './goals';
export { goalFraction, goalPace, isGoalReached } from './goal-progress';
export { buildQuestViews, pickWeeklyQuests, type QuestView } from './quests';
export { bestsFromLog, findNewRecords, detectPersonalRecords } from './records';
export { computeStreaks, computeWeeklyStreak, dayKey, effectiveStreak, weekStartKey } from './streaks';
