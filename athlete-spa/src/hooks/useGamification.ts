'use client';

import useSWR from 'swr';
import { apiFetch } from '@/lib/api-client';
import { jsonFetcher } from '@/lib/db-hooks';
import { useState, useEffect, useCallback } from 'react';

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
  const { data, error, isLoading, mutate } = useSWR<GamificationStats>('/api/gamification/profile', jsonFetcher);
  const stats = data ?? null;
  const fetchProfile = useCallback(async () => { await mutate(); }, [mutate]);

  const checkin = useCallback(async () => {
    const response = await apiFetch('/api/gamification/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'checkin' }),
    });

    if (!response.ok) {
      throw new Error('Failed to check in');
    }

    // apiFetch already revalidated every cached read after this write.
    return response.json();
  }, []);

  return {
    stats,
    isLoading,
    error: error instanceof Error ? error : null,
    refreshProfile: fetchProfile,
    checkin,
  };
}

export function useLeaderboard(limit: number = 10, trainerId?: string) {
  const url = trainerId
    ? `/api/gamification/leaderboard?limit=${limit}&trainerId=${trainerId}`
    : `/api/gamification/leaderboard?limit=${limit}`;
  const { data, error, isLoading } = useSWR<LeaderboardEntry[]>(url, jsonFetcher);
  const leaderboard = data ?? [];

  return {
    leaderboard,
    isLoading,
    error: error instanceof Error ? error : null,
  };
}

export function useRewards() {
  const { data, error, isLoading, mutate } = useSWR<Reward[]>('/api/gamification/rewards', jsonFetcher);
  const rewards = data ?? [];
  const fetchRewards = useCallback(async () => { await mutate(); }, [mutate]);

  const redeemReward = useCallback(async (rewardId: string) => {
    const response = await apiFetch('/api/gamification/rewards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rewardId }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to redeem reward');
    }

    return response.json();
  }, []);

  return {
    rewards,
    isLoading,
    error: error instanceof Error ? error : null,
    redeemReward,
    refreshRewards: fetchRewards,
  };
}

export function useAchievements(unlockedOnly: boolean = false) {
  const url = unlockedOnly
    ? '/api/gamification/achievements?unlocked=true'
    : '/api/gamification/achievements';
  const { data, error, isLoading, mutate } = useSWR<AchievementWithProgress[]>(url, jsonFetcher);
  const achievements = data ?? [];
  const fetchAchievements = useCallback(async () => { await mutate(); }, [mutate]);

  const checkAchievements = useCallback(async () => {
    const response = await apiFetch('/api/gamification/achievements', {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error('Failed to check achievements');
    }

    return response.json();
  }, []);

  return {
    achievements,
    isLoading,
    error: error instanceof Error ? error : null,
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
      const response = await apiFetch(`/api/gamification/goals/${goalId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trainerApproval }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to complete goal');
      }

      const result = await response.json();

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

// Admin hooks for trainers
export function useAdminRewards() {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchRewards = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await apiFetch('/api/gamification/admin/rewards');
      if (!response.ok) throw new Error('Failed to fetch rewards');
      const data = await response.json();
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
    const response = await apiFetch('/api/gamification/admin/rewards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rewardData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create reward');
    }

    const result = await response.json();
    fetchRewards();
    return result;
  }, [fetchRewards]);

  const updateReward = useCallback(async (rewardId: string, rewardData: Partial<Reward>) => {
    const response = await apiFetch(`/api/gamification/admin/rewards/${rewardId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rewardData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to update reward');
    }

    const result = await response.json();
    fetchRewards();
    return result;
  }, [fetchRewards]);

  const deleteReward = useCallback(async (rewardId: string) => {
    const response = await apiFetch(`/api/gamification/admin/rewards/${rewardId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to delete reward');
    }

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