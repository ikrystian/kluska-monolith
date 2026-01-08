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
        className="mb-6 text-center"
      >
        <div className="text-6xl font-bold bg-gradient-to-r from-green-500 to-emerald-500 bg-clip-text text-transparent">
          {height}
        </div>
        <div className="text-xl text-muted-foreground">cm</div>
      </motion.div>

      {/* Visual Height Gauge */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="w-full max-w-sm mb-8"
      >
        {/* Semi-circular gauge */}
        <div className="flex justify-center mb-6">
          <div className="relative w-48 h-24 overflow-hidden">
            {/* Background arc */}
            <svg className="w-48 h-48 -mt-0" viewBox="0 0 200 100">
              {/* Track */}
              <path
                d="M 20 100 A 80 80 0 0 1 180 100"
                fill="none"
                strokeWidth="12"
                className="stroke-secondary"
                strokeLinecap="round"
              />
              {/* Progress arc */}
              <motion.path
                d="M 20 100 A 80 80 0 0 1 180 100"
                fill="none"
                strokeWidth="12"
                className="stroke-emerald-500"
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: heightPercentage / 100 }}
                transition={{ type: 'spring', stiffness: 60, damping: 15 }}
              />
            </svg>
            {/* Center indicator */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2">
              <motion.div
                className="w-3 h-3 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </div>
            {/* Min/Max labels */}
            <div className="absolute bottom-0 left-2 text-xs text-muted-foreground">100</div>
            <div className="absolute bottom-0 right-2 text-xs text-muted-foreground">250</div>
          </div>
        </div>

        {/* Height categories */}
        <div className="flex justify-center gap-2 mb-6">
          {[
            { label: 'Niski', range: [100, 160], color: 'bg-blue-500' },
            { label: 'Średni', range: [161, 180], color: 'bg-emerald-500' },
            { label: 'Wysoki', range: [181, 250], color: 'bg-purple-500' },
          ].map((cat) => (
            <div
              key={cat.label}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-300 ${height >= cat.range[0] && height <= cat.range[1]
                  ? `${cat.color} text-white shadow-md`
                  : 'bg-secondary text-muted-foreground'
                }`}
            >
              {cat.label}
            </div>
          ))}
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