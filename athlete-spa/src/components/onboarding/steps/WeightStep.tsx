import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { NumberDial } from '../NumberDial';
import { Rise, RollingNumber, Swap } from '../motion';
import { cn } from '@/lib/utils';

interface WeightStepProps {
  value: number | null;
  height: number | null;
  onChange: (value: number) => void;
}

const BMI_MIN = 15;
const BMI_MAX = 40;
const BANDS = [
  { upTo: 18.5, label: 'Niedowaga', bar: 'bg-run', text: 'text-run' },
  { upTo: 25, label: 'Waga prawidłowa', bar: 'bg-volt', text: 'text-volt' },
  { upTo: 30, label: 'Nadwaga', bar: 'bg-food', text: 'text-food' },
  { upTo: BMI_MAX, label: 'Otyłość', bar: 'bg-destructive', text: 'text-destructive' },
];

export function WeightStep({ value, height, onChange }: WeightStepProps) {
  const weight = value ?? 75;

  const bmi = useMemo(() => {
    if (!height) return null;
    const m = height / 100;
    return weight / (m * m);
  }, [height, weight]);

  const band = bmi !== null ? BANDS.find((b) => bmi < b.upTo) ?? BANDS[BANDS.length - 1] : null;
  const markerPct = bmi !== null ? ((Math.min(Math.max(bmi, BMI_MIN), BMI_MAX) - BMI_MIN) / (BMI_MAX - BMI_MIN)) * 100 : 0;

  return (
    <div className="space-y-3">
      <Rise>
        <NumberDial value={weight} onChange={onChange} min={30} max={200} step={0.5} decimals={1} unit="kg" label="wagę" />
      </Rise>

      {bmi !== null && band && (
        <Rise className="onb-card rounded-3xl p-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <span className="eyebrow block">BMI</span>
              <RollingNumber
                value={bmi.toLocaleString('pl-PL', { maximumFractionDigits: 1, minimumFractionDigits: 1 })}
                className="num mt-1 text-[2.25rem]"
              />
            </div>
            <Swap id={band.label} className={cn('pb-1 text-sm font-semibold', band.text)}>
              {band.label}
            </Swap>
          </div>
          <div className="relative mt-3">
            <div className="flex h-2 gap-1">
              {BANDS.map((b, i) => {
                const from = i === 0 ? BMI_MIN : BANDS[i - 1].upTo;
                return (
                  <span
                    key={b.label}
                    className={cn('h-full rounded-full transition-opacity duration-300', b.bar, b === band ? 'opacity-100' : 'opacity-25')}
                    style={{ flexGrow: b.upTo - from }}
                  />
                );
              })}
            </div>
            {/* Full-width rail moved by a percentage of itself, so the marker travels on transform alone. */}
            <motion.div
              className="pointer-events-none absolute inset-x-0 -top-1.5"
              initial={false}
              animate={{ x: `${markerPct}%` }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              <span className="block h-5 w-5 -translate-x-1/2 rounded-full border-[3px] border-card bg-foreground shadow-md" />
            </motion.div>
          </div>
          <p className="mt-3.5 text-xs text-muted-foreground">To tylko orientacyjny wskaźnik — nie uwzględnia masy mięśniowej.</p>
        </Rise>
      )}
    </div>
  );
}
