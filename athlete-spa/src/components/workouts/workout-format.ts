import { Dumbbell, Repeat, Timer, type LucideIcon } from 'lucide-react';
import { TrainingLevel, type ExerciseSeries } from '@/lib/types';

export const LEVEL_LABEL: Record<string, string> = {
  [TrainingLevel.Beginner]: 'Początkujący',
  [TrainingLevel.Intermediate]: 'Średni',
  [TrainingLevel.Advanced]: 'Zaawansowany',
};

/** Accent colour per level, as an hsl/hex string usable with `tint()`. */
export const LEVEL_COLOR: Record<string, string> = {
  [TrainingLevel.Beginner]: 'hsl(var(--volt))',
  [TrainingLevel.Intermediate]: 'hsl(var(--chart-5))',
  [TrainingLevel.Advanced]: 'hsl(var(--primary))',
};

export const levelLabel = (level: string) => LEVEL_LABEL[level] ?? level;
export const levelColor = (level: string) => LEVEL_COLOR[level] ?? 'hsl(var(--muted-foreground))';

/** Polish plural: 1 ćwiczenie, 2–4 ćwiczenia, 5+ ćwiczeń. */
export function exerciseCount(n: number) {
  const word = n === 1 ? 'ćwiczenie' : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? 'ćwiczenia' : 'ćwiczeń';
  return `${n} ${word}`;
}

export function totalSets(series: ExerciseSeries[] | undefined) {
  return (series ?? []).reduce((sum, s) => sum + (s.sets?.length ?? 0), 0);
}

const EXERCISE_TYPE: Record<'weight' | 'reps' | 'duration', { label: string; icon: LucideIcon }> = {
  weight: { label: 'Na ciężar', icon: Dumbbell },
  reps: { label: 'Na powtórzenia', icon: Repeat },
  duration: { label: 'Na czas', icon: Timer },
};

export const exerciseTypeInfo = (type: ExerciseSeries['exercise']['type']) => EXERCISE_TYPE[type ?? 'weight'];

function range(values: number[], unit = '') {
  if (values.length === 0) return '–';
  const min = Math.min(...values);
  const max = Math.max(...values);
  return min === max ? `${min}${unit}` : `${min}–${max}${unit}`;
}

/** Compact "3 × 8–10" / "3 × 30 s" summary of a series, depending on the exercise type. */
export function seriesTarget(series: ExerciseSeries) {
  const sets = series.sets ?? [];
  if (series.exercise.type === 'duration') {
    const d = sets.map(s => s.duration).filter((v): v is number => v !== undefined);
    return { sets: sets.length, value: range(d), unit: 's' };
  }
  const reps = sets.map(s => s.reps).filter((v): v is number => v !== undefined);
  return { sets: sets.length, value: range(reps), unit: 'powt.' };
}

/** Heaviest planned weight in kg, if any set is weight-based. */
export function topWeight(series: ExerciseSeries) {
  const w = (series.sets ?? [])
    .filter(s => (s.weightUnit ?? 'kg') === 'kg' && s.weight !== undefined && s.weight > 0)
    .map(s => s.weight as number);
  return w.length ? Math.max(...w) : null;
}
