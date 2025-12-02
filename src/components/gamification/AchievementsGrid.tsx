'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Trophy, Lock, Star, Sparkles, Crown, Gem } from 'lucide-react';
import { AchievementWithProgress } from '@/hooks/useGamification';

interface AchievementsGridProps {
  achievements: AchievementWithProgress[];
  isLoading?: boolean;
}

function getRarityIcon(rarity: string) {
  switch (rarity) {
    case 'common':
      return <Star className="h-4 w-4" />;
    case 'rare':
      return <Sparkles className="h-4 w-4" />;
    case 'epic':
      return <Crown className="h-4 w-4" />;
    case 'legendary':
      return <Gem className="h-4 w-4" />;
    default:
      return <Star className="h-4 w-4" />;
  }
}

function getRarityColor(rarity: string) {
  switch (rarity) {
    case 'common':
      return 'bg-gray-500 text-white';
    case 'rare':
      return 'bg-blue-500 text-white';
    case 'epic':
      return 'bg-purple-500 text-white';
    case 'legendary':
      return 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white';
    default:
      return 'bg-gray-500 text-white';
  }
}

function getRarityLabel(rarity: string) {
  switch (rarity) {
    case 'common':
      return 'Zwykłe';
    case 'rare':
      return 'Rzadkie';
    case 'epic':
      return 'Epickie';
    case 'legendary':
      return 'Legendarne';
    default:
      return rarity;
  }
}

function getCategoryLabel(category: string) {
  switch (category) {
    case 'consistency':
      return 'Konsekwencja';
    case 'performance':
      return 'Wydajność';
    case 'social':
      return 'Społeczność';
    case 'milestone':
      return 'Kamień milowy';
    default:
      return category;
  }
}

export function AchievementsGrid({ achievements, isLoading }: AchievementsGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-muted rounded w-3/4"></div>
            </CardHeader>
            <CardContent>
              <div className="h-4 bg-muted rounded w-full mb-2"></div>
              <div className="h-3 bg-muted rounded w-full"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (achievements.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Brak dostępnych osiągnięć</p>
        </CardContent>
      </Card>
    );
  }

  // Sort: unlocked first, then by rarity
  const sortedAchievements = [...achievements].sort((a, b) => {
    if (a.unlocked !== b.unlocked) {
      return a.unlocked ? -1 : 1;
    }
    const rarityOrder = { legendary: 0, epic: 1, rare: 2, common: 3 };
    return (rarityOrder[a.achievement.rarity as keyof typeof rarityOrder] || 4) -
           (rarityOrder[b.achievement.rarity as keyof typeof rarityOrder] || 4);
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {sortedAchievements.map(({ achievement, unlocked, progress, progressMax }) => {
        const progressPercent = progressMax > 0 ? (progress / progressMax) * 100 : 0;

        return (
          <Card
            key={achievement.id}
            className={`transition-all ${
              unlocked
                ? 'border-primary/50 bg-primary/5'
                : 'opacity-70 grayscale hover:grayscale-0 hover:opacity-100'
            }`}
          >
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  {unlocked ? (
                    <div className="p-2 bg-primary/20 rounded-full">
                      <Trophy className="h-5 w-5 text-primary" />
                    </div>
                  ) : (
                    <div className="p-2 bg-muted rounded-full">
                      <Lock className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div>
                    <CardTitle className="text-base">{achievement.name}</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {getCategoryLabel(achievement.category)}
                    </p>
                  </div>
                </div>
                <Badge className={getRarityColor(achievement.rarity)}>
                  <span className="flex items-center gap-1">
                    {getRarityIcon(achievement.rarity)}
                    {getRarityLabel(achievement.rarity)}
                  </span>
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {achievement.description}
              </p>

              {!unlocked && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>Postęp</span>
                    <span>{progress} / {progressMax}</span>
                  </div>
                  <Progress value={progressPercent} className="h-2" />
                </div>
              )}

              {achievement.pointsReward > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Nagroda:</span>
                  <span className="font-medium text-yellow-600">
                    +{achievement.pointsReward} pkt
                  </span>
                </div>
              )}

              {unlocked && (
                <div className="flex items-center gap-1 text-xs text-green-600">
                  <Trophy className="h-3 w-3" />
                  <span>Odblokowane!</span>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}