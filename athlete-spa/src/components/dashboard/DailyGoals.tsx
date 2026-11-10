import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Check, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { pluralForm } from '@/lib/plural';

export type DailyGoalTone = 'primary' | 'run' | 'food' | 'volt';

export interface DailyGoal {
  id: string;
  label: string;
  /** Where the goal stands, in the user's own units: "78 / 130 g", "o 18:00". */
  hint: string;
  /** How far along the goal is, 0–1. Reaching 1 ticks it off. */
  progress: number;
  tone: DailyGoalTone;
  href: string;
}

const TONE: Record<DailyGoalTone, { ring: string; filled: string }> = {
  primary: { ring: 'stroke-primary', filled: 'bg-primary text-primary-foreground' },
  run: { ring: 'stroke-run', filled: 'bg-run text-white' },
  food: { ring: 'stroke-food', filled: 'bg-food text-white' },
  volt: { ring: 'stroke-volt', filled: 'bg-volt text-volt-foreground' },
};

const SIZE = 36;
const STROKE = 3.5;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const isDone = (goal: DailyGoal) => goal.progress >= 1;

/** A ring that fills up as the goal gets closer, then snaps into a tick. */
function GoalRing({ progress, tone, done }: { progress: number; tone: DailyGoalTone; done: boolean }) {
  const reduceMotion = useReducedMotion();
  const spring = reduceMotion ? { duration: 0 } : { type: 'spring' as const, stiffness: 260, damping: 24 };

  if (done) {
    return (
      <motion.span
        initial={reduceMotion ? false : { scale: 0.6 }}
        animate={{ scale: 1 }}
        transition={spring}
        className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-full', TONE[tone].filled)}
      >
        <Check className="h-[18px] w-[18px]" strokeWidth={3.5} />
      </motion.span>
    );
  }

  const fraction = Math.max(0, Math.min(1, progress));
  return (
    <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="shrink-0 -rotate-90" aria-hidden>
      <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" strokeWidth={STROKE} className="stroke-secondary" />
      {fraction > 0 && (
        <motion.circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          initial={false}
          animate={{ strokeDashoffset: CIRCUMFERENCE * (1 - fraction) }}
          transition={spring}
          className={TONE[tone].ring}
        />
      )}
    </svg>
  );
}

/**
 * "Cele dnia": today's handful of targets as a plain checklist. Every row is
 * one goal with a ring that fills as the day goes on; done rows get a tick.
 * Tapping a row opens the screen where the goal gets done.
 */
export function DailyGoals({ goals }: { goals: DailyGoal[] }) {
  if (goals.length === 0) return null;

  const doneCount = goals.filter(isDone).length;
  const left = goals.length - doneCount;
  const allDone = left === 0;

  return (
    <section className={cn('rounded-2xl bg-card pb-1', allDone && 'ring-1 ring-inset ring-volt/40')}>
      <div className="flex items-baseline justify-between gap-3 px-4 pt-3.5">
        <h2 className="text-[15px] font-semibold">Cele dnia</h2>
        <p className={cn('text-sm tabular-nums', allDone ? 'font-semibold text-volt' : 'text-muted-foreground')}>
          {allDone ? 'Komplet. Dobra robota!' : doneCount === 0 ? `${left} ${pluralForm(left, 'cel', 'cele', 'celów')} na dziś` : `${doneCount} z ${goals.length} zaliczone`}
        </p>
      </div>

      <ul className="mt-2 divide-y divide-border/50 px-1" aria-label="Cele na dziś">
        {goals.map(goal => {
          const done = isDone(goal);
          return (
            <li key={goal.id}>
              <Link
                to={goal.href}
                className="row-tap flex items-center gap-3 rounded-xl px-3 py-2.5"
                aria-label={`${goal.label}: ${goal.hint}${done ? ', zaliczone' : ''}`}
              >
                <GoalRing progress={goal.progress} tone={goal.tone} done={done} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold leading-tight">{goal.label}</span>
                  <span className="block truncate text-xs tabular-nums text-muted-foreground">{goal.hint}</span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
