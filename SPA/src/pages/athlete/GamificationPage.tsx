import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
// import { useCollection } from '@/hooks/useCollection';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
// import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  Trophy,
  Gift,
  Crown,
  Target,
  Flame,
  Star,
  Medal,
  Zap,
  Award,
  Lock,
} from 'lucide-react';

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  points: number;
  unlocked: boolean;
  unlockedAt?: string;
  category: string;
}

interface UserStats {
  id: string;
  userId: string;
  totalPoints: number;
  currentLevel: number;
  streak: number;
  workoutsCompleted: number;
  achievementsUnlocked: number;
}

const MOCK_ACHIEVEMENTS: Achievement[] = [
  { id: '1', name: 'Pierwszy trening', description: 'Ukończ swój pierwszy trening', icon: 'trophy', points: 50, unlocked: true, unlockedAt: '2024-01-15', category: 'Podstawy' },
  { id: '2', name: 'Seria 7 dni', description: 'Ćwicz przez 7 dni z rzędu', icon: 'flame', points: 100, unlocked: true, unlockedAt: '2024-01-20', category: 'Regularność' },
  { id: '3', name: 'Seria 30 dni', description: 'Ćwicz przez 30 dni z rzędu', icon: 'flame', points: 500, unlocked: false, category: 'Regularność' },
  { id: '4', name: 'Siłacz', description: 'Podnieś łącznie 10,000 kg', icon: 'medal', points: 200, unlocked: true, unlockedAt: '2024-02-01', category: 'Siła' },
  { id: '5', name: 'Maratończyk', description: 'Spędź 100 godzin na treningach', icon: 'star', points: 300, unlocked: false, category: 'Czas' },
  { id: '6', name: 'Ekspert', description: 'Wykonaj 50 różnych ćwiczeń', icon: 'award', points: 250, unlocked: false, category: 'Różnorodność' },
];

const LEVEL_THRESHOLDS = [0, 100, 250, 500, 1000, 2000, 5000, 10000];

