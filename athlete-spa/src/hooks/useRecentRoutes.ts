import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

const STORAGE_KEY = 'athlete-spa:recent-routes';
const MAX_ENTRIES = 4;

/** Screens reachable from the bottom bar don't belong in a shortcut list. */
const EXCLUDED = new Set([
  '/athlete/dashboard',
  '/athlete/calendar',
  '/athlete/log',
  '/athlete/chat',
  '/athlete/onboarding',
]);

function read(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

/**
 * Most-recently-visited screens, so the "more" menu can surface what this
 * athlete actually uses instead of making them re-scan the full list.
 *
 * Only exact top-level athlete routes are recorded — detail screens like
 * `/athlete/history/:id` aren't useful as shortcuts.
 */
export function useRecentRoutes(): string[] {
  const { pathname } = useLocation();
  const [recent, setRecent] = useState<string[]>(read);

  useEffect(() => {
    const segments = pathname.split('/').filter(Boolean);
    const isTopLevelAthleteRoute = segments.length === 2 && segments[0] === 'athlete';
    if (!isTopLevelAthleteRoute || EXCLUDED.has(pathname)) return;

    setRecent(previous => {
      if (previous[0] === pathname) return previous;
      const next = [pathname, ...previous.filter(p => p !== pathname)].slice(0, MAX_ENTRIES);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Storage unavailable — the list just won't survive a reload.
      }
      return next;
    });
  }, [pathname]);

  return recent;
}
