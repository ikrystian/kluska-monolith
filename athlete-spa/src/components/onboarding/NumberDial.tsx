import { useRef } from 'react';
import { motion } from 'framer-motion';
import { Minus, Plus } from 'lucide-react';
import { Slider } from '@/components/ui/slider';

interface NumberDialProps {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  unit: string;
  /** Digits after the comma in the big readout. */
  decimals?: number;
  label: string;
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/**
 * Big readout with − / + steppers for fine tuning and a slider for big jumps.
 * Holding a stepper keeps counting, so 60 → 95 kg doesn't need 70 taps.
 */
export function NumberDial({ value, onChange, min, max, step, unit, decimals = 0, label }: NumberDialProps) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(value);
  latest.current = value;

  const nudge = (dir: 1 | -1) => {
    const next = clamp(Math.round((latest.current + dir * step) / step) * step, min, max);
    latest.current = next;
    onChange(Number(next.toFixed(decimals)));
  };

  const startHold = (dir: 1 | -1) => {
    nudge(dir);
    let delay = 380;
    const tick = () => {
      nudge(dir);
      delay = Math.max(50, delay * 0.8);
      timer.current = setTimeout(tick, delay);
    };
    timer.current = setTimeout(tick, delay);
  };

  const stopHold = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  const stepperClass =
    'grid h-14 w-14 shrink-0 place-items-center rounded-full bg-secondary text-foreground transition-transform active:scale-90 active:bg-primary active:text-primary-foreground disabled:opacity-30 select-none touch-none';

  return (
    <div className="rounded-3xl bg-card px-4 pb-6 pt-7">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          aria-label={`Zmniejsz ${label}`}
          disabled={value <= min}
          onPointerDown={() => startHold(-1)}
          onPointerUp={stopHold}
          onPointerLeave={stopHold}
          onPointerCancel={stopHold}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && nudge(-1)}
          className={stepperClass}
        >
          <Minus className="h-6 w-6" />
        </button>

        <div className="flex min-w-0 items-end justify-center gap-1.5" aria-live="polite">
          <motion.span
            key={value}
            initial={{ y: 6, opacity: 0.4 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.15 }}
            className="num text-[5.25rem] leading-[0.85]"
          >
            {value.toLocaleString('pl-PL', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
          </motion.span>
          <span className="pb-1.5 text-xl font-semibold text-muted-foreground">{unit}</span>
        </div>

        <button
          type="button"
          aria-label={`Zwiększ ${label}`}
          disabled={value >= max}
          onPointerDown={() => startHold(1)}
          onPointerUp={stopHold}
          onPointerLeave={stopHold}
          onPointerCancel={stopHold}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && nudge(1)}
          className={stepperClass}
        >
          <Plus className="h-6 w-6" />
        </button>
      </div>

      <div className="mt-8 px-1">
        <Slider
          value={[value]}
          onValueChange={([v]) => onChange(Number(v.toFixed(decimals)))}
          min={min}
          max={max}
          step={step}
          aria-label={label}
          className="[&_[role=slider]]:h-7 [&_[role=slider]]:w-7 [&_[role=slider]]:border-[3px]"
        />
        <div className="mt-2.5 flex justify-between text-xs font-medium tabular-nums text-muted-foreground">
          <span>
            {min} {unit}
          </span>
          <span>
            {max} {unit}
          </span>
        </div>
      </div>
    </div>
  );
}
