import type { AthleteStats, WeekStats } from './stats';

/**
 * Wyzwania tygodnia: trzy zadania na tydzień (pon–ndz), dobierane do tego,
 * ile użytkownik realnie trenował przez ostatnie cztery tygodnie.
 */

export type QuestId = 'workouts' | 'volume' | 'active_days';

export interface QuestDefinition {
  id: QuestId;
  target: number;
  xp: number;
}

export interface QuestView extends QuestDefinition {
  title: string;
  /** Postęp w tej samej jednostce co `target`. */
  progress: number;
  unit: string;
  completed: boolean;
  rewarded: boolean;
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

/** Cele ustalane raz, na początku tygodnia — nie przesuwają się w jego trakcie. */
export function pickWeeklyQuests(baseline: AthleteStats['baseline']): QuestDefinition[] {
  const workouts = clamp(Math.round(baseline.workoutsPerWeek) + 1, 2, 6);
  // O ~10% więcej niż średnia, zaokrąglone do pół tony; minimum 2 t dla początkujących.
  const volume = Math.max(2000, Math.round((baseline.volumePerWeekKg * 1.1) / 500) * 500);
  const activeDays = clamp(workouts + 1, 3, 6);

  return [
    { id: 'workouts', target: workouts, xp: 100 },
    { id: 'volume', target: volume, xp: 120 },
    { id: 'active_days', target: activeDays, xp: 80 },
  ];
}

export function questProgress(id: string, week: WeekStats): number {
  if (id === 'workouts') return week.workouts;
  if (id === 'volume') return week.volumeKg;
  if (id === 'active_days') return week.activeDays;
  return 0;
}

function plural(n: number, one: string, few: string, many: string): string {
  if (n === 1) return one;
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

export function questTitle(id: string, target: number): string {
  if (id === 'workouts') return `Zrób ${target} ${plural(target, 'trening', 'treningi', 'treningów')}`;
  if (id === 'volume') return `Podnieś ${(target / 1000).toLocaleString('pl-PL')} t w tydzień`;
  if (id === 'active_days') return `Bądź aktywny przez ${target} ${plural(target, 'dzień', 'dni', 'dni')}`;
  return 'Wyzwanie';
}

export function questUnit(id: string): string {
  return id === 'volume' ? 'kg' : id === 'active_days' ? 'dni' : '';
}

export function buildQuestViews(
  items: { id: string; target: number; xp: number; rewardedAt?: Date | string | null }[],
  week: WeekStats
): QuestView[] {
  return items.map(item => {
    const progress = questProgress(item.id, week);
    return {
      id: item.id as QuestId,
      target: item.target,
      xp: item.xp,
      title: questTitle(item.id, item.target),
      progress: Math.min(progress, item.target),
      unit: questUnit(item.id),
      completed: progress >= item.target,
      rewarded: Boolean(item.rewardedAt),
    };
  });
}
