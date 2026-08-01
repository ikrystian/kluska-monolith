import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import * as polyline from 'polyline-encoded';
import { Footprints, Pause, Play, Satellite, Square, TriangleAlert, X } from 'lucide-react';
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
import { useRunTracker } from '@/hooks/useRunTracker';
import { haptic } from '@/lib/haptics';
import { useWakeLock } from '@/hooks/useWakeLock';
import { cn } from '@/lib/utils';

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
  // 5.999 min/km must read 6:00, not 5:60.
  if (seconds === 60) return `${minutes + 1}:00`;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

const Metric = ({ label, value, unit }: { label: string; value: string; unit?: string }) => (
  <div className="text-center">
    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
    <p className="mt-1 font-display text-3xl font-extrabold tabular-nums leading-none">
      {value}
      {unit && <span className="ml-1 text-sm font-semibold text-muted-foreground">{unit}</span>}
    </p>
  </div>
);

export interface RecordedRun {
  /** Kilometres, as the manual form expects. */
  distance: number;
  /** Minutes, as the manual form expects. */
  duration: number;
  /** Minutes per kilometre. */
  avgPace: number;
  polyline: string;
  notes?: string;
}

/**
 * Records a run from the phone's GPS instead of asking for distance and time
 * afterwards.
 *
 * The app already imports routes from Strava and draws them, and runs natively
 * on a device with a GPS — but the only way to log a run of your own was to
 * type in two numbers from memory.
 */
