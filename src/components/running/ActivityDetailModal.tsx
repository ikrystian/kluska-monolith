'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Activity, Calendar, Clock, Route, TrendingUp, Heart, Mountain, Zap, Trophy, User } from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { RouteMap } from '@/components/running/RouteMap';

interface StravaDetailedActivity {
    id: number;
    name: string;
    type: string;
    start_date: string;
    distance: number;
    moving_time: number;
    elapsed_time: number;
    total_elevation_gain?: number;
    elev_high?: number;
    elev_low?: number;
    average_speed?: number;
    max_speed?: number;
    average_heartrate?: number;
    max_heartrate?: number;
    average_cadence?: number;
    calories?: number;
    kudos_count?: number;
    comment_count?: number;
    athlete_count?: number;
    description?: string;
    splits_metric?: Array<{
        distance: number;
        elapsed_time: number;
        elevation_difference: number;
        moving_time: number;
        split: number;
        average_speed: number;
        average_heartrate?: number;
    }>;
    map?: {
        summary_polyline?: string;
    };
}

interface ActivityDetailModalProps {
    activityId: string | null;
    onClose: () => void;
}

export function ActivityDetailModal({ activityId, onClose }: ActivityDetailModalProps) {
    const [activity, setActivity] = useState<StravaDetailedActivity | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch activity details when activityId changes
    useEffect(() => {
        if (!activityId) {
            setActivity(null);
            setError(null);
            return;
        }

        const fetchActivityDetails = async () => {
            setIsLoading(true);
            setError(null);
            try {
                console.log('Fetching activity details for:', activityId);
                const response = await fetch(`/api/strava/activity/${activityId}`);
                console.log('Response status:', response.status);

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('Error response:', errorText);
                    throw new Error(`Failed to fetch activity details: ${response.status}`);
                }

                const data = await response.json();
                console.log('Received activity data:', data);
                setActivity(data.data);
            } catch (err) {
                console.error('Error fetching activity:', err);
                setError(err instanceof Error ? err.message : 'Unknown error');
            } finally {
                setIsLoading(false);
            }
        };

        fetchActivityDetails();
    }, [activityId]);

    const handleOpenChange = (open: boolean) => {
        if (!open) {
            onClose();
        }
    };

    const formatPace = (speedMs: number) => {
        if (!speedMs || speedMs === 0) return '-';
        const paceMinPerKm = 1000 / (speedMs * 60);
        const minutes = Math.floor(paceMinPerKm);
        const seconds = Math.round((paceMinPerKm - minutes) * 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}/km`;
    };

    const formatTime = (seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        if (hours > 0) {
            return `${hours}h ${minutes}m ${secs}s`;
        }
        return `${minutes}m ${secs}s`;
    };

    return (
        <Dialog open={!!activityId} onOpenChange={handleOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5 text-[#FC4C02]" />
                        {isLoading ? 'Ładowanie...' : activity?.name || 'Szczegóły aktywności'}
                    </DialogTitle>
                </DialogHeader>

                {error && (
                    <div className="rounded-lg bg-destructive/10 p-4 text-destructive">
                        <p className="font-medium">Błąd podczas ładowania</p>
                        <p className="text-sm">{error}</p>
                    </div>
                )}

                {isLoading ? (
                    <div className="space-y-4">
                        <Skeleton className="h-48 w-full" />
                        <Skeleton className="h-24 w-full" />
                        <Skeleton className="h-32 w-full" />
                    </div>
                ) : activity ? (
                    <div className="space-y-6">
                        {/* Header Info */}
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="secondary" className="bg-[#FC4C02]/10 text-[#FC4C02]">
                                {activity.type}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                                <Calendar className="inline h-4 w-4 mr-1" />
                                {format(new Date(activity.start_date), 'EEEE, d MMMM yyyy, HH:mm', { locale: pl })}
                            </span>
                        </div>

                        {activity.description && (
                            <p className="text-sm text-muted-foreground">{activity.description}</p>
                        )}

                        {/* Route Map */}
                        {activity.map?.summary_polyline && (
                            <div className="rounded-lg border overflow-hidden">
                                <RouteMap polyline={activity.map.summary_polyline} />
                            </div>
                        )}

                        {/* Main Stats Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="rounded-lg border p-4">
                                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                    <Route className="h-4 w-4" />
                                    <span className="text-xs">Dystans</span>
                                </div>
                                <p className="text-2xl font-bold">{(activity.distance / 1000).toFixed(2)} km</p>
                            </div>

                            <div className="rounded-lg border p-4">
                                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                    <Clock className="h-4 w-4" />
                                    <span className="text-xs">Czas ruchu</span>
                                </div>
                                <p className="text-2xl font-bold">{formatTime(activity.moving_time)}</p>
                            </div>

                            <div className="rounded-lg border p-4">
                                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                    <TrendingUp className="h-4 w-4" />
                                    <span className="text-xs">Średnie tempo</span>
                                </div>
                                <p className="text-2xl font-bold">{formatPace(activity.average_speed || 0)}</p>
                            </div>

                            <div className="rounded-lg border p-4">
                                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                    <Mountain className="h-4 w-4" />
                                    <span className="text-xs">Przewyższenie</span>
                                </div>
                                <p className="text-2xl font-bold">{Math.round(activity.total_elevation_gain || 0)} m</p>
                            </div>
                        </div>

                        {/* Additional Stats */}
                        {(activity.average_heartrate || activity.calories || activity.max_speed) && (
                            <>
                                <Separator />
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    {activity.average_heartrate && (
                                        <div className="flex items-center gap-3">
                                            <Heart className="h-5 w-5 text-red-500" />
                                            <div>
                                                <p className="text-xs text-muted-foreground">Puls średni</p>
                                                <p className="font-semibold">{Math.round(activity.average_heartrate)} bpm</p>
                                            </div>
                                        </div>
                                    )}

                                    {activity.max_heartrate && (
                                        <div className="flex items-center gap-3">
                                            <Heart className="h-5 w-5 text-red-600" />
                                            <div>
                                                <p className="text-xs text-muted-foreground">Puls maks.</p>
                                                <p className="font-semibold">{Math.round(activity.max_heartrate)} bpm</p>
                                            </div>
                                        </div>
                                    )}

                                    {activity.calories && (
                                        <div className="flex items-center gap-3">
                                            <Zap className="h-5 w-5 text-orange-500" />
                                            <div>
                                                <p className="text-xs text-muted-foreground">Kalorie</p>
                                                <p className="font-semibold">{activity.calories} kcal</p>
                                            </div>
                                        </div>
                                    )}

                                    {activity.max_speed && (
                                        <div className="flex items-center gap-3">
                                            <TrendingUp className="h-5 w-5 text-green-500" />
                                            <div>
                                                <p className="text-xs text-muted-foreground">Maks. tempo</p>
                                                <p className="font-semibold">{formatPace(activity.max_speed)}</p>
                                            </div>
                                        </div>
                                    )}

                                    {activity.average_cadence && (
                                        <div className="flex items-center gap-3">
                                            <Activity className="h-5 w-5 text-blue-500" />
                                            <div>
                                                <p className="text-xs text-muted-foreground">Kadencja</p>
                                                <p className="font-semibold">{Math.round(activity.average_cadence)} spm</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}

                        {/* Social Stats */}
                        {(activity.kudos_count || activity.comment_count) && (
                            <>
                                <Separator />
                                <div className="flex gap-6">
                                    {activity.kudos_count !== undefined && activity.kudos_count > 0 && (
                                        <div className="flex items-center gap-2">
                                            <Trophy className="h-4 w-4 text-yellow-500" />
                                            <span className="text-sm">{activity.kudos_count} polubień</span>
                                        </div>
                                    )}
                                    {activity.comment_count !== undefined && activity.comment_count > 0 && (
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm">💬 {activity.comment_count} komentarzy</span>
                                        </div>
                                    )}
                                    {activity.athlete_count !== undefined && activity.athlete_count > 1 && (
                                        <div className="flex items-center gap-2">
                                            <User className="h-4 w-4" />
                                            <span className="text-sm">{activity.athlete_count} uczestników</span>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}

                        {/* Splits */}
                        {activity.splits_metric && activity.splits_metric.length > 0 && (
                            <>
                                <Separator />
                                <div>
                                    <h3 className="font-semibold mb-3">Podziały na kilometry</h3>
                                    <div className="space-y-2">
                                        {activity.splits_metric.map((split, index) => (
                                            <div key={index} className="flex items-center justify-between text-sm border-l-4 border-[#FC4C02] pl-3 py-1">
                                                <span className="font-medium">Km {split.split}</span>
                                                <div className="flex gap-6">
                                                    <span>{formatTime(split.elapsed_time)}</span>
                                                    <span className="text-muted-foreground">{formatPace(split.average_speed)}</span>
                                                    {split.average_heartrate && (
                                                        <span className="text-red-500">{Math.round(split.average_heartrate)} bpm</span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}

                        {/* View on Strava */}
                        <div className="flex justify-end">
                            <a
                                href={`https://www.strava.com/activities/${activity.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-sm text-[#FC4C02] hover:underline"
                            >
                                Zobacz na Strava
                                <Activity className="h-4 w-4" />
                            </a>
                        </div>
                    </div>
                ) : null}
            </DialogContent>
        </Dialog>
    );
}
