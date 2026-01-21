'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface OnboardingProgressProps {
  progress: number;
  currentStep: number;
  totalSteps: number;
  isDataStep: boolean;
}

export function OnboardingProgress({
  progress,
  currentStep,
  totalSteps,
  isDataStep,
}: OnboardingProgressProps) {
  if (!isDataStep) return null;

  // Data steps are 1-6 (name to trainingLevel)
  const dataStepNumber = currentStep; // currentStep 1 = name (step 1), currentStep 6 = trainingLevel (step 6)
  const totalDataSteps = totalSteps - 2; // Exclude welcome and summary

  return (
    <div className="w-full max-w-md mx-auto px-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-muted-foreground">
          Krok {dataStepNumber} z {totalDataSteps}
        </span>
        <span className="text-sm font-medium text-primary">
          {Math.round(progress)}%
        </span>
      </div>
      <div className="h-2 bg-secondary rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
      {/* Step indicators */}
      <div className="flex justify-between mt-3">
        {Array.from({ length: totalDataSteps }).map((_, index) => {
          const isActive = index === dataStepNumber - 1;
          const isCompleted = index < dataStepNumber - 1;

          return (
            <motion.div
              key={index}
              className={cn(
                'w-2.5 h-2.5 rounded-full transition-all duration-300',
                isCompleted
                  ? 'bg-primary'
                  : isActive
                    ? 'bg-primary ring-4 ring-primary/20'
                    : 'bg-secondary'
              )}
              initial={{ scale: 0.8 }}
              animate={{
                scale: isActive ? 1.3 : 1,
              }}
              transition={{ duration: 0.3, type: 'spring', stiffness: 300 }}
            />
          );
        })}
      </div>
    </div>
  );
}