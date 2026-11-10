import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface ProgressRingProps {
  /** 0–1 */
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  children?: ReactNode;
}

/** Pierścień postępu z treścią w środku; ta sama sprężyna co w „Celach dnia”. */
export function ProgressRing({ value, size = 56, stroke = 5, color = 'hsl(var(--primary))', children }: ProgressRingProps) {
  const reduceMotion = useReducedMotion();
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const fraction = Math.max(0, Math.min(1, value));

  return (
    <span className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={stroke} className="stroke-secondary" />
        {fraction > 0 && (
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            stroke={color}
            strokeDasharray={circumference}
            initial={reduceMotion ? false : { strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: circumference * (1 - fraction) }}
            transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 120, damping: 22 }}
          />
        )}
      </svg>
      <span className="relative">{children}</span>
    </span>
  );
}
