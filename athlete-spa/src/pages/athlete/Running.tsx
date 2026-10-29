'use client';

import { apiFetch } from '@/lib/api-client';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ChevronRight,
  Footprints,
  Gauge,
  Loader2,
  Music,
  Play,
  Plus,
  RefreshCw,
  Route,
  Timer,
  Trophy,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { haptic } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import { useCollection, useUser, useDoc } from '@/lib/db-hooks';
import type { RunningProgram, RunningSession, StravaActivity, UserProfile } from '@/lib/types';
import { tint } from '@/components/profile/profile-ui';
import { StartRunDialog } from '@/components/running/StartRunDialog';
import { ManualRunSheet } from '@/components/running/ManualRunSheet';
import { WeeklySummary } from '@/components/running/WeeklySummary';
import { RunHistoryList, STRAVA_COLOR } from '@/components/running/RunHistoryList';
import {
  formatHours,
  formatKm,
  formatPace,
  fromSession,
  fromStrava,
  runTitle,
  type RunActivity,
} from '@/components/running/running-format';

type SourceFilter = 'all' | 'app' | 'strava';

const SOURCE_FILTERS: { id: SourceFilter; label: string }[] = [
  { id: 'all', label: 'Wszystkie' },
  { id: 'app', label: 'Aplikacja' },
  { id: 'strava', label: 'Strava' },
];

/** Shortest run that counts towards the fastest-pace record, so a 200 m sprint doesn't win. */
const PACE_RECORD_MIN_KM = 1;

function StatTile({
  icon: Icon,
  color,
  label,
  value,
  isLoading,
}: {
  icon: LucideIcon;
  color: string;
  label: string;
  value: string;
  isLoading: boolean;
}) {
  return (
    <div className="rounded-[1.5rem] border border-border/60 bg-card p-4 shadow-soft">
      <span className="grid h-9 w-9 place-items-center rounded-xl" style={{ backgroundColor: tint(color, 15), color }}>
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      {isLoading ? (
        <Skeleton className="mt-1 h-7 w-20" />
      ) : (
        <p className="mt-0.5 truncate font-headline text-xl font-bold tabular-nums">{value}</p>
      )}
    </div>
  );
}

function RecordRow({ icon: Icon, label, run, value }: { icon: LucideIcon; label: string; run: RunActivity; value: string }) {
  const content = (
    <>
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[hsl(var(--chart-5)/0.15)] text-[hsl(var(--chart-5))]">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-semibold">{runTitle(run)}</p>
      </div>
      <span className="shrink-0 font-headline text-base font-bold tabular-nums">{value}</span>
      {run.href && <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/70" />}
    </>
  );
  const className = 'flex items-center gap-3 px-4 py-3';
  return run.href ? (
    <Link to={run.href} className={cn(className, 'transition-colors hover:bg-secondary/50 active:bg-secondary')}>
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  );
}

function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3 px-1">
      <h2 className="font-headline text-xl font-bold tracking-tight">{children}</h2>
      {action}
    </div>
  );
}

