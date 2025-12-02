'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ArrowLeft, ArrowRight, Ruler } from 'lucide-react';

interface HeightStepProps {
  value: number | null;
  onChange: (value: number) => void;
  onNext: () => void;
  onPrev: () => void;
  canProceed: boolean;
}

export function HeightStep({ value, onChange, onNext, onPrev, canProceed }: HeightStepProps) {
  const height = value ?? 170;

  // Visual representation of height
  const minHeight = 100;
  const maxHeight = 250;
  const heightPercentage = ((height - minHeight) / (maxHeight - minHeight)) * 100;

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
        className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center mb-6 shadow-xl"
      >
        <Ruler className="w-10 h-10 text-white" />
      </motion.div>

      {/* Title */}
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-2xl font-bold text-center mb-3"
      >
        Jaki jest Twój wzrost?
      </motion.h2>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-muted-foreground text-center mb-8"
      >
        Pomoże nam to obliczyć Twoje BMI i dostosować ćwiczenia
      </motion.p>

      {/* Height Display */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5 }}
        className="mb-8 text-center"
      >
        <div className="text-6xl font-bold bg-gradient-to-r from-green-500 to-emerald-500 bg-clip-text text-transparent">
          {height}
        </div>
        <div className="text-xl text-muted-foreground">cm</div>
      </motion.div>

      {/* Visual Height Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="w-full max-w-sm mb-8"
      >
        <div className="relative flex items-end justify-center gap-6 h-40 mb-6">
          {/* Ruler markings */}
          <div className="absolute left-0 h-full flex flex-col justify-between text-xs text-muted-foreground">
            <span>250</span>
            <span>200</span>
            <span>170</span>
            <span>140</span>
            <span>100</span>
          </div>

          {/* Person silhouette */}
          <motion.div
            className="relative flex flex-col items-center"
            animate={{ height: `${heightPercentage}%` }}
            transition={{ type: 'spring', stiffness: 100, damping: 15 }}
          >
            {/* Head */}
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/70 mb-1" />
            {/* Body */}
            <div
              className="w-12 flex-1 min-h-[20px] rounded-t-lg bg-gradient-to-b from-primary/80 to-primary/50"
              style={{ maxHeight: '100px' }}
            />
            {/* Legs */}
            <div className="flex gap-1">
              <div className="w-5 h-12 rounded-b-lg bg-gradient-to-b from-primary/50 to-primary/30" />
              <div className="w-5 h-12 rounded-b-lg bg-gradient-to-b from-primary/50 to-primary/30" />
            </div>
          </motion.div>

          {/* Ruler bar */}
          <div className="w-4 h-full bg-secondary rounded-full relative overflow-hidden">
            <motion.div
              className="absolute bottom-0 w-full bg-gradient-to-t from-green-500 to-emerald-400 rounded-full"
              animate={{ height: `${heightPercentage}%` }}
              transition={{ type: 'spring', stiffness: 100, damping: 15 }}
            />
          </div>
        </div>

        {/* Slider */}
        <div className="px-4">
          <Slider
            value={[height]}
            onValueChange={([v]) => onChange(v)}
            min={100}
            max={250}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-2">
            <span>100 cm</span>
            <span>175 cm</span>
            <span>250 cm</span>
          </div>
        </div>
      </motion.div>

      {/* Navigation */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
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