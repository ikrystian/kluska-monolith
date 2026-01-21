import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/api/client';

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
            const response = await apiClient.get('/api/gamification/profile');
            setStats(response.data);
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
        const response = await apiClient.post('/api/gamification/profile', { action: 'checkin' });
        fetchProfile();
        return response.data;
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
                const params = new URLSearchParams({ limit: String(limit) });
                if (trainerId) params.append('trainerId', trainerId);
                const response = await apiClient.get(`/api/gamification/leaderboard?${params}`);
                setLeaderboard(response.data);
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
            const response = await apiClient.get('/api/gamification/rewards');
            setRewards(response.data);
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
        const response = await apiClient.post('/api/gamification/rewards', { rewardId });
        fetchRewards();
        return response.data;
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
            const response = await apiClient.get(url);
            setAchievements(response.data);
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
        const response = await apiClient.post('/api/gamification/achievements');
        fetchAchievements();
        return response.data;
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
            const response = await apiClient.post(`/api/gamification/goals/${goalId}/complete`, { trainerApproval });

            if (onSuccess) {
                onSuccess();
            }

            return response.data;
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
