import { differenceInCalendarDays } from 'date-fns';
import type { ExerciseSeries, Workout, WorkoutLog } from '@/lib/types';
import { areaOfMuscle, areaReadiness, MUSCLE_AREAS, type MuscleAreaId } from '@/lib/muscle-areas';
import chestCover from '@/assets/workout-covers/chest.svg';
import backCover from '@/assets/workout-covers/back.svg';
import shouldersCover from '@/assets/workout-covers/shoulders.svg';
import armsCover from '@/assets/workout-covers/arms.svg';
import legsCover from '@/assets/workout-covers/legs.svg';
import coreCover from '@/assets/workout-covers/core.svg';
import fullbodyCover from '@/assets/workout-covers/fullbody.svg';

export type TemplateFocus = MuscleAreaId | 'fullbody';

/** Cover art and label per training focus. Accent matches the art's dominant colour. */
export const FOCUS_META: Record<TemplateFocus, { label: string; cover: string; accent: string }> = {
  fullbody: { label: 'Całe ciało', cover: fullbodyCover, accent: '#ff6a2b' },
  chest: { label: 'Klatka', cover: chestCover, accent: '#ff6a2b' },
  back: { label: 'Plecy', cover: backCover, accent: '#4d8dff' },
  legs: { label: 'Nogi', cover: legsCover, accent: '#b5e83a' },
  shoulders: { label: 'Barki', cover: shouldersCover, accent: '#f5c04a' },
  arms: { label: 'Ramiona', cover: armsCover, accent: '#a88bff' },
  core: { label: 'Brzuch', cover: coreCover, accent: '#2dd4bf' },
};

export const FOCUS_ORDER: TemplateFocus[] = ['fullbody', 'chest', 'back', 'legs', 'shoulders', 'arms', 'core'];

/**
 * Share of the template's working sets per muscle area. An exercise that
 * hits several areas splits its sets between them.
 */
export function areaShares(series: ExerciseSeries[] | undefined): Map<MuscleAreaId | 'fullbody', number> {
  const totals = new Map<MuscleAreaId | 'fullbody', number>();
  let sum = 0;
  for (const s of series ?? []) {
    const weight = Math.max(1, s.sets?.length ?? 0);
    const groups = s.exercise?.mainMuscleGroups?.map(g => g.name) ?? [];
    const areas = [...new Set(groups.map(name => (name === 'Całe ciało' ? 'fullbody' : areaOfMuscle(name))).filter(Boolean))] as (MuscleAreaId | 'fullbody')[];
    if (areas.length === 0) continue;
    for (const area of areas) totals.set(area, (totals.get(area) ?? 0) + weight / areas.length);
    sum += weight;
  }
  if (sum > 0) for (const [k, v] of totals) totals.set(k, v / sum);
  return totals;
}

/**
 * What a template is "about": legs plus a real upper-body block reads as
 * full body, otherwise the area with the most sets wins (Push → klatka,
 * Pull → plecy).
 */
export function templateFocus(series: ExerciseSeries[] | undefined): TemplateFocus {
  const shares = areaShares(series);
  if (shares.size === 0) return 'fullbody';
  if ((shares.get('fullbody') ?? 0) >= 0.3) return 'fullbody';
  const upper = (shares.get('chest') ?? 0) + (shares.get('back') ?? 0) + (shares.get('shoulders') ?? 0);
  if ((shares.get('legs') ?? 0) >= 0.25 && upper >= 0.25) return 'fullbody';
  let best: MuscleAreaId = 'chest';
  let bestShare = -1;
  for (const area of MUSCLE_AREAS) {
    const share = shares.get(area.id) ?? 0;
    if (share > bestShare) {
      best = area.id;
      bestShare = share;
    }
  }
  return best;
}

/** Areas worth naming for a template, biggest first. */
export function templateAreaLabels(series: ExerciseSeries[] | undefined, max = 3): string[] {
  return [...areaShares(series).entries()]
    .filter(([id, share]) => id !== 'fullbody' && share >= 0.12)
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([id]) => MUSCLE_AREAS.find(a => a.id === id)?.label ?? '')
    .filter(Boolean);
}

export const templateCover = (workout: Pick<Workout, 'imageUrl' | 'exerciseSeries'>) =>
  workout.imageUrl || FOCUS_META[templateFocus(workout.exerciseSeries)].cover;

export const totalSetCount = (series: ExerciseSeries[] | undefined) =>
  (series ?? []).reduce((sum, s) => sum + (s.sets?.length ?? 0), 0);

/** The most recent completed session started from this template (logs are newest first). */
export const lastSessionOf = (template: Workout, logs: WorkoutLog[] | null | undefined) =>
  logs?.find(log => log.sourceWorkoutId === template.id || log.workoutName === template.name) ?? null;

/** "dziś", "wczoraj", "3 dni temu". */
export function relativeDay(date: Date, now = new Date()) {
  const days = differenceInCalendarDays(now, date);
  if (days <= 0) return 'dziś';
  if (days === 1) return 'wczoraj';
  if (days < 7) return `${days} dni temu`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return weeks === 1 ? 'tydzień temu' : `${weeks} tyg. temu`;
  return `${Math.floor(days / 30)} mies. temu`;
}

export interface Recommendation {
  template: Workout;
  reason: string;
}

/**
 * Today's pick: the template whose muscles have recovered best, nudged away
 * from anything done in the last day and towards the athlete's own,
 * least-recently-used templates.
 */
export function recommendTemplate(templates: Workout[], logs: WorkoutLog[] | null | undefined, now = new Date()): Recommendation | null {
  const candidates = templates.filter(t => (t.exerciseSeries?.length ?? 0) > 0);
  if (candidates.length === 0) return null;

  const history = logs ?? [];
  const readiness = new Map(areaReadiness(history, now).map(a => [a.id, a.ready]));

  let best: { template: Workout; score: number } | null = null;
  for (const template of candidates) {
    const shares = areaShares(template.exerciseSeries);
    let weighted = 0;
    let weight = 0;
    for (const [id, share] of shares) {
      if (id === 'fullbody') {
        const avg = [...readiness.values()].reduce((a, b) => a + b, 0) / Math.max(1, readiness.size);
        weighted += avg * share;
      } else {
        weighted += (readiness.get(id) ?? 1) * share;
      }
      weight += share;
    }
    let score = weight > 0 ? weighted / weight : 1;
    const last = lastSessionOf(template, history);
    if (last) {
      const days = Math.max(0, differenceInCalendarDays(now, new Date(last.endTime)));
      if (days < 1) score -= 0.5;
      score += Math.min(days, 14) / 140;
    } else {
      score += 0.06;
    }
    if (template.ownerId && template.ownerId !== 'public') score += 0.05;
    if (!best || score > best.score) best = { template, score };
  }
  if (!best) return null;

  if (history.length === 0) return { template: best.template, reason: 'Dobry początek tygodnia' };
  const ready = templateAreaLabels(best.template.exerciseSeries)
    .filter(label => (readiness.get(MUSCLE_AREAS.find(a => a.label === label)?.id as MuscleAreaId) ?? 1) >= 1)
    .map(label => label.toLowerCase());
  return {
    template: best.template,
    reason: ready.length > 0 ? `Wypoczęte: ${ready.join(', ')}` : 'Najlepiej wypoczęte partie',
  };
}
