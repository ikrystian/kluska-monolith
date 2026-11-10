import type { TrainingLevelType } from '@/models/types/user';
import { cn } from '@/lib/utils';

interface TrainingLevelStepProps {
  value: TrainingLevelType | null;
  onChange: (value: TrainingLevelType) => void;
}

const levels: { value: TrainingLevelType; label: string; description: string; bars: number }[] = [
  { value: 'beginner', label: 'Początkujący', description: 'Zaczynam albo ćwiczę od niedawna', bars: 1 },
  { value: 'intermediate', label: 'Średniozaawansowany', description: 'Trenuję regularnie od kilku miesięcy, znam technikę', bars: 2 },
  { value: 'advanced', label: 'Zaawansowany', description: 'Trenuję od lat, znam różne metody i periodyzację', bars: 3 },
];

/** Three rising bars — reads as "level" at a glance, like a signal meter. */
function LevelBars({ count, active }: { count: number; active: boolean }) {
  return (
    <span className="flex h-8 items-end gap-1" aria-hidden>
      {[1, 2, 3].map((n) => (
        <span
          key={n}
          className={cn(
            'w-2 rounded-sm transition-colors',
            n <= count ? (active ? 'bg-primary' : 'bg-foreground/70') : 'bg-secondary',
          )}
          style={{ height: `${n * 33}%` }}
        />
      ))}
    </span>
  );
}

export function TrainingLevelStep({ value, onChange }: TrainingLevelStepProps) {
  return (
    <div role="radiogroup" aria-label="Poziom zaawansowania" className="space-y-3">
      {levels.map((level) => {
        const selected = value === level.value;
        return (
          <button
            key={level.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(level.value)}
            className={cn(
              'flex w-full items-center gap-4 rounded-2xl bg-card p-4 text-left transition-[box-shadow,background-color,transform] duration-200 active:scale-[0.98]',
              selected ? 'bg-primary/10 ring-2 ring-primary' : 'ring-1 ring-border',
            )}
          >
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-secondary/70">
              <LevelBars count={level.bars} active={selected} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-[17px] font-semibold leading-tight">{level.label}</span>
                {level.value === 'beginner' && (
                  <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary">Najczęstszy</span>
                )}
              </span>
              <span className="mt-0.5 block text-sm leading-snug text-muted-foreground">{level.description}</span>
            </span>
            <span
              className={cn(
                'grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 transition-colors',
                selected ? 'border-primary bg-primary' : 'border-input',
              )}
              aria-hidden
            >
              {selected && <span className="h-2 w-2 rounded-full bg-primary-foreground" />}
            </span>
          </button>
        );
      })}
    </div>
  );
}