export function RunTracker({
  open,
  onOpenChange,
  onSave,
  isSaving,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (run: RecordedRun) => Promise<void> | void;
  isSaving?: boolean;
}) {
  const tracker = useRunTracker();
  const [notes, setNotes] = useState('');
  const [discardOpen, setDiscardOpen] = useState(false);

  const isActive = tracker.status === 'running' || tracker.status === 'paused';
  useWakeLock(open && isActive);

  const km = tracker.distance / 1000;
  const encodedRoute = useMemo(
    () => polyline.encode(tracker.points.map(p => [p.lat, p.lng])),
    [tracker.points]
  );

  const weakSignal = tracker.accuracy !== null && tracker.accuracy > 40;

  const handleSave = async () => {
    haptic('celebrate');
    await onSave({
      distance: Math.round(km * 100) / 100,
      duration: Math.round((tracker.duration / 60) * 100) / 100,
      avgPace: Math.round(tracker.pace * 100) / 100,
      polyline: encodedRoute,
      notes: notes.trim() || undefined,
    });
    setNotes('');
    tracker.reset();
    onOpenChange(false);
  };

  const requestClose = () => {
    if (isActive && tracker.points.length > 0) {
      setDiscardOpen(true);
      return;
    }
    tracker.reset();
    onOpenChange(false);
  };

  if (!open) return null;

  // Rendered into <body>: the page-transition animation puts a transform on an
  // ancestor of the outlet, which makes `position: fixed` resolve against that
  // element instead of the viewport — the overlay would sit inside the content
  // area, under the header and behind the bottom bar.
  return createPortal(
    <div className="fixed inset-0 z-[60] flex flex-col bg-background pt-[env(safe-area-inset-top)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="hero-ember grid h-9 w-9 place-items-center rounded-xl text-white shadow-glow">
            <Footprints className="h-4 w-4" />
          </span>
          <div>
            <p className="font-headline font-bold leading-tight">Bieg</p>
            <p className="text-[11px] text-muted-foreground">
              {tracker.status === 'running'
                ? 'Nagrywanie…'
                : tracker.status === 'paused'
                  ? 'Wstrzymany'
                  : tracker.status === 'finished'
                    ? 'Zakończony'
                    : 'Gotowy do startu'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={requestClose}
          aria-label="Zamknij"
          className="grid h-10 w-10 place-items-center rounded-full text-muted-foreground active:scale-90 active:bg-secondary"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Signal / permission state */}
      {(tracker.error || weakSignal) && (
        <div
          className={cn(
            'flex items-center gap-2 border-b px-4 py-2',
            tracker.error
              ? 'border-destructive/30 bg-destructive/10'
              : 'border-amber-500/30 bg-amber-500/10'
          )}
        >
          {tracker.error ? (
            <TriangleAlert className="h-3.5 w-3.5 shrink-0 text-destructive" />
          ) : (
            <Satellite className="h-3.5 w-3.5 shrink-0 text-amber-500" />
          )}
          <p
            className={cn(
              'text-[11px] font-semibold',
              tracker.error ? 'text-destructive' : 'text-amber-600 dark:text-amber-400'
            )}
          >
            {tracker.error ?? `Słaby sygnał GPS (±${Math.round(tracker.accuracy ?? 0)} m) — dystans może być niedokładny`}
          </p>
        </div>
      )}

      {tracker.hasRecoverableRun && tracker.duration > 0 && tracker.status === 'paused' && (
        <div className="border-b border-primary/30 bg-primary/10 px-4 py-2">
          <p className="text-[11px] font-semibold text-primary">
            Znaleziono przerwany bieg — wznów go lub zapisz.
          </p>
        </div>
      )}

      {/* Live metrics */}
      <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6">
        <div className="text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground">Dystans</p>
          <p className="mt-2 font-display text-[4.5rem] font-extrabold leading-none tabular-nums">
            {km.toFixed(2)}
          </p>
          <p className="text-sm font-semibold text-muted-foreground">km</p>
        </div>

        <div className="grid w-full max-w-xs grid-cols-2 gap-4">
          <Metric label="Czas" value={formatDuration(tracker.duration)} />
          <Metric label="Tempo" value={formatPace(tracker.pace)} unit="/km" />
        </div>

        {tracker.status === 'finished' && (
          <Textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Notatki z biegu (opcjonalnie)"
            className="max-w-xs"
            rows={2}
          />
        )}
      </div>

      {/* Controls */}
      <div className="border-t border-border/50 px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-4">
        {tracker.status === 'idle' && (
          <Button
            size="lg"
            className="h-14 w-full rounded-2xl text-base font-bold"
            onClick={() => {
              haptic('impact');
              tracker.start();
            }}
          >
            <Play className="mr-2 h-5 w-5 fill-current" /> Start
          </Button>
        )}

        {tracker.status === 'running' && (
          <div className="flex gap-3">
            <Button
              size="lg"
              variant="secondary"
              className="h-14 flex-1 rounded-2xl"
              onClick={() => {
                haptic('impact');
                tracker.pause();
              }}
            >
              <Pause className="mr-2 h-5 w-5" /> Pauza
            </Button>
            <Button
              size="lg"
              variant="destructive"
              className="h-14 flex-1 rounded-2xl"
              onClick={() => {
                haptic('impact');
                tracker.finish();
              }}
            >
              <Square className="mr-2 h-4 w-4 fill-current" /> Zakończ
            </Button>
          </div>
        )}

        {tracker.status === 'paused' && (
          <div className="flex gap-3">
            <Button
              size="lg"
              className="h-14 flex-1 rounded-2xl"
              onClick={() => {
                haptic('impact');
                tracker.resume();
              }}
            >
              <Play className="mr-2 h-5 w-5 fill-current" /> Wznów
            </Button>
            <Button
              size="lg"
              variant="destructive"
              className="h-14 flex-1 rounded-2xl"
              onClick={() => {
                haptic('impact');
                tracker.finish();
              }}
            >
              <Square className="mr-2 h-4 w-4 fill-current" /> Zakończ
            </Button>
          </div>
        )}

        {tracker.status === 'finished' && (
          <div className="flex gap-3">
            <Button
              size="lg"
              variant="outline"
              className="h-14 flex-1 rounded-2xl"
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
            <AlertDialogAction
              onClick={() => {
                tracker.reset();
                setNotes('');
                onOpenChange(false);
              }}
            >
              Odrzuć
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>,
    document.body
  );
}
