import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSWRConfig } from 'swr';
import * as polyline from 'polyline-encoded';
import { Geolocation } from '@capacitor/geolocation';
import {
  Footprints,
  Megaphone,
  Pause,
  PartyPopper,
  Play,
  Satellite,
  Square,
  TriangleAlert,
  X,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useRunTracker, type TrackPoint } from '@/hooks/useRunTracker';
import { useRunCues } from '@/hooks/useRunCues';
import { useWakeLock } from '@/hooks/useWakeLock';
import { useLiveWidget } from '@/hooks/useLiveWidget';
import { haptic } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import { useCollection, useCreateDoc, useUser } from '@/lib/db-hooks';
import { useToast } from '@/hooks/use-toast';
import { purgePersistedEntries } from '@/lib/swr-cache';
import { LiveRouteMap } from '@/components/running/LiveRouteMap';
import type { RunningProgram } from '@/lib/types';

const isRunningSessionsListKey = (key: unknown): key is string =>
  typeof key === 'string' && key.includes('/api/db/runningSessions?');

function formatDuration(totalSeconds: number): string {
  const seconds = Math.floor(totalSeconds);
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

function formatPace(pace: number): string {
  if (!pace || !Number.isFinite(pace)) return '--:--';
  const minutes = Math.floor(pace);
  const seconds = Math.round((pace - minutes) * 60);
  if (seconds === 60) return `${minutes + 1}:00`;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

const Metric = ({ label, value, unit }: { label: string; value: string; unit?: string }) => (
  <div className="text-center">
    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/60">{label}</p>
    <p className="mt-1 font-display text-3xl font-extrabold tabular-nums leading-none text-white">
      {value}
      {unit && <span className="ml-1 text-sm font-semibold text-white/60">{unit}</span>}
    </p>
  </div>
);

/**
 * Full-screen run recorder, styled after Nike Running Club: a live map fills
 * the screen and a frosted stats sheet sits on top of it, instead of a plain
 * overlay dialog. Lives at its own route (`/athlete/running/record`) rather
 * than as a modal so the back gesture, the URL, and the immersive chrome-free
 * layout all behave like a real screen.
 */
export default function RunRecordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const programId = searchParams.get('programId');

  const { user } = useUser();
  const { toast } = useToast();
  const { createDoc, isLoading: isSaving } = useCreateDoc();
  const { mutate: swrMutate } = useSWRConfig();

  const { data: programs } = useCollection<RunningProgram>('runningPrograms', { isActive: true });
  const selectedProgram = programs?.find(p => p.id === programId) ?? null;

  // Ad-hoc goal for a quick run (no program): either a target distance (km)
  // or a target duration (minutes), set before starting from StartRunDialog.
  const goal = useMemo(() => {
    const goalType = searchParams.get('goalType');
    const goalValue = Number(searchParams.get('goalValue'));
    if (selectedProgram || !goalValue || !Number.isFinite(goalValue) || goalValue <= 0) return null;
    if (goalType === 'distance') return { type: 'distance' as const, value: goalValue };
    if (goalType === 'time') return { type: 'time' as const, value: goalValue };
    return null;
  }, [searchParams, selectedProgram]);

  const tracker = useRunTracker();
  const [notes, setNotes] = useState('');
  const [discardOpen, setDiscardOpen] = useState(false);
  const [idlePosition, setIdlePosition] = useState<TrackPoint | null>(null);

  const { activeCue } = useRunCues(selectedProgram, tracker.duration, tracker.distance, tracker.status);

  const isActive = tracker.status === 'running' || tracker.status === 'paused';
  useWakeLock(isActive);

  // Centers the pre-start map near the athlete instead of a blank world view.
  useEffect(() => {
    if (tracker.status !== 'idle') return;
    let cancelled = false;
    Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10_000 })
      .then(position => {
        if (cancelled) return;
        setIdlePosition({ lat: position.coords.latitude, lng: position.coords.longitude, at: position.timestamp });
      })
      .catch(() => {
        // No fix yet, or permission not granted — the map just shows a world view.
      });
    return () => {
      cancelled = true;
    };
  }, [tracker.status]);

  const km = tracker.distance / 1000;

  // Mirror the run on the Android home-screen widget while it is running or paused.
  useLiveWidget(
    isActive
      ? {
          activity: 'run',
          title: selectedProgram?.name ?? 'Bieg',
          line1: `${km.toFixed(2)} km`,
          line2: tracker.pace > 0 ? `${formatPace(tracker.pace)} /km` : 'Tempo: --:--',
          running: tracker.status === 'running',
        }
      : null,
    () => tracker.duration * 1000
  );

  const goalProgress = useMemo(() => {
    if (!goal) return null;
    if (goal.type === 'distance') {
      const fraction = km / goal.value;
      return { fraction, remainingLabel: `${Math.max(goal.value - km, 0).toFixed(2)} km do celu` };
    }
    const targetSeconds = goal.value * 60;
    const fraction = tracker.duration / targetSeconds;
    return { fraction, remainingLabel: `${formatDuration(Math.max(targetSeconds - tracker.duration, 0))} do celu` };
  }, [goal, km, tracker.duration]);

  const goalReachedRef = useRef(false);
  useEffect(() => {
    if (!goalProgress) return;
    if (goalProgress.fraction >= 1 && !goalReachedRef.current && tracker.status === 'running') {
      goalReachedRef.current = true;
      haptic('celebrate');
      toast({ title: 'Cel osiągnięty! 🎉', description: 'Możesz kontynuować bieg albo go zakończyć.' });
    }
  }, [goalProgress, tracker.status, toast]);

  useEffect(() => {
    if (tracker.status === 'running' && tracker.duration === 0) {
      goalReachedRef.current = false;
    }
  }, [tracker.status, tracker.duration]);

  const encodedRoute = useMemo(
    () => polyline.encode(tracker.points.map(p => [p.lat, p.lng])),
    [tracker.points]
  );
  const mapPoints = tracker.points.length > 0 ? tracker.points : idlePosition ? [idlePosition] : [];
  const weakSignal = tracker.accuracy !== null && tracker.accuracy > 40;

  const goBackToRunningList = () => {
    navigate('/athlete/running');
  };

  const requestClose = () => {
    if (isActive && tracker.points.length > 0) {
      setDiscardOpen(true);
      return;
    }
    tracker.reset();
    goBackToRunningList();
  };

  const handleDiscard = () => {
    tracker.reset();
    setNotes('');
    goBackToRunningList();
  };

  const handleSave = async () => {
    if (!user) return;
    haptic('celebrate');
    try {
      await createDoc('runningSessions', {
        date: new Date().toISOString(),
        distance: Math.round(km * 100) / 100,
        duration: Math.round((tracker.duration / 60) * 100) / 100,
        avgPace: Math.round(tracker.pace * 100) / 100,
        polyline: encodedRoute,
        points: tracker.points,
        notes: notes.trim() || undefined,
        ownerId: user.uid,
        programId: selectedProgram?.id,
        programName: selectedProgram?.name,
      });
      purgePersistedEntries(isRunningSessionsListKey);
      void swrMutate(isRunningSessionsListKey, undefined, { revalidate: true });
      toast({
        title: 'Bieg zapisany!',
        description: `${km.toFixed(2)} km w ${Math.round(tracker.duration / 60)} min.`,
      });
      tracker.reset();
      goBackToRunningList();
    } catch (error) {
      console.error('Error saving tracked run:', error);
      toast({ title: 'Błąd', description: 'Nie udało się zapisać biegu.', variant: 'destructive' });
    }
  };

  return (
    <div className="relative flex h-dvh w-full flex-col overflow-hidden bg-background">
      {/* isolate: Leaflet's own panes use z-index up to 700 (tiles, markers, popups).
          Without a stacking context here, those panes escape this wrapper and paint
          over the z-10 UI below regardless of DOM order. */}
      <div className="absolute inset-0 isolate">
        <LiveRouteMap points={mapPoints} />
      </div>
      {/* Darken the map so white overlay text/controls stay legible over any tile. */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/10" />

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-4 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={requestClose}
          aria-label="Zamknij"
          className="grid h-10 w-10 place-items-center rounded-full bg-black/40 text-white backdrop-blur-md active:scale-90"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-md">
          <Footprints className="h-3.5 w-3.5" />
          {selectedProgram ? selectedProgram.name : 'Szybki bieg'}
        </div>
        <div className="w-10" />
      </div>

      {/* Signal / error / cue banners, floating over the map */}
      <div className="relative z-10 mt-2 space-y-2 px-4">
        {(tracker.error || weakSignal) && (
          <div
            className={cn(
              'flex items-center gap-2 rounded-2xl px-3 py-2 text-white backdrop-blur-md',
              tracker.error ? 'bg-destructive/80' : 'bg-amber-600/80'
            )}
          >
            {tracker.error ? (
              <TriangleAlert className="h-3.5 w-3.5 shrink-0" />
            ) : (
              <Satellite className="h-3.5 w-3.5 shrink-0" />
            )}
            <p className="text-[11px] font-semibold">
              {tracker.error ?? `Słaby sygnał GPS (±${Math.round(tracker.accuracy ?? 0)} m)`}
            </p>
          </div>
        )}
        {tracker.hasRecoverableRun && tracker.duration > 0 && tracker.status === 'paused' && (
          <div className="rounded-2xl bg-primary/80 px-3 py-2 text-white backdrop-blur-md">
            <p className="text-[11px] font-semibold">Znaleziono przerwany bieg — wznów go lub zapisz.</p>
          </div>
        )}
        {activeCue && (
          <div className="flex items-center gap-2 rounded-2xl bg-primary/80 px-3 py-2 text-white backdrop-blur-md">
            <Megaphone className="h-3.5 w-3.5 shrink-0" />
            <p className="text-[11px] font-semibold">{activeCue.label}</p>
          </div>
        )}
      </div>

      <div className="flex-1" />

      {/* Bottom sheet: stats + controls */}
      <div className="relative z-10 rounded-t-[2rem] border-t border-white/10 bg-black/70 px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-6 backdrop-blur-xl">
        {tracker.status === 'idle' && (
          <div className="space-y-5">
            <div className="text-center">
              {selectedProgram ? (
                <>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/60">Trening</p>
                  <p className="mt-1 font-display text-2xl font-extrabold text-white">{selectedProgram.name}</p>
                  <p className="text-sm text-white/60">
                    Cel: {selectedProgram.targetDistanceKm} km
                    {selectedProgram.cues.length > 0 && ` · ${selectedProgram.cues.length} sygnałów dźwiękowych`}
                  </p>
                </>
              ) : (
                <>
                  <p className="font-display text-2xl font-extrabold text-white">Szybki bieg</p>
                  <p className="text-sm text-white/60">
                    {goal
                      ? `Cel: ${goal.type === 'distance' ? `${goal.value} km` : `${goal.value} min`}`
                      : 'Bez zaplanowanego treningu'}
                  </p>
                </>
              )}
            </div>
            <Button
              size="lg"
              className="h-16 w-full rounded-full text-base font-bold shadow-glow"
              onClick={() => {
                haptic('impact');
                tracker.start();
              }}
            >
              <Play className="mr-2 h-6 w-6 fill-current" /> Start
            </Button>
          </div>
        )}

        {tracker.status !== 'idle' && tracker.status !== 'finished' && (
          <div className="space-y-6">
            <div className="text-center">
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/60">Dystans</p>
              <p className="mt-1 font-display text-[4rem] font-extrabold leading-none tabular-nums text-white">
                {km.toFixed(2)}
              </p>
              <p className="text-sm font-semibold text-white/60">km</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Metric label="Czas" value={formatDuration(tracker.duration)} />
              <Metric label="Tempo" value={formatPace(tracker.pace)} unit="/km" />
            </div>

            {goalProgress && (
              <div className="space-y-1.5">
                <div className="h-2 w-full overflow-hidden rounded-full bg-white/15">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all',
                      goalProgress.fraction >= 1 ? 'bg-emerald-400' : 'bg-primary'
                    )}
                    style={{ width: `${Math.min(goalProgress.fraction * 100, 100)}%` }}
                  />
                </div>
                <p className="flex items-center justify-center gap-1.5 text-center text-xs font-semibold text-white/60">
                  {goalProgress.fraction >= 1 ? (
                    <>
                      <PartyPopper className="h-3.5 w-3.5 text-emerald-400" />
                      Cel osiągnięty!
                    </>
                  ) : (
                    goalProgress.remainingLabel
                  )}
                </p>
              </div>
            )}

            {tracker.status === 'running' && (
              <div className="flex justify-center">
                <button
                  type="button"
                  aria-label="Pauza"
                  onClick={() => {
                    haptic('impact');
                    tracker.pause();
                  }}
                  className="grid h-20 w-20 place-items-center rounded-full bg-white text-background shadow-glow active:scale-95"
                >
                  <Pause className="h-8 w-8 fill-current" />
                </button>
              </div>
            )}

            {tracker.status === 'paused' && (
              <div className="flex items-center justify-center gap-4">
                <Button
                  size="lg"
                  variant="outline"
                  className="h-14 flex-1 rounded-2xl border-white/30 text-white hover:bg-white/10 hover:text-white"
                  onClick={() => {
                    haptic('impact');
                    tracker.finish();
                  }}
                >
                  <Square className="mr-2 h-4 w-4 fill-current" /> Zakończ
                </Button>
                <button
                  type="button"
                  aria-label="Wznów"
                  onClick={() => {
                    haptic('impact');
                    tracker.resume();
                  }}
                  className="grid h-20 w-20 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground shadow-glow active:scale-95"
                >
                  <Play className="h-8 w-8 fill-current" />
                </button>
              </div>
            )}
          </div>
        )}

        {tracker.status === 'finished' && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <Metric label="Dystans" value={km.toFixed(2)} unit="km" />
              <Metric label="Czas" value={formatDuration(tracker.duration)} />
              <Metric label="Tempo" value={formatPace(tracker.pace)} unit="/km" />
            </div>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Notatki z biegu (opcjonalnie)"
              className="border-white/20 bg-white/10 text-white placeholder:text-white/50"
              rows={2}
            />
            <div className="flex gap-3">
              <Button
                size="lg"
                variant="outline"
                className="h-14 flex-1 rounded-2xl border-white/30 text-white hover:bg-white/10 hover:text-white"
                onClick={() => setDiscardOpen(true)}
              >
                Odrzuć
              </Button>
              <Button
                size="lg"
                className="h-14 flex-[2] rounded-2xl font-bold"
                onClick={handleSave}
                disabled={isSaving || km <= 0}
              >
                {isSaving ? 'Zapisywanie…' : 'Zapisz bieg'}
              </Button>
            </div>
          </div>
        )}
      </div>

      <AlertDialog open={discardOpen} onOpenChange={setDiscardOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Odrzucić bieg?</AlertDialogTitle>
            <AlertDialogDescription>
              Nagrana trasa i czas zostaną bezpowrotnie utracone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction onClick={handleDiscard}>Odrzuć</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
