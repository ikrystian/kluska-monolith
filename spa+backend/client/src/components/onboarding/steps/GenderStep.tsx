'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, CircleDashed } from 'lucide-react';
import { Gender } from '@/models/types/user';
import { cn } from '@/lib/utils';

interface GenderStepProps {
  value: Gender | null;
  onChange: (value: Gender) => void;
  onNext: () => void;
  onPrev: () => void;
  canProceed: boolean;
}

// Custom Mars icon (♂)
const MarsIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="10" cy="14" r="5" />
    <path d="M14.5 9.5L19 5" />
    <path d="M19 5v5" />
    <path d="M19 5h-5" />
  </svg>
);

// Custom Venus icon (♀)
const VenusIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="9" r="5" />
    <path d="M12 14v7" />
    <path d="M9 18h6" />
  </svg>
);

const genderOptions: { value: Gender; label: string; icon: React.FC<{ className?: string }>; color: string }[] = [
  { value: 'male', label: 'Mężczyzna', icon: MarsIcon, color: 'from-blue-500 to-blue-600' },
  { value: 'female', label: 'Kobieta', icon: VenusIcon, color: 'from-pink-500 to-pink-600' },
  { value: 'other', label: 'Inna', icon: CircleDashed, color: 'from-purple-500 to-purple-600' },
];

export function GenderStep({ value, onChange, onNext, onPrev, canProceed }: GenderStepProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center px-6 py-8"
    >
      {/* Animated silhouettes */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
        className="flex gap-4 mb-8"
      >
        {genderOptions.map((option, index) => (
          <motion.div
            key={option.value}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + index * 0.1 }}
            className={cn(
              'w-16 h-16 rounded-full flex items-center justify-center',
              value === option.value
                ? `bg-gradient-to-br ${option.color} shadow-lg`
                : 'bg-secondary'
            )}
          >
            <option.icon className={cn(
              'w-8 h-8',
              value === option.value ? 'text-white' : 'text-muted-foreground'
            )} />
          </motion.div>
        ))}
      </motion.div>

      {/* Title */}
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-2xl font-bold text-center mb-3"
      >
        Wybierz swoją płeć
      </motion.h2>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-muted-foreground text-center mb-8"
      >
        Pomoże nam to lepiej dostosować treningi
      </motion.p>

      {/* Gender Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="w-full max-w-sm space-y-4 mb-8"
      >
        {genderOptions.map((option, index) => (
          <motion.button
            key={option.value}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 + index * 0.1 }}
            onClick={() => onChange(option.value)}
            className={cn(
              'w-full p-4 rounded-xl border-2 flex items-center gap-4 transition-all duration-300',
              value === option.value
                ? `border-primary bg-primary/10 shadow-md`
                : 'border-secondary hover:border-primary/50 hover:bg-secondary/50'
            )}
          >
            <div
              className={cn(
                'w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300',
                value === option.value
                  ? `bg-gradient-to-br ${option.color}`
                  : 'bg-secondary'
              )}
            >
              <option.icon className={cn(
                'w-7 h-7',
                value === option.value ? 'text-white' : 'text-muted-foreground'
              )} />
            </div>
            <span className="text-lg font-medium">{option.label}</span>
            {value === option.value && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="ml-auto w-6 h-6 rounded-full bg-primary flex items-center justify-center"
              >
                <svg
                  className="w-4 h-4 text-primary-foreground"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </motion.div>
            )}
          </motion.button>
        ))}
      </motion.div>

      {/* Navigation */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
        className="flex gap-4 w-full max-w-sm"
      >
        <Button
          variant="outline"
          onClick={onPrev}
          className="flex-1 h-12 rounded-xl"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Wstecz
        </Button>
        <Button
          onClick={onNext}
          disabled={!canProceed}
          className="flex-1 h-12 rounded-xl bg-gradient-to-r from-primary to-primary/80"
        >
          Dalej
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </motion.div>
    </motion.div>
  );
}