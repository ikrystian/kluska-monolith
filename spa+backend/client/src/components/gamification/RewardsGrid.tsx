'use client';

import { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Gift, Coins, ShoppingBag, Sparkles, Star, CheckCircle, XCircle } from 'lucide-react';
import { Reward } from '@/hooks/useGamification';

interface RewardsGridProps {
  rewards: Reward[];
  currentBalance: number;
  onRedeem: (rewardId: string) => Promise<any>;
  isLoading?: boolean;
}

function getTierColor(tier: string) {
  switch (tier) {
    case 'bronze':
      return 'bg-amber-700 text-white';
    case 'silver':
      return 'bg-gray-400 text-white';
    case 'gold':
      return 'bg-yellow-500 text-white';
    case 'platinum':
      return 'bg-gradient-to-r from-purple-500 to-pink-500 text-white';
    default:
      return 'bg-muted';
  }
}

function getCategoryIcon(category: string) {
  switch (category) {
    case 'digital':
      return <Sparkles className="h-4 w-4" />;
    case 'physical':
      return <ShoppingBag className="h-4 w-4" />;
    case 'experience':
      return <Star className="h-4 w-4" />;
    default:
      return <Gift className="h-4 w-4" />;
  }
}

function getCategoryLabel(category: string) {
  switch (category) {
    case 'digital':
      return 'Cyfrowa';
    case 'physical':
      return 'Fizyczna';
    case 'experience':
      return 'Doświadczenie';
    default:
      return category;
  }
}

export function RewardsGrid({
  rewards,
  currentBalance,
  onRedeem,
  isLoading
}: RewardsGridProps) {
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleRedeem = async () => {
    if (!selectedReward) return;

    setIsRedeeming(true);
    setMessage(null);
    try {
      await onRedeem(selectedReward.id);
      setMessage({ type: 'success', text: `Pomyślnie odebrałeś: ${selectedReward.title}` });
      setSelectedReward(null);
      // Clear message after 3 seconds
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Nie udało się odebrać nagrody'
      });
    } finally {
      setIsRedeeming(false);
    }
  };

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
              <div className="h-4 bg-muted rounded w-2/3"></div>
            </CardContent>
            <CardFooter>
              <div className="h-10 bg-muted rounded w-full"></div>
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  }

  if (rewards.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Gift className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Brak dostępnych nagród</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* Status Message */}
      {message && (
        <Alert variant={message.type === 'error' ? 'destructive' : 'default'} className="mb-4">
          {message.type === 'success' ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <XCircle className="h-4 w-4" />
          )}
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rewards.map((reward) => {
          const canAfford = currentBalance >= reward.fitCoinCost;

          return (
            <Card
              key={reward.id}
              className={`transition-all ${!canAfford ? 'opacity-60' : 'hover:shadow-lg'}`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{reward.title}</CardTitle>
                  <Badge className={getTierColor(reward.tier)}>
                    {reward.tier}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {getCategoryIcon(reward.category)}
                  <span>{getCategoryLabel(reward.category)}</span>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {reward.description}
                </p>
              </CardContent>
              <CardFooter className="flex items-center justify-between">
                <div className="flex items-center gap-1 font-semibold">
                  <Coins className="h-4 w-4 text-yellow-500" />
                  <span>{reward.fitCoinCost.toLocaleString()}</span>
                </div>
                <Button
                  size="sm"
                  disabled={!canAfford}
                  onClick={() => setSelectedReward(reward)}
                >
                  {canAfford ? 'Odbierz' : 'Za mało FitCoins'}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={!!selectedReward} onOpenChange={() => setSelectedReward(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Potwierdź odbiór nagrody</DialogTitle>
            <DialogDescription>
              Czy na pewno chcesz odebrać tę nagrodę?
            </DialogDescription>
          </DialogHeader>

          {selectedReward && (
            <div className="py-4">
              <div className="flex items-center justify-between mb-4">
                <span className="font-medium">{selectedReward.title}</span>
                <Badge className={getTierColor(selectedReward.tier)}>
                  {selectedReward.tier}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                {selectedReward.description}
              </p>
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span>Koszt:</span>
                <div className="flex items-center gap-1 font-bold">
                  <Coins className="h-4 w-4 text-yellow-500" />
                  <span>{selectedReward.fitCoinCost.toLocaleString()}</span>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 mt-2">
                <span>Twoje saldo po transakcji:</span>
                <div className="flex items-center gap-1 font-bold">
                  <Coins className="h-4 w-4 text-yellow-500" />
                  <span>{(currentBalance - selectedReward.fitCoinCost).toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedReward(null)}>
              Anuluj
            </Button>
            <Button onClick={handleRedeem} disabled={isRedeeming}>
              {isRedeeming ? 'Przetwarzanie...' : 'Potwierdź'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}