import { useLayoutEffect, useRef, type ReactNode } from 'react';
import {
  AnimatePresence,
  motion,
  type HTMLMotionProps,
  type Transition,
  type Variants,
} from 'framer-motion';
import { useLocation, useOutlet, useNavigationType } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { beginPageTransition, endPageTransition } from '@/lib/page-transition';

/* ------------------------------------------------------------------ */
/* Shared transitions                                                  */
/* ------------------------------------------------------------------ */

export const easeOutExpo: Transition = {
  duration: 0.35,
  ease: [0.16, 1, 0.3, 1],
};

export const springSnappy: Transition = {
  type: 'spring',
  stiffness: 400,
  damping: 30,
};

export const springSoft: Transition = {
  type: 'spring',
  stiffness: 300,
  damping: 28,
};

/* ------------------------------------------------------------------ */
/* Navigation direction detection                                      */
/* ------------------------------------------------------------------ */

/**
 * Returns the perceived navigation direction for the current route change.
 * POP (browser back/forward, refresh) is treated as "back"; PUSH/REPLACE are
 * treated as "forward". Combined with AnimatePresence initial={false}, this
 * produces a native mobile stack slide without edge-cases on first mount.
 */
export function useNavigationDirection(): 'forward' | 'back' {
  const type = useNavigationType();
  return type === 'POP' ? 'back' : 'forward';
}

/* ------------------------------------------------------------------ */
/* Page transitions                                                    */
/* ------------------------------------------------------------------ */

const pageTransition: Transition = {
  duration: 0.18,
  ease: 'easeOut',
};

const pageExitTransition: Transition = {
  duration: 0.12,
  ease: 'easeIn',
};

/** Lightweight crossfade — opacity only, fully GPU-composited. */
export const pageVariantsPush: Variants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: pageTransition,
  },
  exit: {
    opacity: 0,
    transition: pageExitTransition,
  },
};

/** Same symmetric effect for back navigation. */
export const pageVariantsPop: Variants = pageVariantsPush;

/**
 * Drop-in replacement for react-router's <Outlet /> that animates
 * transitions between routes using mobile native push/pop directions.
 *
 * Place inside a relatively positioned container with overflow hidden
 * for the smoothest stack-like behaviour.
 */
export function AnimatedOutlet({ className }: { className?: string }) {
  const location = useLocation();
  const outlet = useOutlet();
  const direction = useNavigationDirection();
  const variants = direction === 'back' ? pageVariantsPop : pageVariantsPush;

  // Freeze data-hook output for the whole exit+enter animation so async
  // responses landing mid-slide don't reflow the moving screens. Unfrozen
  // when the enter animation completes (or by the store's safety timeout).
  const prevPathRef = useRef(location.pathname);
  useLayoutEffect(() => {
    if (prevPathRef.current !== location.pathname) {
      prevPathRef.current = location.pathname;
      beginPageTransition();
    }
  }, [location.pathname]);

  return (
    <AnimatePresence mode="sync" initial={false}>
      <motion.div
        key={location.pathname}
        variants={variants}
        initial="initial"
        animate="animate"
        exit="exit"
        onAnimationComplete={(definition) => {
          if (definition === 'animate') endPageTransition();
        }}
        style={{ willChange: 'opacity' }}
        className={cn('min-h-full w-full', className)}
      >
        {outlet}
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Wrapper for standalone pages (login/register/onboarding) to get a consistent
 * forward entrance animation.
 */
export function PageTransition({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      variants={pageVariantsPush}
      initial="initial"
      animate="animate"
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* List item enter/exit (use inside <AnimatePresence>)                 */
/* ------------------------------------------------------------------ */

/**
 * Spread onto a motion element rendered inside <AnimatePresence> to get
 * a smooth add/remove animation (fade + collapse).
 *
 * <AnimatePresence initial={false}>
 *   {items.map(item => (
 *     <motion.div key={item.id} {...listItemMotion}>...</motion.div>
 *   ))}
 * </AnimatePresence>
 */
export const listItemMotion: HTMLMotionProps<'div'> = {
  layout: true,
  initial: { opacity: 0, y: 16, scale: 0.97 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { ...springSnappy, opacity: { duration: 0.2 } },
  },
  exit: {
    opacity: 0,
    x: -40,
    transition: { duration: 0.2, ease: 'easeIn' },
  },
};

/** Pre-wrapped list item for convenience. */
export function AnimatedListItem({
  children,
  className,
  ...props
}: HTMLMotionProps<'div'>) {
  return (
    <motion.div
      {...listItemMotion}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/** Simpler variant for grid cards where height-collapse looks odd. */
export const cardItemMotion: HTMLMotionProps<'div'> = {
  layout: true,
  initial: { opacity: 0, y: 20, scale: 0.94 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: springSnappy,
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    transition: { duration: 0.18, ease: 'easeIn' },
  },
};

/** Pre-wrapped card item for convenience. */
export function AnimatedCard({
  children,
  className,
  ...props
}: HTMLMotionProps<'div'>) {
  return (
    <motion.div
      {...cardItemMotion}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/**
 * For <TableRow> elements. Height-collapse breaks table layout, so we
 * only animate opacity + a small vertical nudge. Spread onto a
 * <motion.tr> rendered inside <AnimatePresence> (with <motion.tr> as the row).
 */
export const tableRowMotion: HTMLMotionProps<'tr'> = {
  layout: true,
  initial: { opacity: 0, y: -6 },
  animate: { opacity: 1, y: 0, transition: easeOutExpo },
  exit: { opacity: 0, y: 6, transition: { duration: 0.16, ease: 'easeIn' } },
  style: { display: 'table-row' as const },
};

/* ------------------------------------------------------------------ */
/* Staggered entrance for static lists/sections                        */
/* ------------------------------------------------------------------ */

export const staggerContainer: Variants = {
  animate: {
    transition: { staggerChildren: 0.05 },
  },
};

export const staggerItem: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: easeOutExpo },
};

/* ------------------------------------------------------------------ */
/* Micro-interactions                                                  */
/* ------------------------------------------------------------------ */

/** A subtle pressable wrapper that scales down on tap/click. */
export function Pressable({
  children,
  className,
  scale = 0.97,
  ...props
}: HTMLMotionProps<'div'> & { scale?: number }) {
  return (
    <motion.div
      whileTap={{ scale }}
      transition={{ duration: 0.1 }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/** Shorthand for a button-like pressable div. */
export function PressableButton({
  children,
  className,
  ...props
}: HTMLMotionProps<'button'>) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      whileHover={{ scale: 1.01 }}
      transition={{ duration: 0.1 }}
      className={className}
      {...props}
    >
      {children}
    </motion.button>
  );
}

export { AnimatePresence, motion };
