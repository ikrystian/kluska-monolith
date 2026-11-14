import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react';
import { AnimatePresence, animate, motion, useReducedMotion, type HTMLMotionProps, type Variants } from 'framer-motion';
import { cn } from '@/lib/utils';

export const EASE = [0.22, 1, 0.36, 1] as const;

export const SPRING = { type: 'spring', stiffness: 320, damping: 30, mass: 0.9 } as const;

/** 1 = forward, -1 = back. Read by every `Rise` so a whole step leans the same way. */
const DirectionContext = createContext(1);
export const StepDirection = DirectionContext.Provider;

/**
 * Wrapper of one step. It doesn't move on the way in — it only staggers its
 * children — and leaves as a single block so the exit stays short.
 */
export const stepVariants: Variants = {
  enter: {},
  center: { transition: { staggerChildren: 0.06, delayChildren: 0.03 } },
  exit: (dir: number) => ({
    opacity: 0,
    x: dir * -44,
    scale: 0.985,
    transition: { duration: 0.17, ease: 'easeIn' },
  }),
};

export const riseVariants: Variants = {
  enter: (dir: number) => ({ opacity: 0, x: dir * 40, y: 10 }),
  center: { opacity: 1, x: 0, y: 0, transition: SPRING },
};

/** One staggered element of a step: slides in from the side the step came from. */
export function Rise({ className, children, ...props }: HTMLMotionProps<'div'>) {
  const dir = useContext(DirectionContext);
  return (
    <motion.div custom={dir} variants={riseVariants} className={className} {...props}>
      {children}
    </motion.div>
  );
}

const wordVariants: Variants = {
  enter: { y: '115%' },
  center: { y: 0, transition: { duration: 0.6, ease: EASE } },
};

/**
 * Poster headline revealed word by word from behind a mask. The padding keeps
 * Polish diacritics (Ś, Ę) from being clipped by the tight line-height.
 */
export function RevealText({ text, className, delay = 0 }: { text: string; className?: string; delay?: number }) {
  return (
    <motion.span
      className={cn('block', className)}
      variants={{ enter: {}, center: { transition: { staggerChildren: 0.07, delayChildren: delay } } }}
      aria-label={text}
    >
      {text.split(' ').map((word, i) => (
        <span key={i} aria-hidden className="-my-[0.14em] mr-[0.22em] inline-block overflow-hidden py-[0.14em] align-bottom last:mr-0">
          <motion.span className="inline-block" variants={wordVariants}>
            {word}
          </motion.span>
        </span>
      ))}
    </motion.span>
  );
}

const digitVariants: Variants = {
  enter: (dir: number) => ({ y: `${dir * 55}%`, opacity: 0 }),
  center: { y: 0, opacity: 1 },
  exit: (dir: number) => ({ y: `${dir * -55}%`, opacity: 0 }),
};

/**
 * Odometer readout: only the digits that changed roll, up when the value grows
 * and down when it shrinks. Keys count from the right so the ones stay put
 * when a new leading digit appears.
 */
export function RollingNumber({ value, className }: { value: string; className?: string }) {
  const numeric = Number(value.replace(/\s/g, '').replace(',', '.'));
  const prev = useRef(numeric);
  const dir = numeric >= prev.current ? 1 : -1;
  useEffect(() => {
    prev.current = numeric;
  }, [numeric]);

  const chars = value.split('');
  return (
    <span className={cn('inline-flex', className)} aria-label={value}>
      {chars.map((char, i) => (
        <span key={chars.length - i} aria-hidden className="relative inline-block">
          <AnimatePresence mode="popLayout" initial={false} custom={dir}>
            <motion.span
              key={char}
              custom={dir}
              variants={digitVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.2, ease: EASE }}
              className="inline-block"
            >
              {char}
            </motion.span>
          </AnimatePresence>
        </span>
      ))}
    </span>
  );
}

/** Number that counts up once when it appears — used on the summary. */
export function CountUp({
  value,
  decimals = 0,
  delay = 0,
  className,
}: {
  value: number;
  decimals?: number;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduce = useReducedMotion();
  const format = (v: number) =>
    v.toLocaleString('pl-PL', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (reduce) {
      node.textContent = format(value);
      return;
    }
    const controls = animate(value * 0.6, value, {
      duration: 0.9,
      delay,
      ease: EASE,
      onUpdate: (v) => {
        node.textContent = format(v);
      },
    });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, decimals, reduce]);

  return (
    <span ref={ref} className={className}>
      {format(value)}
    </span>
  );
}

/** Small helper for content that swaps in place (hints, error lines). */
export function Swap({ id, children, className }: { id: string; children: ReactNode; className?: string }) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={id}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
