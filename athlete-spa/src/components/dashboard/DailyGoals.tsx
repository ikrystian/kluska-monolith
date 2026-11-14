import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';
import { Beef, Check, ChevronRight, Dumbbell, Flame, ListChecks, Target, Utensils, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { pluralForm } from '@/lib/plural';
import trainingBg from '@/assets/goals/training.svg';
import caloriesBg from '@/assets/goals/calories.svg';
import mealsBg from '@/assets/goals/meals.svg';
import proteinBg from '@/assets/goals/protein.svg';
import habitsBg from '@/assets/goals/habits.svg';

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
  state?: unknown;
}

/** The ring wears the goal's domain color while it fills; a ticked-off goal is always lime. */
const RING: Record<DailyGoalTone, string> = {
  primary: 'stroke-primary',
  run: 'stroke-run',
  food: 'stroke-food',
  volt: 'stroke-volt',
};

const SIZE = 44;
const STROKE = 4;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const isDone = (goal: DailyGoal) => goal.progress >= 1;

/** A ring that fills up as the goal gets closer, then snaps into a tick. */
function GoalRing({ progress, tone, done, children }: { progress: number; tone: DailyGoalTone; done: boolean; children?: ReactNode }) {
  const reduceMotion = useReducedMotion();
  const spring = reduceMotion ? { duration: 0 } : { type: 'spring' as const, stiffness: 260, damping: 24 };

  if (done) {
    return (
      <motion.span
        initial={reduceMotion ? false : { scale: 0.6 }}
        animate={{ scale: 1 }}
        transition={spring}
        className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-lime text-lime-foreground"
      >
        <Check className="h-5 w-5" strokeWidth={3.5} />
      </motion.span>
    );
  }

  const fraction = Math.max(0, Math.min(1, progress));
  return (
    <span className="relative grid h-11 w-11 shrink-0 place-items-center">
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="absolute inset-0 -rotate-90" aria-hidden>
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
            className={RING[tone]}
          />
        )}
      </svg>
      {children}
    </span>
  );
}

/** Each goal's glyph, sitting inside its ring. Keyed by goal id so callers stay plain data. */
const ICONS: Record<string, LucideIcon> = {
  training: Dumbbell,
  calories: Flame,
  meals: Utensils,
  protein: Beef,
  habits: ListChecks,
};

const ICON_TONE: Record<DailyGoalTone, string> = {
  primary: 'text-primary',
  run: 'text-run',
  food: 'text-food',
  volt: 'text-volt',
};

/** Each goal's generated background (src/assets/goals). A card-colored scrim sits on top so the label and hint stay readable. */
const BACKGROUNDS: Record<string, string> = {
  training: trainingBg,
  calories: caloriesBg,
  meals: mealsBg,
  protein: proteinBg,
  habits: habitsBg,
};

const FILL: Record<DailyGoalTone, string> = {
  primary: 'bg-primary',
  run: 'bg-run',
  food: 'bg-food',
  volt: 'bg-volt',
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

/**
 * "Cele dnia": today's handful of targets as a glanceable board. A segmented
 * bar sums the day up (one segment per goal), and each goal is a thumb-sized
 * tile with a ring that fills as the day goes on; done tiles turn lime.
 * Tapping a tile opens the screen where the goal gets done.
 */
export function DailyGoals({ goals }: { goals: DailyGoal[] }) {
  if (goals.length === 0) return null;

  const doneCount = goals.filter(isDone).length;
  const left = goals.length - doneCount;
  const allDone = left === 0;
  // An odd count would leave a hole in the 2-column grid, so the first goal goes full width.
  const hasWideTile = goals.length % 2 === 1;

  return (
    <section className={cn('rounded-2xl bg-card p-4', allDone && 'ring-1 ring-inset ring-volt/40')}>
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold">Cele dnia</h2>
          <p className={cn('mt-0.5 truncate text-xs', allDone ? 'font-semibold text-volt' : 'text-muted-foreground')}>
            {allDone
              ? 'Komplet. Dobra robota!'
              : doneCount === 0
                ? `${left} ${pluralForm(left, 'cel', 'cele', 'celów')} na dziś`
                : `Jeszcze ${left} ${pluralForm(left, 'cel', 'cele', 'celów')} do zamknięcia dnia`}
          </p>
        </div>
        <p className="shrink-0 font-display leading-none tabular-nums" aria-label={`${doneCount} z ${goals.length} zaliczone`}>
          <span className={cn('text-[2rem] font-bold', allDone && 'text-volt')}>{doneCount}</span>
          <span className="text-lg font-semibold text-muted-foreground">/{goals.length}</span>
        </p>
      </div>

      {/* The day at a glance: one segment per goal, filling in that goal's color. */}
      <div className="mt-3 flex gap-1" aria-hidden>
        {goals.map(goal => {
          const done = isDone(goal);
          return (
            <span key={goal.id} className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
              <span
                className={cn('block h-full rounded-full transition-[width] duration-500', done ? 'bg-lime' : FILL[goal.tone])}
                style={{ width: `${clamp01(goal.progress) * 100}%` }}
              />
            </span>
          );
        })}
      </div>

      <ul className="mt-3 grid grid-cols-2 gap-2 goals-for-today" aria-label="Cele na dziś">
        {goals.map((goal, index) => {
          const done = isDone(goal);
          const wide = hasWideTile && index === 0;
          const Icon = ICONS[goal.id] ?? Target;
          const background = BACKGROUNDS[goal.id];
          return (
            <li key={goal.id} className={cn(wide && 'col-span-2')}>
              <Link
                to={goal.href}
                state={goal.state}
                className={cn(
                  'flex h-full min-h-[4.5rem] gap-3 overflow-hidden rounded-xl bg-cover bg-center p-3 transition-transform active:scale-[0.98]',
                  wide ? 'items-center' : 'flex-col',
                  !background && (done ? 'bg-lime/10' : 'bg-secondary/60')
                )}
                style={background ? {
                  backgroundImage: `linear-gradient(hsl(var(--card) / 0.85), hsl(var(--card) / 0.85)), url(${background})`,
                } : undefined}
                aria-label={`${goal.label}: ${goal.hint}${done ? ', zaliczone' : ''}`}
              >
                <span className="flex items-center justify-between gap-2">
                  <GoalRing progress={goal.progress} tone={goal.tone} done={done}>
                    <Icon className={cn('h-[18px] w-[18px]', ICON_TONE[goal.tone])} strokeWidth={2.25} />
                  </GoalRing>
                  {!wide && <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold leading-tight">{goal.label}</span>
                  <span className={cn('mt-0.5 block truncate text-xs tabular-nums', done ? 'text-foreground/70' : 'text-muted-foreground')}>
                    {goal.hint}
                  </span>
                </span>
                {wide && <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" />}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
