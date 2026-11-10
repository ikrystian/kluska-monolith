import { useEffect, useState } from 'react';

/* The page runs a New Year campaign from October to December ("don't wait for January") and
   switches by itself to an evergreen message for the rest of the year ("don't wait for Monday"). */

const DAY = 86_400_000;

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

export const daysBetween = (a: Date, b: Date) => Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / DAY);

export const daysInYear = (year: number) => daysBetween(new Date(year, 0, 1), new Date(year + 1, 0, 1));

export function getSeason(now: Date) {
  const year = now.getFullYear();
  const pre = now.getMonth() >= 9;
  const newYear = new Date(year + 1, 0, 1);
  const left = Math.max(0, newYear.getTime() - now.getTime());

  return {
    /** true from October to December: the countdown to 1 January is on */
    pre,
    /** the year the visitor is planning */
    planYear: pre ? year + 1 : year,
    days: Math.floor(left / DAY),
    hours: Math.floor(left / 3_600_000) % 24,
    minutes: Math.floor(left / 60_000) % 60,
    seconds: Math.floor(left / 1000) % 60,
    dayOfYear: daysBetween(new Date(year, 0, 1), now) + 1,
    daysInYear: daysInYear(year),
  };
}

export type Season = ReturnType<typeof getSeason>;

/** The current time, refreshed every `interval` ms. */
export function useNow(interval = 1000) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), interval);
    return () => window.clearInterval(id);
  }, [interval]);

  return now;
}

export const plural = (n: number, one: string, few: string, many: string) => {
  if (n === 1) return one;
  const d = n % 10;
  const h = n % 100;
  return d >= 2 && d <= 4 && !(h >= 12 && h <= 14) ? few : many;
};
