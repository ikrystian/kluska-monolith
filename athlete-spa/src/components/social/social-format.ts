import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns';
import { pl } from 'date-fns/locale';

export function timeAgo(date: string | Date): string {
  try {
    return formatDistanceToNow(new Date(date), { addSuffix: true, locale: pl });
  } catch {
    return 'niedawno';
  }
}

/** Day heading for a feed section: "Dzisiaj", "Wczoraj" or "poniedziałek, 3 listopada". */
export function dayLabel(date: string | Date): string {
  const d = new Date(date);
  if (isToday(d)) return 'Dzisiaj';
  if (isYesterday(d)) return 'Wczoraj';
  return format(d, 'EEEE, d MMMM', { locale: pl });
}

export function formatDuration(minutes?: number): string | null {
  if (!minutes) return null;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return h > 0 ? `${h} h ${m} min` : `${m} min`;
}

/** Polish plural: pluralPl(2, 'zaproszenie', 'zaproszenia', 'zaproszeń') → "zaproszenia". */
export function pluralPl(count: number, one: string, few: string, many: string): string {
  if (count === 1) return one;
  const lastDigit = count % 10;
  const lastTwo = count % 100;
  return lastDigit >= 2 && lastDigit <= 4 && (lastTwo < 12 || lastTwo > 14) ? few : many;
}
