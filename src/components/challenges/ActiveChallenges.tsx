'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { format, differenceInDays, isPast } from 'date-fns';
import { pl } from 'date-fns/locale';
import {
    Footprints,
    Trophy,
    Clock,
    CheckCircle,
    XCircle,
    Loader2,
    User,
    Target,
    Calendar,
} from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/lib/db-hooks';
import type { Challenge } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

export function ActiveChallenges() {
    const { toast } = useToast();
    const { user } = useUser();
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [challenges, setChallenges] = useState<Challenge[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchChallenges = useCallback(async () => {
        if (!user) return;

        try {
            const response = await fetch('/api/challenges');
            if (response.ok) {
                const data = await response.json();
                setChallenges(data.data || []);
            }
        } catch (error) {
            console.error('Failed to fetch challenges:', error);
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchChallenges();
    }, [fetchChallenges]);

    // Separate pending, active, and completed challenges
    const { pendingChallenges, activeChallenges, completedChallenges } = useMemo(() => {
        if (!challenges || !user) return { pendingChallenges: [], activeChallenges: [], completedChallenges: [] };

        const pending = challenges.filter(
            c => c.status === 'pending' && c.challengedId === user.uid
        );
        const active = challenges.filter(
            c => c.status === 'accepted' || (c.status === 'pending' && c.challengerId === user.uid)
        );
        const completed = challenges.filter(
            c => c.status === 'completed'
        );

        return { pendingChallenges: pending, activeChallenges: active, completedChallenges: completed };
    }, [challenges, user]);

    const handleAction = async (challengeId: string, action: 'accept' | 'decline') => {
        setActionLoading(challengeId);
        try {
            const response = await fetch(`/api/challenges/${challengeId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error);
            }

            toast({
                title: action === 'accept' ? 'Wyzwanie zaakceptowane! 🏃' : 'Wyzwanie odrzucone',
                description: action === 'accept'
                    ? 'Powodzenia w rywalizacji!'
                    : 'Wyzwanie zostało odrzucone',
            });

            fetchChallenges();
        } catch (error) {
            toast({
                title: 'Błąd',
                description: error instanceof Error ? error.message : 'Coś poszło nie tak',
                variant: 'destructive',
            });
        } finally {
            setActionLoading(null);
        }
    };

    const getInitials = (name: string) => {
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    if (isLoading) {
        return (
            <Card className="border-purple-500/30 bg-purple-500/5 mb-6">
                <CardHeader>
                    <CardTitle className="font-headline flex items-center gap-2">
                        <Footprints className="h-5 w-5 text-purple-500" />
                        Wyzwania Biegowe
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        <Skeleton className="h-24 w-full" />
                        <Skeleton className="h-24 w-full" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!pendingChallenges.length && !activeChallenges.length && !completedChallenges.length) {
        return null;
    }

    return (
        <Card className="border-purple-500/30 bg-purple-500/5  mb-6">
            <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/20">
                        <Footprints className="h-5 w-5 text-purple-500" />
                    </div>
                    <div>
                        <CardTitle className="font-headline">Wyzwania Biegowe</CardTitle>
                        <CardDescription>Twoje aktywne wyzwania i zaproszenia</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Pending challenges (invitations) */}
                {pendingChallenges.length > 0 && (
                    <div className="space-y-3">
                        <h4 className="text-sm font-medium text-muted-foreground">Zaproszenia</h4>
                        {pendingChallenges.map((challenge) => (
                            <div
                                key={challenge.id}
                                className="p-4 rounded-lg border border-yellow-500/30 bg-yellow-500/10"
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-10 w-10">
                                            <AvatarImage src={challenge.challengerAvatarUrl} />
                                            <AvatarFallback>{getInitials(challenge.challengerName)}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-semibold">{challenge.challengerName}</p>
                                            <p className="text-sm text-muted-foreground">zaprasza Cię do wyzwania</p>
                                        </div>
                                    </div>
                                    <Badge variant="outline" className="bg-yellow-500/20 border-yellow-500/30">
                                        Oczekuje
                                    </Badge>
                                </div>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                                    <div className="flex items-center gap-1">
                                        <Target className="h-4 w-4" />
                                        <span>{challenge.targetKm} km</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Calendar className="h-4 w-4" />
                                        <span>do {format(new Date(challenge.endDate), 'd MMM yyyy', { locale: pl })}</span>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        onClick={() => handleAction(challenge.id, 'accept')}
                                        disabled={actionLoading === challenge.id}
                                        className="flex-1"
                                    >
                                        {actionLoading === challenge.id ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <>
                                                <CheckCircle className="h-4 w-4 mr-1" />
                                                Akceptuj
                                            </>
                                        )}
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleAction(challenge.id, 'decline')}
                                        disabled={actionLoading === challenge.id}
                                        className="flex-1"
                                    >
                                        <XCircle className="h-4 w-4 mr-1" />
                                        Odrzuć
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Active challenges */}
                {activeChallenges.length > 0 && (
                    <div className="space-y-3">
                        {pendingChallenges.length > 0 && (
                            <h4 className="text-sm font-medium text-muted-foreground">Aktywne wyzwania</h4>
                        )}
                        {activeChallenges.map((challenge) => {
                            const isChallenger = challenge.challengerId === user?.uid;
                            const opponentName = isChallenger ? challenge.challengedName : challenge.challengerName;
                            const opponentAvatar = isChallenger ? challenge.challengedAvatarUrl : challenge.challengerAvatarUrl;
                            const myProgress = isChallenger ? challenge.challengerProgress : challenge.challengedProgress;
                            const opponentProgress = isChallenger ? challenge.challengedProgress : challenge.challengerProgress;
                            const myPercentage = Math.min((myProgress / challenge.targetKm) * 100, 100);
                            const opponentPercentage = Math.min((opponentProgress / challenge.targetKm) * 100, 100);
                            const daysLeft = differenceInDays(new Date(challenge.endDate), new Date());
                            const isEnded = isPast(new Date(challenge.endDate));
                            const isPending = challenge.status === 'pending';

                            return (
                                <div
                                    key={challenge.id}
                                    className={`p-4 rounded-lg border ${isEnded ? 'border-muted bg-muted/30' : 'border-purple-500/20 hover:bg-purple-500/5'
                                        } transition-colors`}
                                >
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-10 w-10">
                                                <AvatarImage src={opponentAvatar} />
                                                <AvatarFallback>{getInitials(opponentName)}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="font-semibold">vs {opponentName}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    Cel: {challenge.targetKm} km
                                                </p>
                                            </div>
                                        </div>
                                        {isPending ? (
                                            <Badge variant="outline" className="bg-blue-500/20 border-blue-500/30">
                                                Wysłane
                                            </Badge>
                                        ) : isEnded ? (
                                            <Badge className="bg-muted-foreground">
                                                Zakończone
                                            </Badge>
                                        ) : (
                                            <Badge className="bg-green-500">
                                                <Clock className="h-3 w-3 mr-1" />
                                                {daysLeft} dni
                                            </Badge>
                                        )}
                                    </div>

                                    {!isPending && (
                                        <div className="space-y-3">
                                            {/* My progress */}
                                            <div>
                                                <div className="flex justify-between text-sm mb-1">
                                                    <span className="font-medium">Ty</span>
                                                    <span>{myProgress.toFixed(1)} / {challenge.targetKm} km</span>
                                                </div>
                                                <Progress
                                                    value={myPercentage}
                                                    className="h-2 [&>div]:bg-purple-500"
                                                />
                                            </div>

                                            {/* Opponent progress */}
                                            <div>
                                                <div className="flex justify-between text-sm mb-1">
                                                    <span className="font-medium">{opponentName}</span>
                                                    <span>{opponentProgress.toFixed(1)} / {challenge.targetKm} km</span>
                                                </div>
                                                <Progress
                                                    value={opponentPercentage}
                                                    className="h-2 [&>div]:bg-orange-500"
                                                />
                                            </div>

                                            {isEnded && challenge.winnerId && (
                                                <div className="flex items-center justify-center gap-2 pt-2 text-sm">
                                                    <Trophy className="h-4 w-4 text-yellow-500" />
                                                    <span className="font-medium">
                                                        {challenge.winnerId === user?.uid ? 'Wygrałeś!' : `Wygrał ${opponentName}`}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Completed challenges */}
                {completedChallenges.length > 0 && (
                    <div className="space-y-3">
                        {(pendingChallenges.length > 0 || activeChallenges.length > 0) && (
                            <h4 className="text-sm font-medium text-muted-foreground pt-2">Zakończone wyzwania</h4>
                        )}
                        {completedChallenges.map((challenge) => {
                            const isChallenger = challenge.challengerId === user?.uid;
                            const opponentName = isChallenger ? challenge.challengedName : challenge.challengerName;
                            const opponentAvatar = isChallenger ? challenge.challengedAvatarUrl : challenge.challengerAvatarUrl;
                            const myProgress = isChallenger ? challenge.challengerProgress : challenge.challengedProgress;
                            const opponentProgress = isChallenger ? challenge.challengedProgress : challenge.challengerProgress;
                            const isWinner = challenge.winnerId === user?.uid;
                            const isDraw = !challenge.winnerId;

                            return (
                                <div
                                    key={challenge.id}
                                    className="p-4 rounded-lg border border-muted bg-muted/30 opacity-80 hover:opacity-100 transition-opacity"
                                >
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-10 w-10 grayscale">
                                                <AvatarImage src={opponentAvatar} />
                                                <AvatarFallback>{getInitials(opponentName)}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="font-semibold text-muted-foreground">vs {opponentName}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    Zakończone {format(new Date(challenge.endDate), 'd MMM yyyy', { locale: pl })}
                                                </p>
                                            </div>
                                        </div>
                                        <Badge variant="outline" className={isWinner ? "bg-yellow-500/10 text-yellow-600 border-yellow-500/30" : "bg-muted text-muted-foreground"}>
                                            {isWinner ? (
                                                <>
                                                    <Trophy className="h-3 w-3 mr-1" />
                                                    Wygrana
                                                </>
                                            ) : isDraw ? (
                                                'Remis'
                                            ) : (
                                                'Przegrana'
                                            )}
                                        </Badge>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <p className="text-muted-foreground mb-1">Ty</p>
                                            <p className="font-medium">{myProgress.toFixed(1)} km</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-muted-foreground mb-1">{opponentName}</p>
                                            <p className="font-medium">{opponentProgress.toFixed(1)} km</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
