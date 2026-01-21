'use client';

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
  const [stats, setStats] = useState<GamificationStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchProfile = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/gamification/profile');
      if (!response.ok) throw new Error('Failed to fetch profile');
      const data = await response.json();
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
    const response = await fetch('/api/gamification/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'checkin' }),
    });

    if (!response.ok) {
      throw new Error('Failed to check in');
    }

    const result = await response.json();
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
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch leaderboard');
        const data = await response.json();
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
      const response = await fetch('/api/gamification/rewards');
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

  const redeemReward = useCallback(async (rewardId: string) => {
    const response = await fetch('/api/gamification/rewards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rewardId }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to redeem reward');
    }

    const result = await response.json();
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
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch achievements');
      const data = await response.json();
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
    const response = await fetch('/api/gamification/achievements', {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error('Failed to check achievements');
    }

    const result = await response.json();
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
      const response = await fetch(`/api/gamification/goals/${goalId}/complete`, {
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
      const response = await fetch('/api/gamification/admin/rewards');
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
    const response = await fetch('/api/gamification/admin/rewards', {
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
    const response = await fetch(`/api/gamification/admin/rewards/${rewardId}`, {
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
    const response = await fetch(`/api/gamification/admin/rewards/${rewardId}`, {
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