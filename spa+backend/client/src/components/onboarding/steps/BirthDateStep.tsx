'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, Calendar, Cake } from 'lucide-react';
import { useMemo, useState } from 'react';

interface BirthDateStepProps {
  value: string;
  onChange: (value: string) => void;
  onNext: () => void;
  onPrev: () => void;
  canProceed: boolean;
}

export function BirthDateStep({ value, onChange, onNext, onPrev, canProceed }: BirthDateStepProps) {
  const [day, setDay] = useState(value ? new Date(value).getDate().toString() : '');
  const [month, setMonth] = useState(value ? (new Date(value).getMonth() + 1).toString() : '');
  const [year, setYear] = useState(value ? new Date(value).getFullYear().toString() : '');

  const age = useMemo(() => {
    if (!value) return null;
    const birthDate = new Date(value);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }, [value]);

  const updateDate = (newDay: string, newMonth: string, newYear: string) => {
    setDay(newDay);
    setMonth(newMonth);
    setYear(newYear);

    // Only update if all fields are valid
    const d = parseInt(newDay);
    const m = parseInt(newMonth);
    const y = parseInt(newYear);

    if (d >= 1 && d <= 31 && m >= 1 && m <= 12 && y >= 1920 && y <= new Date().getFullYear()) {
      const date = new Date(y, m - 1, d);
      // Validate the date is valid (e.g., not Feb 30)
      if (date.getDate() === d && date.getMonth() === m - 1 && date.getFullYear() === y) {
        onChange(date.toISOString().split('T')[0]);
      }
    }
  };

  const months = [
    { value: '1', label: 'Styczeń' },
    { value: '2', label: 'Luty' },
    { value: '3', label: 'Marzec' },
    { value: '4', label: 'Kwiecień' },
    { value: '5', label: 'Maj' },
    { value: '6', label: 'Czerwiec' },
    { value: '7', label: 'Lipiec' },
    { value: '8', label: 'Sierpień' },
    { value: '9', label: 'Wrzesień' },
    { value: '10', label: 'Październik' },
    { value: '11', label: 'Listopad' },
    { value: '12', label: 'Grudzień' },
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => currentYear - 13 - i);

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
        className="relative mb-8"
      >
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-xl">
          <Calendar className="w-10 h-10 text-white" />
        </div>
        <motion.div
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute -top-2 -right-2"
        >
          <Cake className="w-8 h-8 text-pink-400" />
        </motion.div>
      </motion.div>

      {/* Title */}
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-2xl font-bold text-center mb-3"
      >
        Kiedy się urodziłeś?
      </motion.h2>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-muted-foreground text-center mb-8"
      >
        Twój wiek pomoże nam dostosować intensywność treningów
      </motion.p>

      {/* Date Input */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="w-full max-w-sm space-y-4 mb-6"
      >
        <div className="flex gap-3">
          {/* Day */}
          <div className="flex-1">
            <label className="block text-sm text-muted-foreground mb-1 text-center">Dzień</label>
            <select
              value={day}
              onChange={(e) => updateDate(e.target.value, month, year)}
              className="w-full h-12 rounded-xl border-2 bg-background text-center text-lg focus:border-primary transition-colors"
            >
              <option value="">--</option>
              {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d.toString()}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Month */}
          <div className="flex-[2]">
            <label className="block text-sm text-muted-foreground mb-1 text-center">Miesiąc</label>
            <select
              value={month}
              onChange={(e) => updateDate(day, e.target.value, year)}
              className="w-full h-12 rounded-xl border-2 bg-background text-center text-lg focus:border-primary transition-colors"
            >
              <option value="">--</option>
              {months.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {/* Year */}
          <div className="flex-1">
            <label className="block text-sm text-muted-foreground mb-1 text-center">Rok</label>
            <select
              value={year}
              onChange={(e) => updateDate(day, month, e.target.value)}
              className="w-full h-12 rounded-xl border-2 bg-background text-center text-lg focus:border-primary transition-colors"
            >
              <option value="">--</option>
              {years.map((y) => (
                <option key={y} value={y.toString()}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Age Display */}
        {age !== null && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-secondary/50 rounded-xl p-4 text-center"
          >
            <p className="text-muted-foreground">Twój wiek:</p>
            <p className="text-3xl font-bold text-primary">{age} lat</p>
          </motion.div>
        )}

        {age !== null && (age < 13 || age > 100) && (
          <p className="text-sm text-destructive text-center">
            Wiek musi być między 13 a 100 lat
          </p>
        )}
      </motion.div>

      {/* Navigation */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
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