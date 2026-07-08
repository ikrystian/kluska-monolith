import { type ReactNode } from 'react';
import { AnimatePresence, motion, type HTMLMotionProps, type Transition } from 'framer-motion';
import { useLocation, useOutlet } from 'react-router-dom';

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

/* ------------------------------------------------------------------ */
/* Page transitions                                                    */
/* ------------------------------------------------------------------ */

export const pageVariants = {
  initial: { opacity: 0, y: 12, scale: 0.995 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: easeOutExpo,
  },
  exit: {
    opacity: 0,
    y: -8,
    scale: 0.995,
    transition: { duration: 0.18, ease: [0.4, 0, 1, 1] as const },
  },
};

/**
 * Drop-in replacement for react-router's <Outlet /> that animates
 * transitions between routes. The exiting page is kept frozen while
 * it fades out, then the new page slides in.
 */
export function AnimatedOutlet() {
  const location = useLocation();
  const outlet = useOutlet();

  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.div
        key={location.pathname}
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="min-h-full"
      >
        {outlet}
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Wrapper for standalone pages (login/register) to get a consistent
 * entrance animation.
 */
export function PageTransition({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      variants={pageVariants}
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
  initial: { opacity: 0, height: 0, scale: 0.97 },
  animate: {
    opacity: 1,
    height: 'auto',
    scale: 1,
    transition: { ...springSnappy, opacity: { duration: 0.2 } },
  },
  exit: {
    opacity: 0,
    height: 0,
    scale: 0.97,
    transition: { duration: 0.2, ease: 'easeIn' },
  },
  style: { overflow: 'hidden' },
};

/** Simpler variant for grid cards where height-collapse looks odd. */
export const cardItemMotion: HTMLMotionProps<'div'> = {
  layout: true,
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1, transition: springSnappy },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.18, ease: 'easeIn' } },
};

/* ------------------------------------------------------------------ */
/* Staggered entrance for static lists/sections                        */
/* ------------------------------------------------------------------ */

export const staggerContainer = {
  animate: {
    transition: { staggerChildren: 0.05 },
  },
};

export const staggerItem = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: easeOutExpo },
};

export { AnimatePresence, motion };
