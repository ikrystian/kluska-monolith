import { useEffect, useRef, type KeyboardEvent, type PointerEvent } from 'react';
import { animate, motion, useMotionValue, useReducedMotion, type MotionStyle } from 'framer-motion';
import { Minus, Plus } from 'lucide-react';
import { haptic } from '@/lib/haptics';
import { RollingNumber } from './motion';

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
  /** A taller, labelled tick every this many steps. */
  majorEvery?: number;
}

/** Distance between two ticks, in px. */
const GAP = 10;
const SNAP = { type: 'spring', stiffness: 420, damping: 38 } as const;

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/**
 * Big odometer readout over a ruler you drag like a tape measure, with − / +
 * for fine tuning. Holding a stepper keeps counting, so 60 → 95 kg doesn't
 * need 70 taps.
 */
export function NumberDial({
  value,
  onChange,
  min,
  max,
  step,
  unit,
  decimals = 0,
  label,
  majorEvery = 10,
}: NumberDialProps) {
  const reduce = useReducedMotion();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(value);
  latest.current = value;

  const count = Math.round((max - min) / step);
  const offsetFor = (v: number) => -((v - min) / step) * GAP;

  const x = useMotionValue(offsetFor(value));
  const drag = useRef<{ pointerX: number; startX: number } | null>(null);
  const lastBuzz = useRef(0);

  // Steppers and keyboard: the tape glides to the new value.
  useEffect(() => {
    if (drag.current) return;
    const target = offsetFor(value);
    if (reduce) {
      x.set(target);
      return;
    }
    const controls = animate(x, target, SNAP);
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, reduce]);

  useEffect(() => () => stopHold(), []);

  const commit = (next: number) => {
    const rounded = Number(clamp(next, min, max).toFixed(decimals));
    if (rounded === latest.current) return;
    latest.current = rounded;
    onChange(rounded);
  };

  const nudge = (dir: 1 | -1, times = 1) => {
    commit(Math.round((latest.current + dir * step * times) / step) * step);
  };

  const startHold = (dir: 1 | -1) => {
    nudge(dir);
    haptic('tap');
    let delay = 380;
    const tick = () => {
      nudge(dir);
      delay = Math.max(50, delay * 0.8);
      timer.current = setTimeout(tick, delay);
    };
    timer.current = setTimeout(tick, delay);
  };

  function stopHold() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }

  const onRulerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    x.stop();
    drag.current = { pointerX: e.clientX, startX: x.get() };
  };

  const onRulerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    const next = clamp(drag.current.startX + (e.clientX - drag.current.pointerX), -count * GAP, 0);
    x.set(next);
    const before = latest.current;
    commit(min + Math.round(-next / GAP) * step);
    if (latest.current !== before && e.timeStamp - lastBuzz.current > 45) {
      lastBuzz.current = e.timeStamp;
      haptic('tap');
    }
  };

  const onRulerUp = () => {
    if (!drag.current) return;
    drag.current = null;
    const target = offsetFor(latest.current);
    if (reduce) x.set(target);
    else animate(x, target, SNAP);
  };

  const onRulerKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const moves: Record<string, () => void> = {
      ArrowRight: () => nudge(1),
      ArrowUp: () => nudge(1),
      ArrowLeft: () => nudge(-1),
      ArrowDown: () => nudge(-1),
      PageUp: () => nudge(1, majorEvery),
      PageDown: () => nudge(-1, majorEvery),
      Home: () => commit(min),
      End: () => commit(max),
    };
    const move = moves[e.key];
    if (!move) return;
    e.preventDefault();
    move();
  };

  const readout = value.toLocaleString('pl-PL', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  const stepLabel = step.toLocaleString('pl-PL');
  const labels = Array.from({ length: Math.floor(count / majorEvery) + 1 }, (_, i) => i * majorEvery);

  const stepperClass =
    'flex h-12 flex-1 items-center justify-center gap-1.5 rounded-2xl bg-secondary text-sm font-semibold text-foreground select-none touch-none disabled:opacity-30';

  const stepperProps = (dir: 1 | -1) => ({
    onPointerDown: () => startHold(dir),
    onPointerUp: stopHold,
    onPointerLeave: stopHold,
    onPointerCancel: stopHold,
    onKeyDown: (e: KeyboardEvent<HTMLButtonElement>) => (e.key === 'Enter' || e.key === ' ') && nudge(dir),
    whileTap: { scale: 0.94 },
    className: stepperClass,
  });

  return (
    <div className="onb-card rounded-3xl px-4 pb-4 pt-7">
      <div className="flex items-end justify-center gap-2" aria-live="polite">
        <RollingNumber value={readout} className="num text-[6rem] leading-[0.82]" />
        <span className="pb-1 text-xl font-semibold text-muted-foreground">{unit}</span>
      </div>

      <div
        className="onb-ruler mt-7 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-primary"
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={`${readout} ${unit}`}
        onPointerDown={onRulerDown}
        onPointerMove={onRulerMove}
        onPointerUp={onRulerUp}
        onPointerCancel={onRulerUp}
        onKeyDown={onRulerKey}
      >
        <motion.div
          className="onb-ruler__strip"
          style={{ x, width: count * GAP + 2, '--gap': `${GAP}px`, '--major': `${GAP * majorEvery}px` } as unknown as MotionStyle}
        >
          {labels.map((i) => (
            <span key={i} className="onb-ruler__label" style={{ left: i * GAP }}>
              {Number((min + i * step).toFixed(decimals))}
            </span>
          ))}
        </motion.div>
        <span className="onb-ruler__needle" aria-hidden />
      </div>

      <div className="mt-2 flex gap-2.5">
        <motion.button type="button" aria-label={`Zmniejsz ${label}`} disabled={value <= min} {...stepperProps(-1)}>
          <Minus className="h-4 w-4" />
          {stepLabel} {unit}
        </motion.button>
        <motion.button type="button" aria-label={`Zwiększ ${label}`} disabled={value >= max} {...stepperProps(1)}>
          <Plus className="h-4 w-4" />
          {stepLabel} {unit}
        </motion.button>
      </div>
    </div>
  );
}
