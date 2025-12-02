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
  type PointCalculationInput,
  type PointCalculationResult,
} from './point-calculator';

export {
  getOrCreateGamificationProfile,
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