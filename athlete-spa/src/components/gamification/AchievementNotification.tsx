'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trophy, X, Sparkles } from 'lucide-react';
import { haptic } from '@/lib/haptics';

export interface AchievementUnlock {
  achievementId: string;
  name: string;
  description: string;
  pointsAwarded: number;
  rarity: string;
  iconUrl?: string;
}

interface AchievementNotificationProps {
  achievement: AchievementUnlock | null;
  onClose: () => void;
}

function getRarityGradient(rarity: string) {
  switch (rarity) {
    case 'common':
      return 'bg-secondary';
    case 'rare':
      return 'bg-run';
    case 'epic':
      return 'bg-social';
    case 'legendary':
      return 'bg-food';
    default:
      return 'bg-secondary';
  }
}

export function AchievementNotification({ achievement, onClose }: AchievementNotificationProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (achievement) {
      setIsVisible(true);
      haptic('celebrate');
      // Auto-close after 5 seconds
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onClose, 300); // Wait for animation
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [achievement, onClose]);

  if (!achievement) return null;

  return (
    <div
      className={`fixed top-4 right-4 z-50 transition-all duration-300 ${
        isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full'
      }`}
    >
      <Card className={`w-80 overflow-hidden border-2 border-primary/50`}>
        <div className={`h-2 ${getRarityGradient(achievement.rarity)}`} />
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary/20 rounded-full animate-pulse">
              <Trophy className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="h-4 w-4 text-food" />
                <span className="text-sm font-medium text-food">
                  Nowe Osiągnięcie!
                </span>
              </div>
              <h4 className="font-bold">{achievement.name}</h4>
              <p className="text-sm text-muted-foreground">
                {achievement.description}
              </p>
              {achievement.pointsAwarded > 0 && (
                <p className="text-sm font-medium text-volt mt-1">
                  +{achievement.pointsAwarded} punktów
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => {
                setIsVisible(false);
                setTimeout(onClose, 300);
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Hook to manage achievement notifications
export function useAchievementNotifications() {
  const [notifications, setNotifications] = useState<AchievementUnlock[]>([]);
  const [currentNotification, setCurrentNotification] = useState<AchievementUnlock | null>(null);

  const addNotifications = (achievements: AchievementUnlock[]) => {
    setNotifications((prev) => [...prev, ...achievements]);
  };

  useEffect(() => {
    if (!currentNotification && notifications.length > 0) {
      setCurrentNotification(notifications[0]);
      setNotifications((prev) => prev.slice(1));
    }
  }, [currentNotification, notifications]);

  const dismissCurrent = () => {
    setCurrentNotification(null);
  };

  return {
    currentNotification,
    addNotifications,
    dismissCurrent,
  };
}