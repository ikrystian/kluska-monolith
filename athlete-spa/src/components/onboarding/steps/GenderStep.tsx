import { motion } from 'framer-motion';
import { Check, CircleDashed } from 'lucide-react';
import type { Gender } from '@/models/types/user';
import { haptic } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import { Rise } from '../motion';

interface GenderStepProps {
  value: Gender | null;
  onChange: (value: Gender) => void;
}

const MarsIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="10" cy="14" r="5" />
    <path d="M14.5 9.5L19 5" />
    <path d="M19 5v5" />
    <path d="M19 5h-5" />
  </svg>
);

const VenusIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="9" r="5" />
    <path d="M12 14v7" />
    <path d="M9 18h6" />
  </svg>
);

const options: { value: Gender; disabled?: boolean; label: string; icon: React.FC<{ className?: string }> }[] = [
  { value: 'female', label: 'Kobieta', icon: VenusIcon },
  { value: 'male', label: 'Mężczyzna', icon: MarsIcon },
  { value: 'other', disabled: true, label: 'Inna', icon: CircleDashed },
];

export function GenderStep({ value, onChange }: GenderStepProps) {
  return (
    <div role="radiogroup" aria-label="Płeć" className="grid grid-cols-2 gap-3">
      {options.map((option) => {
        const selected = value === option.value;
        const Icon = option.icon;
        const wide = option.value === 'other';
        return (
          <Rise key={option.value} className={cn(wide && 'col-span-2')}>
            <motion.button
              type="button"
              role="radio"
              disabled={option.disabled}
              aria-checked={selected}
              onClick={() => {
                if (option.disabled) return;
                haptic('tap');
                onChange(option.value);
              }}
              whileTap={option.disabled ? undefined : { scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              className={cn(
                'onb-card relative flex w-full rounded-3xl p-4 text-left',
                wide ? 'items-center gap-3' : 'h-44 flex-col items-start justify-between',
                option.disabled && 'cursor-not-allowed opacity-50',
              )}
            >
              {/* One ring shared by both cards: it glides from one choice to the other. */}
              {selected && (
                <motion.span
                  layoutId="gender-selected"
                  className="onb-select-ring"
                  transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                />
              )}
              <motion.span
                animate={selected ? { scale: [1, 1.18, 1], rotate: [0, -8, 0] } : { scale: 1, rotate: 0 }}
                transition={{ duration: 0.45, ease: 'easeOut' }}
                className={cn(
                  'relative grid place-items-center rounded-2xl transition-colors duration-200',
                  wide ? 'h-11 w-11' : 'h-16 w-16',
                  selected ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground',
                )}
              >
                <Icon className={wide ? 'h-5 w-5' : 'h-8 w-8'} />
              </motion.span>
              <span className="relative">
                <span className={cn('block font-display font-bold uppercase leading-none', wide ? 'text-xl' : 'text-[1.75rem]')}>
                  {option.label}
                </span>
                {option.disabled && <span className="mt-0.5 block text-xs text-muted-foreground">Na razie niedostępna</span>}
              </span>
              {selected && (
                <motion.span
                  initial={{ scale: 0, rotate: -45 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 520, damping: 18 }}
                  className="absolute right-3.5 top-3.5 grid h-7 w-7 place-items-center rounded-full bg-primary text-primary-foreground"
                >
                  <Check className="h-4 w-4" strokeWidth={3} />
                </motion.span>
              )}
            </motion.button>
          </Rise>
        );
      })}
    </div>
  );
}
