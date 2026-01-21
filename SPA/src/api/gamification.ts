import { apiClient } from './client';

export interface GamificationProfile {
  id: string;
  odznaki: string[];
  punkty: number;
  poziom: number;
  streak: number;
  lastActivityDate?: string;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  points: number;
  unlockedAt?: string;
  progress?: number;
  maxProgress?: number;
}

export interface LeaderboardEntry {
  userId: string;
  userName: string;
  userAvatar?: string;
  points: number;
  level: number;
  rank: number;
}

export interface Reward {
  id: string;
  name: string;
  description: string;
  cost: number;
  icon: string;
  claimed?: boolean;
  claimedAt?: string;
}

/**
 * Fetch user's gamification profile
 */
export async function getGamificationProfile(): Promise<GamificationProfile> {
  const response = await apiClient.get('/api/gamification/profile');
  return response.data;
}

/**
 * Fetch user's achievements
 */
export async function getAchievements(): Promise<Achievement[]> {
  const response = await apiClient.get('/api/gamification/achievements');
  return response.data;
}

/**
 * Fetch leaderboard
 */
export async function getLeaderboard(limit = 10): Promise<LeaderboardEntry[]> {
  const response = await apiClient.get('/api/gamification/leaderboard', {
    params: { limit },
  });
  return response.data;
}

/**
 * Fetch available rewards
 */
export async function getRewards(): Promise<Reward[]> {
  const response = await apiClient.get('/api/gamification/rewards');
  return response.data;
}

/**
 * Claim a reward
 */
export async function claimReward(rewardId: string): Promise<{ success: boolean; message: string }> {
  const response = await apiClient.post(`/api/gamification/rewards/${rewardId}/claim`);
  return response.data;
}

/**
 * Log activity for gamification points
 */
export async function logActivity(activityType: string, metadata?: Record<string, unknown>): Promise<{
  pointsEarned: number;
  newAchievements: Achievement[];
}> {
  const response = await apiClient.post('/api/gamification/activity', {
    type: activityType,
    metadata,
  });
  return response.data;
}
