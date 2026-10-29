import { haptic } from '@/lib/haptics';
import { cn } from '@/lib/utils';

/** The usable end of the RPE scale; below 6 the reading stops being reliable. */
export const RPE_VALUES = [6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10] as const;

/** Reps left in reserve, which is how most athletes actually judge a set. */
export function rpeToRir(rpe: number): string {
  const rir = 10 - rpe;
  if (rir <= 0) return 'do upadku';
  if (rir === 0.5) return '~0 powt. zapasu';
  return `${rir} powt. zapasu`;
}

/**
 * Rate of perceived exertion for a finished set.
 *
 * Without it a log records what was lifted but not what it cost, so there is
 * no way to tell a comfortable triple from a grinder at the same weight —
 * which is the difference between progressing and stalling.
 *
 * Presented as chips rather than a numeric field: it is answered right after a
 * set, with shaky hands, and the scale has nine valid values. Once answered it
 * disappears for that set, so a list of finished sets stays short.
 */
export function RpeSelector({
  value,
  onChange,
  className,
}: {
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  className?: string;
}) {
  // Every valid rating is ≥ 6, so anything falsy (undefined, or null/'' from the form) means "not rated yet".
  if (value) return null;

  const select = (rpe: number) => {
    haptic('tap');
    onChange(rpe);
  };

  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-baseline justify-between gap-2 px-0.5">
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          RPE
        </span>
        <span className="text-[10px] text-muted-foreground">jak ciężka była seria?</span>
      </div>
      <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5">
        {RPE_VALUES.map(rpe => (
          <button
            key={rpe}
            type="button"
            onClick={() => select(rpe)}
            aria-label={`RPE ${rpe} — ${rpeToRir(rpe)}`}
            className="h-9 min-w-[2.75rem] shrink-0 rounded-xl border border-border/60 text-sm font-bold tabular-nums text-muted-foreground transition-all active:scale-90"
          >
            {rpe}
          </button>
        ))}
      </div>
    </div>
  );
}
