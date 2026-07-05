'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Crown, Medal, Award } from 'lucide-react';
import { LeaderboardEntry } from '@/hooks/useGamification';

interface LeaderboardCardProps {
  leaderboard: LeaderboardEntry[];
  isLoading?: boolean;
  currentUserId?: string;
  title?: string;
}

function getRankIcon(rank: number) {
  switch (rank) {
    case 1:
      return <Crown className="h-5 w-5 text-yellow-500" />;
    case 2:
      return <Medal className="h-5 w-5 text-gray-400" />;
    case 3:
      return <Award className="h-5 w-5 text-amber-600" />;
    default:
      return null;
  }
}

function getRankBadgeVariant(rank: number): 'default' | 'secondary' | 'outline' {
  if (rank <= 3) return 'default';
  if (rank <= 10) return 'secondary';
  return 'outline';
}

export function LeaderboardCard({
  leaderboard,
  isLoading,
  currentUserId,
  title = 'Ranking'
}: LeaderboardCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-8 w-8 bg-muted rounded-full"></div>
                <div className="flex-1 h-4 bg-muted rounded"></div>
                <div className="h-6 w-16 bg-muted rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (leaderboard.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-4">
            Brak danych w rankingu
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Crown className="h-5 w-5 text-yellow-500" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {leaderboard.map((entry) => {
            const isCurrentUser = entry.userId === currentUserId;
            const rankIcon = getRankIcon(entry.rank);

            return (
              <div
                key={entry.userId}
                className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                  isCurrentUser ? 'bg-primary/10 border border-primary/20' : 'hover:bg-muted/50'
                }`}
              >
                {/* Rank */}
                <div className="w-8 flex justify-center">
                  {rankIcon || (
                    <span className="text-sm font-medium text-muted-foreground">
                      #{entry.rank}
                    </span>
                  )}
                </div>

                {/* Avatar */}
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs">
                    {entry.userName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                {/* Name & Level */}
                <div className="flex-1 min-w-0">
                  <p className={`font-medium truncate ${isCurrentUser ? 'text-primary' : ''}`}>
                    {entry.userName}
                    {isCurrentUser && <span className="text-xs ml-1">(Ty)</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Poziom {entry.level}
                  </p>
                </div>

                {/* Points */}
                <Badge variant={getRankBadgeVariant(entry.rank)}>
                  {entry.totalPoints.toLocaleString()} pkt
                </Badge>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}