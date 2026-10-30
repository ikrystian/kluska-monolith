import { Loader2, MapPin, X } from 'lucide-react';
import type { WorkoutGymStatus } from '@/hooks/useWorkoutGym';
import type { GymMatch } from '@/lib/gym-match';

interface DetectedGymProps {
  status: WorkoutGymStatus;
  match: GymMatch | null;
  onDismiss: () => void;
}

/** Row on the finish screen: which gym was detected, with a way to say "not this one". */
export function DetectedGym({ status, match, onDismiss }: DetectedGymProps) {
  if (status === 'locating') {
    return (
      <div className="flex items-center justify-center gap-2 rounded-2xl border border-border/60 bg-secondary/40 px-4 py-3 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Sprawdzam, gdzie trenujesz…
      </div>
    );
  }

  if (status !== 'found' || !match) return null;

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3 text-left">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
        <MapPin className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Miejsce treningu</p>
        <p className="truncate text-sm font-bold">{match.gym.name}</p>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label={`To nie jest ${match.gym.name} — nie zapisuj siłowni`}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-background/70 text-muted-foreground transition-transform active:scale-90"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
