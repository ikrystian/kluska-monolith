import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import type { TrainingLevelType } from '@/models/types/user';
import { haptic } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import { Rise } from '../motion';

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
export function LevelBars({ count, active, className }: { count: number; active: boolean; className?: string }) {
  return (
    <span className={cn('flex h-8 items-end gap-1', className)} aria-hidden>
      {[1, 2, 3].map((n) => {
        const on = n <= count;
        return (
          <span key={n} className="relative w-2 overflow-hidden rounded-sm bg-foreground/10" style={{ height: `${n * 33}%` }}>
            <motion.span
              className={cn('absolute inset-0 origin-bottom rounded-sm', active ? 'bg-primary' : 'bg-foreground/60')}
              initial={false}
              // Keyframes replay the climb each time the card becomes the chosen one.
              animate={{ scaleY: on ? (active ? [0.25, 1] : 1) : 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: active && on ? n * 0.07 : 0 }}
            />
          </span>
        );
      })}
    </span>
  );
}

export function TrainingLevelStep({ value, onChange }: TrainingLevelStepProps) {
  return (
    <div role="radiogroup" aria-label="Poziom zaawansowania" className="space-y-3">
      {levels.map((level) => {
        const selected = value === level.value;
        return (
          <Rise key={level.value}>
            <motion.button
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => {
                haptic('tap');
                onChange(level.value);
              }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              className="onb-card relative flex w-full items-center gap-4 rounded-3xl p-4 text-left"
            >
              {selected && (
                <motion.span
                  layoutId="level-selected"
                  className="onb-select-ring"
                  transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                />
              )}
              <span
                className={cn(
                  'relative grid h-14 w-14 shrink-0 place-items-center rounded-2xl transition-colors duration-200',
                  selected ? 'bg-primary/15' : 'bg-secondary/70',
                )}
              >
                <LevelBars count={level.bars} active={selected} />
              </span>
              <span className="relative min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-display text-[1.375rem] font-bold uppercase leading-none">{level.label}</span>
                  {level.value === 'beginner' && (
                    <span className="rounded-full bg-lime px-2 py-0.5 text-[11px] font-semibold text-lime-foreground">Najczęstszy</span>
                  )}
                </span>
                <span className="mt-1 block text-sm leading-snug text-muted-foreground">{level.description}</span>
              </span>
              <span
                className={cn(
                  'relative grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 transition-colors duration-200',
                  selected ? 'border-primary bg-primary text-primary-foreground' : 'border-input',
                )}
                aria-hidden
              >
                {selected && (
                  <motion.span
                    initial={{ scale: 0, rotate: -45 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 520, damping: 18 }}
                  >
                    <Check className="h-4 w-4" strokeWidth={3} />
                  </motion.span>
                )}
              </span>
            </motion.button>
          </Rise>
        );
      })}
    </div>
  );
}