export default function RunningPage() {
  const navigate = useNavigate();
  const { user } = useUser();
  const { toast } = useToast();
  const [manualOpen, setManualOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [quickRunDialogOpen, setQuickRunDialogOpen] = useState(false);
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');

  // Recording needs the device's GPS; browsers without it keep the manual form.
  const supportsGeolocation = typeof navigator !== 'undefined' && 'geolocation' in navigator;

  const { data: userProfile } = useDoc<UserProfile>('users', user?.uid || null);
  const isStravaConnected = !!userProfile?.stravaConnected;

  const { data: runningSessions, isLoading: isLoadingManual, refetch: refetchManual } = useCollection<RunningSession>(
    user ? 'runningSessions' : null,
    { ownerId: user?.uid },
    { sort: { date: -1 } }
  );

  const { data: stravaActivities, isLoading: isLoadingStrava, refetch: refetchStrava } = useCollection<StravaActivity>(
    user ? 'stravaActivities' : null,
    { ownerId: user?.uid },
    { sort: { date: -1 } }
  );

  const { data: runningPrograms } = useCollection<RunningProgram>(
    supportsGeolocation ? 'runningPrograms' : null,
    { isActive: true }
  );

  const isLoading = isLoadingManual || isLoadingStrava;

  const runs = useMemo(
    () =>
      [...(runningSessions ?? []).map(fromSession), ...(stravaActivities ?? []).map(fromStrava)].sort(
        (a, b) => b.date.getTime() - a.date.getTime()
      ),
    [runningSessions, stravaActivities]
  );

  const stats = useMemo(() => {
    const totalDistance = runs.reduce((acc, r) => acc + r.distanceKm, 0);
    const totalDuration = runs.reduce((acc, r) => acc + r.durationMin, 0);
    const longest = runs.reduce<RunActivity | null>((best, r) => (!best || r.distanceKm > best.distanceKm ? r : best), null);
    const fastest = runs
      .filter(r => r.distanceKm >= PACE_RECORD_MIN_KM && r.avgPace > 0)
      .reduce<RunActivity | null>((best, r) => (!best || r.avgPace < best.avgPace ? r : best), null);
    return {
      totalRuns: runs.length,
      totalDistance,
      totalDuration,
      avgPace: totalDistance > 0 ? totalDuration / totalDistance : 0,
      longest,
      fastest,
    };
  }, [runs]);

  const hasStrava = (stravaActivities?.length ?? 0) > 0;
  const filteredRuns = sourceFilter === 'all' ? runs : runs.filter(r => r.source === sourceFilter);

  const startRecording = (programId: string) => {
    haptic('tap');
    navigate(`/athlete/running/record?programId=${programId}`);
  };

  const handleSyncStrava = async () => {
    setIsSyncing(true);
    try {
      const response = await apiFetch('/api/strava/sync', { method: 'POST' });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to sync');
      }

      const data = await response.json();
      haptic('success');
      toast({
        title: 'Zsynchronizowano',
        description: `Pobrano ${data.syncedCount} aktywności ze Strava.`,
      });
      refetchStrava();
    } catch (error) {
      toast({
        title: 'Błąd synchronizacji',
        description: error instanceof Error ? error.message : 'Nie udało się zsynchronizować ze Strava.',
        variant: 'destructive',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const openPrimary = () => {
    haptic('tap');
    if (supportsGeolocation) setQuickRunDialogOpen(true);
    else setManualOpen(true);
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-7 px-4 pb-5 pt-20 md:px-6 md:pt-8">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">Bieganie</p>
          <h1 className="font-headline text-3xl font-bold tracking-tight md:text-4xl">Dziennik biegowy</h1>
        </div>
        {isStravaConnected && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleSyncStrava}
            disabled={isSyncing}
            className="shrink-0 gap-1.5 rounded-full"
            style={{ color: STRAVA_COLOR }}
          >
            {isSyncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Strava
          </Button>
        )}
      </header>

      <section className="grid grid-cols-[1fr_auto] gap-3">
        <button
          type="button"
          onClick={openPrimary}
          className="hero-ember texture-grain group relative flex items-center justify-between gap-4 overflow-hidden rounded-[1.75rem] p-5 text-left text-white shadow-glow transition-transform duration-200 active:scale-[0.98] md:p-6"
        >
          <div aria-hidden className="pointer-events-none absolute -right-12 -top-16 h-44 w-44 rounded-full border-[1.1rem] border-white/10" />
          <div className="relative min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/75">
              {supportsGeolocation ? 'Nagrywanie GPS' : 'Bez GPS'}
            </p>
            <p className="mt-1 font-display text-xl font-extrabold uppercase leading-tight md:text-2xl">
              {supportsGeolocation ? 'Rozpocznij bieg' : 'Dodaj bieg'}
            </p>
          </div>
          <span className="relative grid h-14 w-14 shrink-0 place-items-center rounded-full bg-white text-primary shadow-lg transition-transform duration-200 group-hover:scale-105 group-active:scale-95">
            {supportsGeolocation ? <Play className="h-6 w-6 fill-current" /> : <Plus className="h-6 w-6" />}
          </span>
        </button>
        {supportsGeolocation && (
          <button
            type="button"
            onClick={() => setManualOpen(true)}
            className="flex w-24 flex-col items-center justify-center gap-2 rounded-[1.75rem] border border-border/60 bg-card p-3 text-center shadow-soft transition-colors hover:bg-secondary/50 active:scale-[0.98]"
          >
            <span className="grid h-10 w-10 place-items-center rounded-full bg-secondary">
              <Plus className="h-5 w-5" />
            </span>
            <span className="text-xs font-semibold leading-tight">Dodaj ręcznie</span>
          </button>
        )}
      </section>

      <WeeklySummary runs={runs} isLoading={isLoading} />

      {supportsGeolocation && runningPrograms && runningPrograms.length > 0 && (
        <section>
          <SectionTitle>Treningi od trenera</SectionTitle>
          <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:-mx-6 md:px-6 [&::-webkit-scrollbar]:hidden">
            {runningPrograms.map(program => (
              <button
                key={program.id}
                type="button"
                onClick={() => startRecording(program.id)}
                className="group flex w-56 shrink-0 snap-start flex-col rounded-[1.5rem] border border-border/60 bg-card p-4 text-left shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lifted active:scale-[0.98]"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-display text-3xl font-extrabold leading-none tabular-nums">
                    {formatKm(program.targetDistanceKm, program.targetDistanceKm % 1 ? 1 : 0)}
                    <span className="ml-1 font-headline text-sm font-bold text-muted-foreground">km</span>
                  </span>
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground transition-transform group-hover:scale-105">
                    <Play className="h-4 w-4 fill-current" />
                  </span>
                </div>
                <p className="mt-3 line-clamp-2 text-sm font-semibold leading-snug">{program.name}</p>
                {program.description && (
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{program.description}</p>
                )}
                {program.cues.length > 0 && (
                  <p className="mt-auto flex items-center gap-1 pt-3 text-xs font-medium text-muted-foreground">
                    <Music className="h-3 w-3" />
                    {program.cues.length} {program.cues.length === 1 ? 'sygnał' : 'sygnałów'} audio
                  </p>
                )}
              </button>
            ))}
          </div>
        </section>
      )}

      {(isLoading || runs.length > 0) && (
        <section>
          <SectionTitle>Łącznie</SectionTitle>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatTile icon={Route} color="hsl(var(--primary))" label="Dystans" value={`${formatKm(stats.totalDistance, 1)} km`} isLoading={isLoading} />
            <StatTile icon={Footprints} color="hsl(var(--chart-2))" label="Biegi" value={String(stats.totalRuns)} isLoading={isLoading} />
            <StatTile icon={Timer} color="hsl(var(--chart-4))" label="Czas" value={formatHours(stats.totalDuration)} isLoading={isLoading} />
            <StatTile icon={Gauge} color="hsl(var(--volt))" label="Śr. tempo" value={formatPace(stats.avgPace)} isLoading={isLoading} />
          </div>

          {!isLoading && (stats.longest || stats.fastest) && (
            <div className="mt-3 divide-y divide-border/60 overflow-hidden rounded-[1.5rem] border border-border/60 bg-card shadow-soft">
              {stats.longest && (
                <RecordRow icon={Trophy} label="Najdłuższy bieg" run={stats.longest} value={`${formatKm(stats.longest.distanceKm)} km`} />
              )}
              {stats.fastest && (
                <RecordRow icon={Zap} label={`Najszybsze tempo (≥ ${PACE_RECORD_MIN_KM} km)`} run={stats.fastest} value={formatPace(stats.fastest.avgPace)} />
              )}
            </div>
          )}
        </section>
      )}

      <section>
        <SectionTitle
          action={
            hasStrava && runs.length > 0 ? (
              <div className="flex gap-1 rounded-full border border-border/60 bg-card p-1 shadow-soft" role="tablist" aria-label="Źródło biegów">
                {SOURCE_FILTERS.map(f => (
                  <button
                    key={f.id}
                    type="button"
                    role="tab"
                    aria-selected={sourceFilter === f.id}
                    onClick={() => setSourceFilter(f.id)}
                    className={cn(
                      'h-7 rounded-full px-3 text-xs font-semibold transition-colors',
                      sourceFilter === f.id ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            ) : undefined
          }
        >
          Historia
        </SectionTitle>

        {isLoading ? (
          <div className="space-y-px overflow-hidden rounded-[1.5rem] border border-border/60 bg-card">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3.5">
                <Skeleton className="h-14 w-14 rounded-2xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-1/3" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredRuns.length > 0 ? (
          <RunHistoryList key={sourceFilter} runs={filteredRuns} />
        ) : runs.length > 0 ? (
          <p className="rounded-[1.5rem] border border-dashed border-border bg-card/50 p-6 text-center text-sm text-muted-foreground">
            Brak biegów z tego źródła.
          </p>
        ) : (
          <div className="rounded-[1.75rem] border border-dashed border-border bg-card/50 p-8 text-center">
            <span className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-secondary text-primary">
              <Footprints className="h-7 w-7" />
            </span>
            <p className="font-semibold">Brak biegów</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {supportsGeolocation ? 'Nagraj pierwszy bieg z GPS albo dodaj go ręcznie.' : 'Dodaj swój pierwszy bieg.'}
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Button size="sm" className="rounded-full" onClick={openPrimary}>
                {supportsGeolocation ? 'Rozpocznij bieg' : 'Dodaj bieg'}
              </Button>
              {isStravaConnected && (
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full"
                  style={{ color: STRAVA_COLOR }}
                  onClick={handleSyncStrava}
                  disabled={isSyncing}
                >
                  Pobierz ze Strava
                </Button>
              )}
            </div>
          </div>
        )}
      </section>

      <StartRunDialog open={quickRunDialogOpen} onOpenChange={setQuickRunDialogOpen} />
      <ManualRunSheet open={manualOpen} onOpenChange={setManualOpen} onSaved={refetchManual} />
    </div>
  );
}
