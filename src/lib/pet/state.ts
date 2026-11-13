/**
 * Wskaźniki zwierzaka. Czyste funkcje: zanik liczymy leniwie przy odczycie
 * z czasu ostatniej zmiany — backend nie ma crona i go nie potrzebuje.
 */
import { daysBetween } from '@/lib/gamification/streaks';

const HOUR_MS = 3_600_000;

/** Pełna sytość znika w 48 h, pełna radość w 72 h. */
export const HUNGER_DECAY_PER_HOUR = 100 / 48;
export const JOY_DECAY_PER_HOUR = 100 / 72;

export interface DecayingStat {
  value: number;
  updatedAt: Date | string;
  /** Do tego momentu wartość stoi w miejscu (sycący posiłek). */
  holdUntil?: Date | string | null;
}

const clamp = (value: number) => Math.max(0, Math.min(100, value));

/** Aktualna wartość wskaźnika po uwzględnieniu upływu czasu. */
export function decayedValue(stat: DecayingStat | undefined | null, ratePerHour: number, now: Date = new Date()): number {
  if (!stat) return 0;
  const from = Math.max(new Date(stat.updatedAt).getTime(), stat.holdUntil ? new Date(stat.holdUntil).getTime() : 0);
  const hours = Math.max(0, (now.getTime() - from) / HOUR_MS);
  return clamp(stat.value - hours * ratePerHour);
}

/** Nowy stan wskaźnika po dodaniu `amount` (karmienie, zabawa). */
export function boostStat(
  stat: DecayingStat | undefined | null,
  ratePerHour: number,
  amount: number,
  now: Date = new Date(),
  holdHours = 0
): { value: number; updatedAt: Date; holdUntil?: Date } {
  const value = clamp(decayedValue(stat, ratePerHour, now) + amount);
  const previousHold = stat?.holdUntil ? new Date(stat.holdUntil).getTime() : 0;
  const hold = Math.max(previousHold, holdHours > 0 ? now.getTime() + holdHours * HOUR_MS : 0);
  return { value, updatedAt: now, ...(hold > now.getTime() ? { holdUntil: new Date(hold) } : {}) };
}

/** Kiedy wskaźnik spadnie do `threshold` (do planowania powiadomień). `null`, gdy już jest poniżej. */
export function timeUntilBelow(
  stat: DecayingStat | undefined | null,
  ratePerHour: number,
  threshold: number,
  now: Date = new Date()
): Date | null {
  const current = decayedValue(stat, ratePerHour, now);
  if (current <= threshold) return null;
  const holdUntil = stat?.holdUntil ? new Date(stat.holdUntil).getTime() : 0;
  const start = Math.max(now.getTime(), holdUntil);
  return new Date(start + ((current - threshold) / ratePerHour) * HOUR_MS);
}

/**
 * Forma odzwierciedla regularność: dzień po treningu 100, potem −15 za każdy
 * dzień przerwy, ale nigdy poniżej 20 — zwierzak rozleniwia się, nie choruje.
 * Pierwszy trening po przerwie od razu przywraca 100.
 */
export function formFromActivity(lastActiveDay: string | null | undefined, todayKey: string): number {
  if (!lastActiveDay) return 20;
  const idleDays = Math.max(0, daysBetween(lastActiveDay, todayKey));
  return Math.max(20, 100 - 15 * Math.max(0, idleDays - 1));
}

export type PetMood = 'energetic' | 'happy' | 'hungry' | 'sad' | 'lazy' | 'sleepy';
export type PetThought = 'food' | 'play' | 'workout' | null;

export function petMood(stats: { hunger: number; joy: number; form: number }): PetMood {
  if (stats.form <= 25) return 'sleepy';
  if (stats.hunger < 25) return 'hungry';
  if (stats.form <= 55) return 'lazy';
  if (stats.joy < 25) return 'sad';
  if (stats.form >= 85 && stats.hunger >= 50 && stats.joy >= 50) return 'energetic';
  return 'happy';
}

/** O czym zwierzak teraz myśli — najpilniejsza potrzeba. */
export function petThought(stats: { hunger: number; joy: number; form: number }): PetThought {
  if (stats.hunger < 40) return 'food';
  if (stats.form <= 70) return 'workout';
  if (stats.joy < 50) return 'play';
  return null;
}
