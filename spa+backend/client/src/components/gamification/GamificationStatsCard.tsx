'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Coins, Trophy, Flame, Target, TrendingUp } from 'lucide-react';
import { GamificationStats } from '@/hooks/useGamification';

interface GamificationStatsCardProps {
  stats: GamificationStats | null;
  isLoading?: boolean;
}

export function GamificationStatsCard({ stats, isLoading }: GamificationStatsCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Gamifikacja
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-8 bg-muted rounded"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return null;
  }

  const xpProgress = stats.xpForNextLevel > 0
    ? (stats.currentXP / stats.xpForNextLevel) * 100
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Gamifikacja
          </span>
          <Badge variant="secondary" className="text-lg">
            Poziom {stats.level}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* FitCoins Balance */}
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-500/20 rounded-full">
              <Coins className="h-6 w-6 text-yellow-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">FitCoins</p>
              <p className="text-2xl font-bold">{stats.currentFitCoins.toLocaleString()}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Łącznie zdobyte</p>
            <p className="text-lg font-semibold text-muted-foreground">
              {stats.totalPointsEarned.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Level Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Postęp do poziomu {stats.level + 1}</span>
            <span>{stats.currentXP} / {stats.xpForNextLevel} XP</span>
          </div>
          <Progress value={xpProgress} className="h-3" />
        </div>

        {/* Streaks */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Flame className="h-4 w-4 text-orange-500" />
              <span className="text-xl font-bold">{stats.streaks.workout}</span>
            </div>
            <p className="text-xs text-muted-foreground">Treningi</p>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Target className="h-4 w-4 text-green-500" />
              <span className="text-xl font-bold">{stats.streaks.goals}</span>
            </div>
            <p className="text-xs text-muted-foreground">Cele</p>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-center gap-1 mb-1">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              <span className="text-xl font-bold">{stats.streaks.checkins}</span>
            </div>
            <p className="text-xs text-muted-foreground">Check-iny</p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Osiągnięcia: {stats.achievementCount}</span>
          <span>Wykorzystane nagrody: {stats.redeemedRewardsCount}</span>
          {stats.rank && <span>Ranking: #{stats.rank}</span>}
        </div>
      </CardContent>
    </Card>
  );
}