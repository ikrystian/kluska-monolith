'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, Sprout, Dumbbell, Trophy } from 'lucide-react';
import { TrainingLevelType } from '@/models/types/user';
import { cn } from '@/lib/utils';

interface TrainingLevelStepProps {
  value: TrainingLevelType | null;
  onChange: (value: TrainingLevelType) => void;
  onNext: () => void;
  onPrev: () => void;
  canProceed: boolean;
}

const levelOptions: {
  value: TrainingLevelType;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
}[] = [
  {
    value: 'beginner',
    label: 'Początkujący',
    description: 'Dopiero zaczynam swoją przygodę z siłownią lub ćwiczę od niedawna',
    icon: Sprout,
    color: 'from-green-500 to-emerald-600',
    bgColor: 'bg-green-500/10',
  },
  {
    value: 'intermediate',
    label: 'Średniozaawansowany',
    description: 'Regularnie ćwiczę od kilku miesięcy, znam podstawowe techniki',
    icon: Dumbbell,
    color: 'from-blue-500 to-indigo-600',
    bgColor: 'bg-blue-500/10',
  },
  {
    value: 'advanced',
    label: 'Zaawansowany',
    description: 'Trenuję od lat, mam doświadczenie w różnych metodach treningowych',
    icon: Trophy,
    color: 'from-amber-500 to-orange-600',
    bgColor: 'bg-amber-500/10',
  },
];

export function TrainingLevelStep({
  value,
  onChange,
  onNext,
  onPrev,
  canProceed,
}: TrainingLevelStepProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center px-6 py-8"
    >
      {/* Animated icons */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
        className="flex gap-2 mb-8"
      >
        {levelOptions.map((option, index) => {
          const Icon = option.icon;
          return (
            <motion.div
              key={option.value}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + index * 0.1 }}
              className={cn(
                'w-14 h-14 rounded-full flex items-center justify-center',
                value === option.value
                  ? `bg-gradient-to-br ${option.color} shadow-lg`
                  : 'bg-secondary'
              )}
            >
              <Icon
                className={cn(
                  'w-7 h-7',
                  value === option.value ? 'text-white' : 'text-muted-foreground'
                )}
              />
            </motion.div>
          );
        })}
      </motion.div>

      {/* Title */}
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-2xl font-bold text-center mb-3"
      >
        Jaki jest Twój poziom?
      </motion.h2>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-muted-foreground text-center mb-8"
      >
        Dopasujemy treningi do Twojego doświadczenia
      </motion.p>

      {/* Level Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="w-full max-w-sm space-y-4 mb-8"
      >
        {levelOptions.map((option, index) => {
          const Icon = option.icon;
          const isSelected = value === option.value;

          return (
            <motion.button
              key={option.value}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 + index * 0.1 }}
              onClick={() => onChange(option.value)}
              className={cn(
                'w-full p-4 rounded-xl border-2 flex items-start gap-4 transition-all duration-300 text-left',
                isSelected
                  ? `border-primary ${option.bgColor} shadow-md`
                  : 'border-secondary hover:border-primary/50 hover:bg-secondary/50'
              )}
            >
              <div
                className={cn(
                  'w-12 h-12 rounded-full flex items-center justify-center shrink-0 transition-all duration-300',
                  isSelected
                    ? `bg-gradient-to-br ${option.color}`
                    : 'bg-secondary'
                )}
              >
                <Icon
                  className={cn(
                    'w-6 h-6',
                    isSelected ? 'text-white' : 'text-muted-foreground'
                  )}
                />
              </div>
              <div className="flex-1">
                <span className="text-lg font-semibold block">{option.label}</span>
                <span className="text-sm text-muted-foreground">{option.description}</span>
              </div>
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0 mt-1"
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
          );
        })}
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