'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Check, Loader2, Sparkles, User, Calendar, Ruler, Weight, Trophy } from 'lucide-react';
import { OnboardingState } from '@/hooks/useOnboarding';
import { useMemo } from 'react';

interface SummaryStepProps {
  data: OnboardingState;
  onSubmit: () => void;
  onPrev: () => void;
  onEdit: (step: number) => void;
  isSubmitting: boolean;
}

const genderLabels = {
  male: 'Mężczyzna',
  female: 'Kobieta',
  other: 'Inna',
};

const trainingLevelLabels = {
  beginner: 'Początkujący',
  intermediate: 'Średniozaawansowany',
  advanced: 'Zaawansowany',
};

export function SummaryStep({ data, onSubmit, onPrev, onEdit, isSubmitting }: SummaryStepProps) {
  const age = useMemo(() => {
    if (!data.dateOfBirth) return null;
    const birthDate = new Date(data.dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }, [data.dateOfBirth]);

  const summaryItems = [
    {
      icon: User,
      label: 'Imię',
      value: data.name,
      editStep: 1,
      color: 'from-blue-500 to-blue-600',
    },
    {
      icon: User,
      label: 'Płeć',
      value: data.gender ? genderLabels[data.gender] : '-',
      editStep: 2,
      color: 'from-pink-500 to-pink-600',
    },
    {
      icon: Calendar,
      label: 'Wiek',
      value: age ? `${age} lat` : '-',
      editStep: 3,
      color: 'from-orange-500 to-red-500',
    },
    {
      icon: Ruler,
      label: 'Wzrost',
      value: data.height ? `${data.height} cm` : '-',
      editStep: 4,
      color: 'from-green-500 to-emerald-600',
    },
    {
      icon: Weight,
      label: 'Waga',
      value: data.weight ? `${data.weight} kg` : '-',
      editStep: 5,
      color: 'from-amber-500 to-orange-600',
    },
    {
      icon: Trophy,
      label: 'Poziom',
      value: data.trainingLevel ? trainingLevelLabels[data.trainingLevel] : '-',
      editStep: 6,
      color: 'from-purple-500 to-indigo-600',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center px-6 py-8"
    >
      {/* Success Icon */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
        className="relative mb-6"
      >
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-xl">
          <Check className="w-10 h-10 text-white" />
        </div>
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            rotate: [0, 8, -8, 0],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute -top-2 -right-2"
        >
          <Sparkles className="w-8 h-8 text-yellow-400" />
        </motion.div>
      </motion.div>

      {/* Title */}
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-2xl font-bold text-center mb-3"
      >
        Wszystko gotowe!
      </motion.h2>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-muted-foreground text-center mb-8"
      >
        Sprawdź swoje dane przed rozpoczęciem
      </motion.p>

      {/* Summary Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="w-full max-w-sm space-y-3 mb-8"
      >
        {summaryItems.map((item, index) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 + index * 0.05 }}
              className="flex items-center gap-4 p-3 rounded-xl bg-secondary/50 hover:bg-secondary/70 transition-colors group"
            >
              <div
                className={`w-10 h-10 rounded-full bg-gradient-to-br ${item.color} flex items-center justify-center shrink-0`}
              >
                <Icon className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground">{item.label}</p>
                <p className="font-semibold truncate">{item.value}</p>
              </div>
              <button
                onClick={() => onEdit(item.editStep)}
                className="text-sm text-primary opacity-0 group-hover:opacity-100 transition-opacity hover:underline"
              >
                Edytuj
              </button>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Navigation */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
        className="flex flex-col gap-3 w-full max-w-sm"
      >
        <Button
          onClick={onSubmit}
          disabled={isSubmitting}
          size="lg"
          className="w-full h-14 text-lg font-semibold rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Zapisywanie...
            </>
          ) : (
            <>
              Rozpocznij trening
              <Sparkles className="w-5 h-5 ml-2" />
            </>
          )}
        </Button>
        <Button
          variant="outline"
          onClick={onPrev}
          disabled={isSubmitting}
          className="w-full h-12 rounded-xl"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Wróć do edycji
        </Button>
      </motion.div>
    </motion.div>
  );
}