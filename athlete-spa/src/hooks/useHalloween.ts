import useSWR from 'swr';
import { jsonFetcher } from '@/lib/db-hooks';

interface PublicSettings {
  halloweenEnabled: boolean;
}

/** The overlay runs from 20 October through 1 November (inclusive) every year. */
const SEASON_START = { month: 9, day: 20 };
const SEASON_END = { month: 10, day: 1 };

/** Whether `date` (local time) falls inside the yearly Halloween window. */
export function isHalloweenSeason(date: Date = new Date()): boolean {
  const month = date.getMonth();
  const day = date.getDate();
  const afterStart = month > SEASON_START.month || (month === SEASON_START.month && day >= SEASON_START.day);
  const beforeEnd = month < SEASON_END.month || (month === SEASON_END.month && day <= SEASON_END.day);
  return afterStart && beforeEnd;
}

/**
 * Whether the Halloween overlay should be on screen: inside the yearly window
 * AND switched on by an admin (Ustawienia in the admin panel). The setting is
 * only requested during the season, and nothing shows until it has loaded so a
 * disabled overlay doesn't flash.
 */
export function useHalloween(): boolean {
  const inSeason = isHalloweenSeason();
  const { data } = useSWR<PublicSettings>(inSeason ? '/api/public/settings' : null, jsonFetcher);
  return inSeason && data?.halloweenEnabled === true;
}
