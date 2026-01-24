'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';

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

export interface Reward {
  id: string;
  title: string;
  description: string;
  category: 'digital' | 'physical' | 'experience';
  fitCoinCost: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  availability: 'always' | 'limited' | 'seasonal';
  imageUrl?: string;
  isActive: boolean;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  iconUrl?: string;
  category: string;
  pointsReward: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface AchievementWithProgress {
  achievement: Achievement;
  unlocked: boolean;
  unlockedAt?: string;
  progress: number;
  progressMax: number;
}

export function useGamificationProfile() {
  const [stats, setStats] = useState<GamificationStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchProfile = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await api.request<GamificationStats>('/api/gamification/profile');
      setStats(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const checkin = useCallback(async () => {
    const result = await api.request('/api/gamification/profile', {
      method: 'POST',
      body: JSON.stringify({ action: 'checkin' }),
    });

    fetchProfile();
    return result;
  }, [fetchProfile]);

  return {
    stats,
    isLoading,
    error,
    refreshProfile: fetchProfile,
    checkin,
  };
}

export function useLeaderboard(limit: number = 10, trainerId?: string) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setIsLoading(true);
        const url = trainerId
          ? `/api/gamification/leaderboard?limit=${limit}&trainerId=${trainerId}`
          : `/api/gamification/leaderboard?limit=${limit}`;

        const data = await api.request<LeaderboardEntry[]>(url);
        setLeaderboard(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeaderboard();
  }, [limit, trainerId]);

  return {
    leaderboard,
    isLoading,
    error,
  };
}

export function useRewards() {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchRewards = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await api.request<Reward[]>('/api/gamification/rewards');
      setRewards(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRewards();
  }, [fetchRewards]);

  const redeemReward = useCallback(async (rewardId: string) => {
    const result = await api.request('/api/gamification/rewards', {
      method: 'POST',
      body: JSON.stringify({ rewardId }),
    });

    fetchRewards();
    return result;
  }, [fetchRewards]);

  return {
    rewards,
    isLoading,
    error,
    redeemReward,
    refreshRewards: fetchRewards,
  };
}

export function useAchievements(unlockedOnly: boolean = false) {
  const [achievements, setAchievements] = useState<AchievementWithProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAchievements = useCallback(async () => {
    try {
      setIsLoading(true);
      const url = unlockedOnly
        ? '/api/gamification/achievements?unlocked=true'
        : '/api/gamification/achievements';

      const data = await api.request<AchievementWithProgress[]>(url);
      setAchievements(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [unlockedOnly]);

  useEffect(() => {
    fetchAchievements();
  }, [fetchAchievements]);

  const checkAchievements = useCallback(async () => {
    const result = await api.request('/api/gamification/achievements', {
      method: 'POST',
    });

    fetchAchievements();
    return result;
  }, [fetchAchievements]);

  return {
    achievements,
    isLoading,
    error,
    checkAchievements,
    refreshAchievements: fetchAchievements,
  };
}

export function useCompleteGoal(onSuccess?: () => void) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const completeGoal = useCallback(async (goalId: string, trainerApproval: boolean = false) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await api.request(`/api/gamification/goals/${goalId}/complete`, {
        method: 'POST',
        body: JSON.stringify({ trainerApproval }),
      });

      // Call success callback to refresh data
      if (onSuccess) {
        onSuccess();
      }

      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [onSuccess]);

  return {
    completeGoal,
    isLoading,
    error,
  };
}

export interface PointTransaction {
  amount: number;
  type: 'earned' | 'spent' | 'bonus';
  source: string;
  sourceId?: string;
  description: string;
  createdAt: string;
}

export function usePointHistory(limit: number = 50) {
  const [history, setHistory] = useState<PointTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchHistory = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await api.request<PointTransaction[]>(`/api/gamification/history?limit=${limit}`);
      setHistory(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return {
    history,
    isLoading,
    error,
    refreshHistory: fetchHistory,
  };
}

// Admin hooks for trainers
export function useAdminRewards() {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchRewards = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await api.request<Reward[]>('/api/gamification/admin/rewards');
      setRewards(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRewards();
  }, [fetchRewards]);

  const createReward = useCallback(async (rewardData: Partial<Reward>) => {
    const result = await api.request('/api/gamification/admin/rewards', {
      method: 'POST',
      body: JSON.stringify(rewardData),
    });

    fetchRewards();
    return result;
  }, [fetchRewards]);

  const updateReward = useCallback(async (rewardId: string, rewardData: Partial<Reward>) => {
    const result = await api.request(`/api/gamification/admin/rewards/${rewardId}`, {
      method: 'PUT',
      body: JSON.stringify(rewardData),
    });

    fetchRewards();
    return result;
  }, [fetchRewards]);

  const deleteReward = useCallback(async (rewardId: string) => {
    await api.request(`/api/gamification/admin/rewards/${rewardId}`, {
      method: 'DELETE',
    });

    fetchRewards();
  }, [fetchRewards]);

  return {
    rewards,
    isLoading,
    error,
    createReward,
    updateReward,
    deleteReward,
    refreshRewards: fetchRewards,
  };
}