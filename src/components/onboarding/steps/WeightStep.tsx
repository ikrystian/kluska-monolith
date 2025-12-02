'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { ArrowLeft, ArrowRight, Weight } from 'lucide-react';
import { useMemo } from 'react';

interface WeightStepProps {
  value: number | null;
  height: number | null;
  onChange: (value: number) => void;
  onNext: () => void;
  onPrev: () => void;
  canProceed: boolean;
}

export function WeightStep({ value, height, onChange, onNext, onPrev, canProceed }: WeightStepProps) {
  const weight = value ?? 70;

  // Calculate BMI
  const bmi = useMemo(() => {
    if (!height || !value) return null;
    const heightInMeters = height / 100;
    return value / (heightInMeters * heightInMeters);
  }, [height, value]);

  const getBmiCategory = (bmi: number): { label: string; color: string } => {
    if (bmi < 18.5) return { label: 'Niedowaga', color: 'text-blue-500' };
    if (bmi < 25) return { label: 'Waga prawidłowa', color: 'text-green-500' };
    if (bmi < 30) return { label: 'Nadwaga', color: 'text-yellow-500' };
    return { label: 'Otyłość', color: 'text-red-500' };
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (!isNaN(val) && val >= 30 && val <= 300) {
      onChange(val);
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
        className="relative mb-6"
      >
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-xl">
          <Weight className="w-10 h-10 text-white" />
        </div>
        {/* Animated weight plates */}
        <motion.div
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute -left-4 top-1/2 -translate-y-1/2 w-6 h-10 bg-gray-700 rounded"
        />
        <motion.div
          animate={{ rotate: [0, -10, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
          className="absolute -right-4 top-1/2 -translate-y-1/2 w-6 h-10 bg-gray-700 rounded"
        />
      </motion.div>

      {/* Title */}
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-2xl font-bold text-center mb-3"
      >
        Ile ważysz?
      </motion.h2>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-muted-foreground text-center mb-8"
      >
        Twoja aktualna waga pomoże śledzić postępy
      </motion.p>

      {/* Weight Display */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5 }}
        className="mb-6 text-center"
      >
        <div className="flex items-center justify-center gap-2">
          <Input
            type="number"
            value={weight}
            onChange={handleInputChange}
            min={30}
            max={300}
            step={0.1}
            className="w-32 h-16 text-4xl font-bold text-center border-2 rounded-xl"
          />
          <span className="text-xl text-muted-foreground">kg</span>
        </div>
      </motion.div>

      {/* Weight Slider */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="w-full max-w-sm mb-6"
      >
        {/* Visual weight representation */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            {/* Scale platform */}
            <div className="w-40 h-4 bg-gradient-to-b from-gray-300 to-gray-400 rounded-lg shadow-md" />
            {/* Scale base */}
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-32 h-2 bg-gray-500 rounded-b-lg" />
            {/* Weight indicator */}
            <motion.div
              className="absolute -top-8 left-1/2 -translate-x-1/2"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 1 }}
            >
              <div className="flex items-end gap-1">
                {Array.from({ length: Math.min(5, Math.ceil(weight / 30)) }).map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{ delay: 0.7 + i * 0.1 }}
                    className="w-6 bg-gradient-to-t from-amber-600 to-amber-400 rounded-t"
                    style={{ height: `${20 + (i + 1) * 8}px` }}
                  />
                ))}
              </div>
            </motion.div>
          </div>
        </div>

        <Slider
          value={[weight]}
          onValueChange={([v]) => onChange(v)}
          min={30}
          max={200}
          step={0.5}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground mt-2">
          <span>30 kg</span>
          <span>115 kg</span>
          <span>200 kg</span>
        </div>
      </motion.div>

      {/* BMI Indicator */}
      {bmi && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="bg-secondary/50 rounded-xl p-4 text-center mb-6 w-full max-w-sm"
        >
          <p className="text-muted-foreground text-sm">Twoje BMI:</p>
          <p className="text-2xl font-bold">{bmi.toFixed(1)}</p>
          <p className={`text-sm font-medium ${getBmiCategory(bmi).color}`}>
            {getBmiCategory(bmi).label}
          </p>
        </motion.div>
      )}

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