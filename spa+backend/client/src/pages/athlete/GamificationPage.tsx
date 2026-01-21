'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
    GamificationStatsCard,
    LeaderboardCard,
    RewardsGrid,
    AchievementsGrid
} from '@/components/gamification';
import {
    useGamificationProfile,
    useLeaderboard,
    useRewards,
    useAchievements
} from '@/hooks/useGamification';
import { useSession } from '@/lib/next-auth-react';
import { Trophy, Gift, Crown, Target, RefreshCw } from 'lucide-react';

export default function GamificationPage() {
    const { data: session } = useSession();
    const { stats, isLoading: statsLoading, refreshProfile, checkin } = useGamificationProfile();
    const { leaderboard, isLoading: leaderboardLoading } = useLeaderboard(10);
    const { rewards, isLoading: rewardsLoading, redeemReward } = useRewards();
    const {
        achievements,
        isLoading: achievementsLoading,
        checkAchievements
    } = useAchievements();

    const handleCheckin = async () => {
        try {
            const result = await checkin();
            if (result.points > 0) {
                alert(`Check-in udany! Zdobyłeś ${result.points} punktów. Seria: ${result.streak} dni.`);
            } else {
                alert('Już dzisiaj się zameldowałeś!');
            }
        } catch (error) {
            alert('Błąd podczas check-inu');
        }
    };

    const handleCheckAchievements = async () => {
        try {
            const result = await checkAchievements();
            if (result.count > 0) {
                alert(`Odblokowano ${result.count} nowych osiągnięć!`);
            } else {
                alert('Brak nowych osiągnięć do odblokowania.');
            }
        } catch (error) {
            alert('Błąd podczas sprawdzania osiągnięć');
        }
    };

    return (
        <div className="container mx-auto py-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <Trophy className="h-8 w-8 text-yellow-500" />
                        Gamifikacja
                    </h1>
                    <p className="text-muted-foreground">
                        Zdobywaj punkty, odblokowuj osiągnięcia i wymieniaj nagrody
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleCheckin}>
                        <Target className="h-4 w-4 mr-2" />
                        Dzienny Check-in
                    </Button>
                    <Button variant="outline" onClick={() => refreshProfile()}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Odśwież
                    </Button>
                </div>
            </div>

            {/* Stats Card */}
            <GamificationStatsCard stats={stats} isLoading={statsLoading} />

            {/* Tabs for different sections */}
            <Tabs defaultValue="rewards" className="space-y-4">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="rewards" className="flex items-center gap-2">
                        <Gift className="h-4 w-4" />
                        Nagrody
                    </TabsTrigger>
                    <TabsTrigger value="achievements" className="flex items-center gap-2">
                        <Trophy className="h-4 w-4" />
                        Osiągnięcia
                    </TabsTrigger>
                    <TabsTrigger value="leaderboard" className="flex items-center gap-2">
                        <Crown className="h-4 w-4" />
                        Ranking
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="rewards" className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold">Dostępne Nagrody</h2>
                        <p className="text-muted-foreground">
                            Twoje FitCoins: <span className="font-bold text-yellow-600">{stats?.currentFitCoins || 0}</span>
                        </p>
                    </div>
                    <RewardsGrid
                        rewards={rewards}
                        currentBalance={stats?.currentFitCoins || 0}
                        onRedeem={redeemReward}
                        isLoading={rewardsLoading}
                    />
                </TabsContent>

                <TabsContent value="achievements" className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold">Osiągnięcia</h2>
                        <Button variant="outline" size="sm" onClick={handleCheckAchievements}>
                            Sprawdź nowe osiągnięcia
                        </Button>
                    </div>
                    <AchievementsGrid
                        achievements={achievements}
                        isLoading={achievementsLoading}
                    />
                </TabsContent>

                <TabsContent value="leaderboard" className="space-y-4">
                    <h2 className="text-xl font-semibold">Ranking Globalny</h2>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <LeaderboardCard
                            leaderboard={leaderboard}
                            isLoading={leaderboardLoading}
                            currentUserId={session?.user?.id}
                            title="Top 10 Sportowców"
                        />
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