export default function GamificationPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('achievements');

  // In a real app, fetch user gamification stats
  const mockStats: UserStats = {
    id: '1',
    userId: user?.id || '',
    totalPoints: 850,
    currentLevel: 4,
    streak: 12,
    workoutsCompleted: 47,
    achievementsUnlocked: 3,
  };

  const pointsToNextLevel = LEVEL_THRESHOLDS[mockStats.currentLevel] - LEVEL_THRESHOLDS[mockStats.currentLevel - 1];
  const pointsProgress = mockStats.totalPoints - LEVEL_THRESHOLDS[mockStats.currentLevel - 1];
  const progressPercent = (pointsProgress / pointsToNextLevel) * 100;

  const handleCheckin = () => {
    toast.success('Check-in udany! +10 punktów');
  };

  const getAchievementIcon = (icon: string) => {
    switch (icon) {
      case 'trophy': return <Trophy className="h-6 w-6" />;
      case 'flame': return <Flame className="h-6 w-6" />;
      case 'medal': return <Medal className="h-6 w-6" />;
      case 'star': return <Star className="h-6 w-6" />;
      case 'award': return <Award className="h-6 w-6" />;
      default: return <Trophy className="h-6 w-6" />;
    }
  };

  const unlockedCount = MOCK_ACHIEVEMENTS.filter(a => a.unlocked).length;

  return (
    <div className="container mx-auto p-4 md:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-headline text-3xl font-bold flex items-center gap-2">
            <Trophy className="h-8 w-8 text-yellow-500" />
            Gamifikacja
          </h1>
          <p className="text-muted-foreground mt-1">
            Zdobywaj punkty, odblokowuj osiągnięcia i wymieniaj nagrody
          </p>
        </div>
        <Button onClick={handleCheckin}>
          <Target className="mr-2 h-4 w-4" />
          Dzienny Check-in
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-yellow-500/10">
                <Star className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{mockStats.totalPoints}</p>
                <p className="text-xs text-muted-foreground">Punkty</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-purple-500/10">
                <Zap className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">Poziom {mockStats.currentLevel}</p>
                <p className="text-xs text-muted-foreground">Aktualny</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-orange-500/10">
                <Flame className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{mockStats.streak} dni</p>
                <p className="text-xs text-muted-foreground">Seria</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-green-500/10">
                <Trophy className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{unlockedCount}/{MOCK_ACHIEVEMENTS.length}</p>
                <p className="text-xs text-muted-foreground">Osiągnięcia</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Level Progress */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Poziom {mockStats.currentLevel}</span>
            <span className="text-sm text-muted-foreground">
              {pointsProgress} / {pointsToNextLevel} pkt do poziomu {mockStats.currentLevel + 1}
            </span>
          </div>
          <Progress value={progressPercent} className="h-3" />
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="achievements" className="flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            <span className="hidden sm:inline">Osiągnięcia</span>
          </TabsTrigger>
          <TabsTrigger value="rewards" className="flex items-center gap-2">
            <Gift className="h-4 w-4" />
            <span className="hidden sm:inline">Nagrody</span>
          </TabsTrigger>
          <TabsTrigger value="leaderboard" className="flex items-center gap-2">
            <Crown className="h-4 w-4" />
            <span className="hidden sm:inline">Ranking</span>
          </TabsTrigger>
        </TabsList>

        {/* Achievements Tab */}
        <TabsContent value="achievements">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {MOCK_ACHIEVEMENTS.map(achievement => (
              <Card key={achievement.id} className={!achievement.unlocked ? 'opacity-60' : ''}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-full ${achievement.unlocked ? 'bg-yellow-500/20 text-yellow-500' : 'bg-muted text-muted-foreground'}`}>
                      {achievement.unlocked ? getAchievementIcon(achievement.icon) : <Lock className="h-6 w-6" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{achievement.name}</h3>
                        {achievement.unlocked && (
                          <Badge variant="secondary" className="text-xs">+{achievement.points}</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{achievement.description}</p>
                      {achievement.unlocked && achievement.unlockedAt && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Odblokowano: {new Date(achievement.unlockedAt).toLocaleDateString('pl-PL')}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Rewards Tab */}
        <TabsContent value="rewards">
          <Card className="text-center py-12">
            <CardContent>
              <Gift className="mx-auto h-16 w-16 text-muted-foreground/30 mb-4" />
              <h3 className="font-headline text-xl font-semibold mb-2">Wkrótce dostępne</h3>
              <p className="text-muted-foreground">
                System nagród jest w trakcie przygotowania. Zbieraj punkty już teraz!
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Leaderboard Tab */}
        <TabsContent value="leaderboard">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-yellow-500" />
                Top 10 Sportowców
              </CardTitle>
              <CardDescription>Ranking globalny według punktów</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { rank: 1, name: 'Jan K.', points: 5420, avatar: '🥇' },
                  { rank: 2, name: 'Anna M.', points: 4890, avatar: '🥈' },
                  { rank: 3, name: 'Piotr W.', points: 4350, avatar: '🥉' },
                  { rank: 4, name: 'Ty', points: mockStats.totalPoints, avatar: '👤', isCurrentUser: true },
                  { rank: 5, name: 'Karolina Z.', points: 780, avatar: '5️⃣' },
                ].map(entry => (
                  <div
                    key={entry.rank}
                    className={`flex items-center justify-between p-3 rounded-lg ${entry.isCurrentUser ? 'bg-primary/10 border border-primary' : 'bg-secondary/50'}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{entry.avatar}</span>
                      <div>
                        <p className={`font-medium ${entry.isCurrentUser ? 'text-primary' : ''}`}>
                          {entry.name}
                        </p>
                        <p className="text-xs text-muted-foreground">#{entry.rank}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{entry.points.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">punktów</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
