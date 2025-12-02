'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { LeaderboardCard } from '@/components/gamification';
import { useLeaderboard, useAdminRewards, Reward } from '@/hooks/useGamification';
import { useSession } from 'next-auth/react';
import { Trophy, Gift, Crown, Plus, Edit, Trash2, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function TrainerGamificationPage() {
  const { data: session } = useSession();
  const trainerId = session?.user?.id;

  const { leaderboard: globalLeaderboard, isLoading: globalLoading } = useLeaderboard(10);
  const { leaderboard: myAthletesLeaderboard, isLoading: myAthletesLoading } = useLeaderboard(10, trainerId);
  const {
    rewards,
    isLoading: rewardsLoading,
    createReward,
    updateReward,
    deleteReward
  } = useAdminRewards();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingReward, setEditingReward] = useState<Reward | null>(null);
  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    category: 'digital' | 'physical' | 'experience';
    fitCoinCost: number;
    tier: 'bronze' | 'silver' | 'gold' | 'platinum';
    availability: 'always' | 'limited' | 'seasonal';
  }>({
    title: '',
    description: '',
    category: 'digital',
    fitCoinCost: 100,
    tier: 'bronze',
    availability: 'always',
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      category: 'digital',
      fitCoinCost: 100,
      tier: 'bronze',
      availability: 'always',
    });
  };

  const handleCreateReward = async () => {
    try {
      await createReward(formData);
      setIsCreateDialogOpen(false);
      resetForm();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Błąd podczas tworzenia nagrody');
    }
  };

  const handleUpdateReward = async () => {
    if (!editingReward) return;
    try {
      await updateReward(editingReward.id, formData);
      setEditingReward(null);
      resetForm();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Błąd podczas aktualizacji nagrody');
    }
  };

  const handleDeleteReward = async (rewardId: string) => {
    if (!confirm('Czy na pewno chcesz usunąć tę nagrodę?')) return;
    try {
      await deleteReward(rewardId);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Błąd podczas usuwania nagrody');
    }
  };

  const openEditDialog = (reward: Reward) => {
    setFormData({
      title: reward.title,
      description: reward.description,
      category: reward.category,
      fitCoinCost: reward.fitCoinCost,
      tier: reward.tier,
      availability: reward.availability,
    });
    setEditingReward(reward);
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'bronze': return 'bg-amber-700';
      case 'silver': return 'bg-gray-400';
      case 'gold': return 'bg-yellow-500';
      case 'platinum': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Trophy className="h-8 w-8 text-yellow-500" />
            Zarządzanie Gamifikacją
          </h1>
          <p className="text-muted-foreground">
            Zarządzaj nagrodami i śledź postępy swoich sportowców
          </p>
        </div>
      </div>

      <Tabs defaultValue="athletes" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="athletes" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Moi Sportowcy
          </TabsTrigger>
          <TabsTrigger value="rewards" className="flex items-center gap-2">
            <Gift className="h-4 w-4" />
            Nagrody
          </TabsTrigger>
          <TabsTrigger value="leaderboard" className="flex items-center gap-2">
            <Crown className="h-4 w-4" />
            Ranking Globalny
          </TabsTrigger>
        </TabsList>

        <TabsContent value="athletes" className="space-y-4">
          <h2 className="text-xl font-semibold">Ranking Moich Sportowców</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <LeaderboardCard
              leaderboard={myAthletesLeaderboard}
              isLoading={myAthletesLoading}
              title="Moi Sportowcy"
            />
          </div>
        </TabsContent>

        <TabsContent value="rewards" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Zarządzanie Nagrodami</h2>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <Plus className="h-4 w-4 mr-2" />
                  Dodaj Nagrodę
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nowa Nagroda</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Tytuł</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Opis</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Kategoria</Label>
                      <Select
                        value={formData.category}
                        onValueChange={(value: any) => setFormData({ ...formData, category: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="digital">Cyfrowa</SelectItem>
                          <SelectItem value="physical">Fizyczna</SelectItem>
                          <SelectItem value="experience">Doświadczenie</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Tier</Label>
                      <Select
                        value={formData.tier}
                        onValueChange={(value: any) => setFormData({ ...formData, tier: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bronze">Brązowy</SelectItem>
                          <SelectItem value="silver">Srebrny</SelectItem>
                          <SelectItem value="gold">Złoty</SelectItem>
                          <SelectItem value="platinum">Platynowy</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cost">Koszt (FitCoins)</Label>
                    <Input
                      id="cost"
                      type="number"
                      min="1"
                      value={formData.fitCoinCost}
                      onChange={(e) => setFormData({ ...formData, fitCoinCost: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Anuluj
                  </Button>
                  <Button onClick={handleCreateReward}>
                    Utwórz
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Rewards List */}
          {rewardsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-6 bg-muted rounded w-3/4"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-4 bg-muted rounded w-full"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : rewards.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Gift className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Brak nagród. Dodaj pierwszą nagrodę!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rewards.map((reward) => (
                <Card key={reward.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg">{reward.title}</CardTitle>
                      <Badge className={getTierColor(reward.tier)}>
                        {reward.tier}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {reward.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{reward.fitCoinCost} FitCoins</span>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(reward)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteReward(reward.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Edit Dialog */}
          <Dialog open={!!editingReward} onOpenChange={() => setEditingReward(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edytuj Nagrodę</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-title">Tytuł</Label>
                  <Input
                    id="edit-title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-description">Opis</Label>
                  <Textarea
                    id="edit-description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Kategoria</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value: any) => setFormData({ ...formData, category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="digital">Cyfrowa</SelectItem>
                        <SelectItem value="physical">Fizyczna</SelectItem>
                        <SelectItem value="experience">Doświadczenie</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Tier</Label>
                    <Select
                      value={formData.tier}
                      onValueChange={(value: any) => setFormData({ ...formData, tier: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bronze">Brązowy</SelectItem>
                        <SelectItem value="silver">Srebrny</SelectItem>
                        <SelectItem value="gold">Złoty</SelectItem>
                        <SelectItem value="platinum">Platynowy</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-cost">Koszt (FitCoins)</Label>
                  <Input
                    id="edit-cost"
                    type="number"
                    min="1"
                    value={formData.fitCoinCost}
                    onChange={(e) => setFormData({ ...formData, fitCoinCost: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditingReward(null)}>
                  Anuluj
                </Button>
                <Button onClick={handleUpdateReward}>
                  Zapisz
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="leaderboard" className="space-y-4">
          <h2 className="text-xl font-semibold">Ranking Globalny</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <LeaderboardCard
              leaderboard={globalLeaderboard}
              isLoading={globalLoading}
              title="Top 10 Sportowców"
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}