'use client';

import { lazy, Suspense, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { ArrowLeft, Footprints, Calendar, Clock, Route, TrendingUp, Mountain } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useDoc } from '@/lib/db-hooks';
import { computeElevationGain, computeRunSplits } from '@/lib/geo';
import type { RunningSession } from '@/lib/types';

// Leaflet + its CSS only load when a run with a saved route is opened.
const RouteMap = lazy(() =>
  import('@/components/running/RouteMap').then((m) => ({ default: m.RouteMap }))
);

function formatPace(pace: number) {
  if (!pace || !Number.isFinite(pace)) return '-';
  const minutes = Math.floor(pace);
  const seconds = Math.round((pace - minutes) * 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}/km`;
}

function formatTime(totalSeconds: number) {
  const seconds = Math.round(totalSeconds);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
  return `${minutes}m ${secs}s`;
}

/**
 * Dedicated page for a manually-logged or GPS-tracked run.
 *
 * Mirrors RunDetailStrava's layout (stat grid + per-km splits) so a run
 * recorded in-app reads the same way as one synced from Strava — built from
 * our own stored GPS points (incl. altitude) instead of a third-party API,
 * so heart-rate/cadence/kudos sections Strava has don't apply here.
 */
export default function RunDetailPage() {
  const navigate = useNavigate();
  const { sessionId } = useParams();

  const { data: session, isLoading } = useDoc<RunningSession>('runningSessions', sessionId ?? null);

  const splits = useMemo(() => (session?.points ? computeRunSplits(session.points) : []), [session?.points]);
  const elevationGain = useMemo(
    () => (session?.points ? computeElevationGain(session.points) : 0),
    [session?.points]
  );

  const backButton = (
    <Button onClick={() => navigate('/athlete/running')} variant="ghost" className="mb-4">
      <ArrowLeft className="mr-2 h-4 w-4" /> Wróć do biegów
    </Button>
  );

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-4xl p-4 md:p-8">
        {backButton}
        <Card>
          <CardHeader>
            <Skeleton className="h-7 w-3/4 mb-2" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent className="space-y-6">
            <Skeleton className="h-[400px] w-full" />
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="container mx-auto p-4 text-center md:p-8">
        {backButton}
        <h2 className="text-xl font-semibold">Nie znaleziono biegu</h2>
        <p className="text-muted-foreground">Nie można załadować szczegółów tego biegu.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl p-4 md:p-8">
      {backButton}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Footprints className="h-5 w-5 text-primary" />
            {session.programName || 'Bieg'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{session.programName ? 'Trening' : 'Bieg'}</Badge>
              <span className="text-sm text-muted-foreground">
                <Calendar className="inline h-4 w-4 mr-1" />
                {format(new Date(session.date), 'EEEE, d MMMM yyyy, HH:mm', { locale: pl })}
              </span>
            </div>

            {session.notes && <p className="text-sm text-muted-foreground">{session.notes}</p>}

            {session.polyline && (
              <div className="rounded-lg border overflow-hidden">
                <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
                  <RouteMap polyline={session.polyline} />
                </Suspense>
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="rounded-lg border p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Route className="h-4 w-4" />
                  <span className="text-xs">Dystans</span>
                </div>
                <p className="text-2xl font-bold">{session.distance.toFixed(2)} km</p>
              </div>

              <div className="rounded-lg border p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Clock className="h-4 w-4" />
                  <span className="text-xs">Czas ruchu</span>
                </div>
                <p className="text-2xl font-bold">{formatTime(session.duration * 60)}</p>
              </div>

              <div className="rounded-lg border p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-xs">Średnie tempo</span>
                </div>
                <p className="text-2xl font-bold">{formatPace(session.avgPace)}</p>
              </div>

              <div className="rounded-lg border p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Mountain className="h-4 w-4" />
                  <span className="text-xs">Przewyższenie</span>
                </div>
                <p className="text-2xl font-bold">{Math.round(elevationGain)} m</p>
              </div>
            </div>

            {splits.length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold mb-3">Podziały na kilometry</h3>
                  <div className="space-y-2">
                    {splits.map((split) => (
                      <div
                        key={split.km}
                        className="flex items-center justify-between text-sm border-l-4 border-primary pl-3 py-1"
                      >
                        <span className="font-medium">
                          Km {split.km}
                          {split.distanceM < 950 && ` (${Math.round(split.distanceM)} m)`}
                        </span>
                        <div className="flex gap-6">
                          <span>{formatTime(split.elapsedS)}</span>
                          <span className="text-muted-foreground">{formatPace(split.avgPaceMinPerKm)}</span>
                          {split.elevationGainM > 1 && (
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <Mountain className="h-3 w-3" />
                              {Math.round(split.elevationGainM)}m
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
