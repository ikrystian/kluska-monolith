'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, ArrowRight, User } from 'lucide-react';

interface NameStepProps {
  value: string;
  onChange: (value: string) => void;
  onNext: () => void;
  onPrev: () => void;
  canProceed: boolean;
}

export function NameStep({ value, onChange, onNext, onPrev, canProceed }: NameStepProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (canProceed) {
      onNext();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center px-6 py-8"
    >
      {/* Icon */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
        className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mb-8 shadow-xl"
      >
        <User className="w-10 h-10 text-white" />
      </motion.div>

      {/* Title */}
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-2xl font-bold text-center mb-3"
      >
        Jak masz na imię?
      </motion.h2>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-muted-foreground text-center mb-8"
      >
        Podaj swoje imię, abyśmy mogli się do Ciebie zwracać
      </motion.p>

      {/* Form */}
      <motion.form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-6"
      >
        <div className="space-y-2">
          <Label htmlFor="name" className="sr-only">
            Imię
          </Label>
          <Input
            id="name"
            type="text"
            placeholder="Wpisz swoje imię..."
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="h-14 text-lg text-center rounded-xl border-2 focus:border-primary transition-colors"
            autoFocus
          />
          {value.length > 0 && value.length < 2 && (
            <p className="text-sm text-destructive text-center">
              Imię musi mieć co najmniej 2 znaki
            </p>
          )}
        </div>

        {/* Navigation */}
        <div className="flex gap-4 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onPrev}
            className="flex-1 h-12 rounded-xl"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Wstecz
          </Button>
          <Button
            type="submit"
            disabled={!canProceed}
            className="flex-1 h-12 rounded-xl bg-gradient-to-r from-primary to-primary/80"
          >
            Dalej
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </motion.form>
    </motion.div>
  );
}