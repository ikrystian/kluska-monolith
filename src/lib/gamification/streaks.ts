/**
 * Kalendarz aktywności: klucze dni i serie liczone w dniach kalendarzowych.
 * Czyste funkcje — bez bazy, żeby dało się je sprawdzić skryptem.
 */

/** Strefa, w której liczymy „dzień” — aplikacja jest polska. */
export const APP_TZ = 'Europe/Warsaw';

const DAY_MS = 86_400_000;

const keyFormatter = new Intl.DateTimeFormat('sv-SE', {
  timeZone: APP_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const partsFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: APP_TZ,
  hour: '2-digit',
  hourCycle: 'h23',
  weekday: 'short',
});

/** `YYYY-MM-DD` w strefie aplikacji. */
export function dayKey(date: Date | string | number): string {
  return keyFormatter.format(new Date(date));
}

/** Godzina (0–23) i dzień tygodnia w strefie aplikacji. */
export function localClock(date: Date | string | number): { hour: number; weekend: boolean } {
  const parts = partsFormatter.formatToParts(new Date(date));
  const hour = Number(parts.find(p => p.type === 'hour')?.value ?? 0);
  const weekday = parts.find(p => p.type === 'weekday')?.value ?? '';
  return { hour, weekend: weekday === 'Sat' || weekday === 'Sun' };
}

function keyToUtc(key: string): number {
  const [y, m, d] = key.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

/** Różnica w dniach kalendarzowych między dwoma kluczami (b − a). */
export function daysBetween(a: string, b: string): number {
  return Math.round((keyToUtc(b) - keyToUtc(a)) / DAY_MS);
}

export function shiftDayKey(key: string, days: number): string {
  return new Date(keyToUtc(key) + days * DAY_MS).toISOString().slice(0, 10);
}

/** Poniedziałek tygodnia, w którym leży `key`. */
export function weekStartKey(key: string): string {
  const weekday = new Date(keyToUtc(key)).getUTCDay(); // 0 = niedziela
  return shiftDayKey(key, -((weekday + 6) % 7));
}

export interface StreakSummary {
  /** Seria kończąca się dziś albo wczoraj (dzisiejszy dzień jeszcze trwa). */
  current: number;
  longest: number;
  activeDays: number;
  lastActiveDay: string | null;
}

export function computeStreaks(days: Iterable<string>, todayKey: string): StreakSummary {
  const sorted = [...new Set(days)].sort();
  if (sorted.length === 0) return { current: 0, longest: 0, activeDays: 0, lastActiveDay: null };

  let longest = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    run = daysBetween(sorted[i - 1], sorted[i]) === 1 ? run + 1 : 1;
    if (run > longest) longest = run;
  }

  const last = sorted[sorted.length - 1];
  // `run` po pętli to długość serii kończącej się w ostatnim aktywnym dniu.
  const current = daysBetween(last, todayKey) <= 1 ? run : 0;

  return { current, longest, activeDays: sorted.length, lastActiveDay: last };
}

/** Seria ze snapshotu jest ważna tylko, gdy ostatni aktywny dzień to dziś lub wczoraj. */
export function effectiveStreak(current: number, lastActiveDay: string | null | undefined, todayKey: string): number {
  if (!lastActiveDay) return 0;
  return daysBetween(lastActiveDay, todayKey) <= 1 ? current : 0;
}

/** Ile aktywnych dni w tygodniu podtrzymuje serię tygodniową. */
export const WEEKLY_STREAK_DAYS = 3;

/**
 * Seria tygodni (pon–ndz) z co najmniej `perWeek` aktywnymi dniami.
 * Bieżący tydzień liczy się, gdy już spełnia próg; jeśli jeszcze nie —
 * nie zrywa serii, bo wciąż trwa.
 */
export function computeWeeklyStreak(days: Iterable<string>, todayKey: string, perWeek = WEEKLY_STREAK_DAYS): number {
  const perWeekCount = new Map<string, number>();
  for (const day of new Set(days)) {
    const week = weekStartKey(day);
    perWeekCount.set(week, (perWeekCount.get(week) ?? 0) + 1);
  }

  const qualifies = (week: string) => (perWeekCount.get(week) ?? 0) >= perWeek;
  let week = weekStartKey(todayKey);
  let streak = 0;
  if (qualifies(week)) streak += 1;
  week = shiftDayKey(week, -7);
  while (qualifies(week)) {
    streak += 1;
    week = shiftDayKey(week, -7);
  }
  return streak;
}
