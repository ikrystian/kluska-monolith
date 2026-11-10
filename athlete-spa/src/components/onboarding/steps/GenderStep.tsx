import { motion } from 'framer-motion';
import { Check, CircleDashed } from 'lucide-react';
import type { Gender } from '@/models/types/user';
import { cn } from '@/lib/utils';

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

const options: { value: Gender; label: string; icon: React.FC<{ className?: string }> }[] = [
  { value: 'female', label: 'Kobieta', icon: VenusIcon },
  { value: 'male', label: 'Mężczyzna', icon: MarsIcon },
  { value: 'other', label: 'Inna', icon: CircleDashed },
];

export function GenderStep({ value, onChange }: GenderStepProps) {
  return (
    <div role="radiogroup" aria-label="Płeć" className="grid grid-cols-2 gap-3">
      {options.map((option) => {
        const selected = value === option.value;
        const Icon = option.icon;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              'relative flex flex-col items-start justify-between gap-6 rounded-2xl bg-card p-4 text-left transition-[box-shadow,background-color,transform] duration-200 active:scale-[0.98]',
              option.value === 'other' && 'col-span-2 flex-row items-center justify-start gap-3',
              selected ? 'bg-primary/10 ring-2 ring-primary' : 'ring-1 ring-border',
            )}
          >
            <span
              className={cn(
                'grid h-12 w-12 place-items-center rounded-xl transition-colors',
                selected ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground',
              )}
            >
              <Icon className="h-6 w-6" />
            </span>
            <span className="text-lg font-semibold">{option.label}</span>
            {selected && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute right-3 top-3 grid h-6 w-6 place-items-center rounded-full bg-primary text-primary-foreground"
              >
                <Check className="h-3.5 w-3.5" strokeWidth={3} />
              </motion.span>
            )}
          </button>
        );
      })}
    </div>
  );
}
