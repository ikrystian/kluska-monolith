import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SegmentedProgressProps {
  /** 1-based index of the current data step; `total + 1` means all done. */
  step: number;
  total: number;
}

/** One segment per question, so the athlete sees how short the road is. */
export function SegmentedProgress({ step, total }: SegmentedProgressProps) {
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
          <span key={i} className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
            <motion.span
              className="absolute inset-y-0 left-0 rounded-full bg-primary"
              initial={false}
              animate={{ width: done ? '100%' : active ? '45%' : '0%' }}
              transition={{ type: 'spring', stiffness: 220, damping: 28 }}
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
export function OnboardingShell({ step, total, onBack, onSkip, children, why, footer }: OnboardingShellProps) {
  return (
    <div className="flex min-h-[100svh] flex-col bg-background">
      <header className="sticky top-0 z-10 bg-background/90 pt-[env(safe-area-inset-top)] backdrop-blur-md">
        <div className="app-column flex h-14 items-center gap-3 px-2">
          <button
            type="button"
            onClick={onBack}
            aria-label="Wstecz"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-foreground transition-transform active:scale-90 active:bg-secondary"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
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

      <main className="app-column flex flex-1 flex-col px-4 pb-4 pt-4">{children}</main>

      <footer className="sticky bottom-0 z-10 bg-gradient-to-t from-background via-background to-background/0 pt-6">
        <div className="app-column px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          {why && (
            <p className="mb-3 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
              <Info className="mt-px h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
              <span>{why}</span>
            </p>
          )}
          {footer}
        </div>
      </footer>
    </div>
  );
}

/** Step heading: small counter, poster title, one line of context. */
export function StepHeading({
  eyebrow,
  title,
  subtitle,
  className,
}: {
  eyebrow: string;
  title: ReactNode;
  subtitle?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mb-7', className)}>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">{eyebrow}</p>
      <h1 className="mt-2 font-display text-[2.75rem] font-bold uppercase leading-[0.92]">{title}</h1>
      {subtitle && <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">{subtitle}</p>}
    </div>
  );
}
