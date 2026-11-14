import { useEffect, useRef, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EASE, RevealText, Rise, RollingNumber } from './motion';

interface SegmentedProgressProps {
  /** 1-based index of the current data step; `total + 1` means all done. */
  step: number;
  total: number;
}

/**
 * One segment per question, so the athlete sees how short the road is. Done
 * segments are ember, the current one is half-filled and shimmers, and the
 * whole bar turns lime once every answer is in.
 */
export function SegmentedProgress({ step, total }: SegmentedProgressProps) {
  const complete = step > total;
  return (
    <div
      className="flex flex-1 gap-1.5"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={Math.min(step - 1, total)}
      aria-label="Postęp konfiguracji profilu"
    >
      {Array.from({ length: total }).map((_, i) => {
        const done = i < step - 1;
        const active = i === step - 1;
        return (
          <span key={i} className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-foreground/10">
            <motion.span
              className="absolute inset-0 origin-left overflow-hidden rounded-full bg-primary"
              initial={false}
              animate={{ scaleX: done ? 1 : active ? 0.5 : 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 26 }}
            >
              {active && <span className="onb-seg-shimmer" />}
            </motion.span>
            <motion.span
              className="absolute inset-0 rounded-full bg-lime"
              initial={false}
              animate={{ opacity: complete ? 1 : 0 }}
              transition={{ duration: 0.45, delay: complete ? i * 0.06 : 0 }}
            />
          </span>
        );
      })}
    </div>
  );
}

interface OnboardingShellProps {
  step: number;
  total: number;
  /** Changes with every step: resets scroll and swaps the ghost numeral. */
  stepKey: string;
  direction: number;
  onBack: () => void;
  /** Hidden on the summary — at that point skipping makes no sense. */
  onSkip?: () => void;
  /** Animated step body (title, inputs). */
  children: ReactNode;
  /** "Why we ask" line shown right above the main button. */
  why?: string;
  footer: ReactNode;
}

/**
 * Frame shared by every question: back · progress · skip on top, the step in
 * the middle, and the main action pinned to the thumb zone at the bottom.
 */
export function OnboardingShell({
  step,
  total,
  stepKey,
  direction,
  onBack,
  onSkip,
  children,
  why,
  footer,
}: OnboardingShellProps) {
  const scroller = useRef<HTMLElement>(null);
  const complete = step > total;

  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
  }, [stepKey]);

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      <header className="relative z-10 shrink-0 pt-[env(safe-area-inset-top)]">
        <div className="app-column flex h-14 items-center gap-2 px-2">
          <motion.button
            type="button"
            onClick={onBack}
            aria-label="Wstecz"
            whileTap={{ scale: 0.86, x: -3 }}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-foreground active:bg-secondary"
          >
            <ChevronLeft className="h-6 w-6" />
          </motion.button>
          <SegmentedProgress step={step} total={total} />
          {onSkip ? (
            <button
              type="button"
              onClick={onSkip}
              className="h-11 shrink-0 rounded-full px-3 text-sm font-semibold text-muted-foreground transition-colors active:bg-secondary active:text-foreground"
            >
              Pomiń
            </button>
          ) : (
            <span className="w-11 shrink-0" aria-hidden />
          )}
        </div>
      </header>

      <main ref={scroller} className="no-scrollbar relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        {/* Ghost numeral: a second, slower layer that makes the slide feel deep. */}
        <div aria-hidden className="app-column pointer-events-none absolute inset-x-0 top-0 h-0">
          <AnimatePresence custom={direction} initial={false}>
            {!complete && (
              <motion.span
                key={stepKey}
                custom={direction}
                variants={{
                  enter: (dir: number) => ({ opacity: 0, x: dir * 120 }),
                  center: { opacity: 1, x: 0 },
                  exit: (dir: number) => ({ opacity: 0, x: dir * -120 }),
                }}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.7, ease: EASE }}
                className="onb-ghost absolute -right-2 -top-5"
              >
                {String(step).padStart(2, '0')}
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        <div className="app-column relative px-5 pb-6 pt-3">{children}</div>
      </main>

      <footer className="relative z-10 shrink-0">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-8 h-8 bg-gradient-to-t from-background to-transparent"
        />
        <div className="app-column bg-background px-5 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <AnimatePresence mode="wait" initial={false}>
            {why && (
              <motion.p
                key={why}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="mb-3 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground"
              >
                <Info className="mt-px h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                <span>{why}</span>
              </motion.p>
            )}
          </AnimatePresence>
          {footer}
        </div>
      </footer>
    </div>
  );
}

/** Step heading: rolling counter, poster title revealed word by word, one line of context. */
export function StepHeading({
  step,
  total,
  title,
  subtitle,
  className,
}: {
  step: number;
  total: number;
  title: string;
  subtitle?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mb-7', className)}>
      <Rise className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
        <span className="h-px w-5 bg-primary" aria-hidden />
        <span>
          Pytanie <RollingNumber value={String(step)} /> z {total}
        </span>
      </Rise>
      <h1 className="mt-2.5 font-display text-[2.875rem] font-bold uppercase leading-[0.92]">
        <RevealText text={title} />
      </h1>
      {subtitle && <Rise className="mt-3 text-[15px] leading-relaxed text-muted-foreground">{subtitle}</Rise>}
    </div>
  );
}
