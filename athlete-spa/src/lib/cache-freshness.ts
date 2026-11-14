import { useSWRConfig, type Cache, type Middleware } from 'swr';

/**
 * How long a successful read is trusted before the network is asked again.
 *
 * SWR on its own revalidates a key every time a component using it mounts and
 * every time the app regains focus. In a tab-based app that means each trip
 * back to a screen re-downloads everything on it, even seconds after the last
 * fetch — dozens of requests per minute of ordinary browsing, almost all of
 * them returning what is already on screen.
 *
 * Freshness is safe to lean on here because staleness has other exits:
 *  - every write made through `apiFetch` forgets the freshness of whatever it
 *    could have changed (lib/cache-invalidation), so own changes show at once;
 *  - pull-to-refresh forgets all of it;
 *  - a cold start begins with nothing marked fresh, so the snapshot restored
 *    from disk is always re-checked.
 * What remains is data changed by someone else, which shows up at most one
 * window late — the windows below are sized for that.
 */

const SECOND = 1000;
const MINUTE = 60 * SECOND;

/** The same for every user and edited rarely (by an admin or a trainer). */
const REFERENCE_TTL = 10 * MINUTE;
/** Everything else: own data, plus what friends, the trainer or the server may touch. */
const DEFAULT_TTL = 30 * SECOND;

const REFERENCE_PREFIXES = [
  '/api/db/exercises',
  '/api/db/muscleGroups',
  '/api/db/articles',
  '/api/db/articleCategories',
  '/api/db/gyms',
  '/api/db/runningPrograms',
  '/api/public/settings',
  '/api/dashboard-promos',
];

/** Chat and notifications are meant to be live; they are polled, never held back. */
const LIVE_PREFIXES = ['/api/conversations', '/api/db/conversations', '/api/db/messages', '/api/notifications'];

const startsWithAny = (key: string, prefixes: string[]) => prefixes.some((prefix) => key.startsWith(prefix));

export function freshForMs(key: string): number {
  if (!key.startsWith('/api/')) return 0;
  if (startsWithAny(key, LIVE_PREFIXES)) return 0;
  // `/api/gyms` is the gym list; `/api/gyms/<id>/favorites` is other people's activity.
  if (key === '/api/gyms' || startsWithAny(key, REFERENCE_PREFIXES)) return REFERENCE_TTL;
  return DEFAULT_TTL;
}

/** Key → when its last successful network read finished. */
const fetchedAt = new Map<string, number>();
/** Key → the network read currently under way, shared by everyone asking for it. */
const inFlight = new Map<string, Promise<unknown>>();

/**
 * Makes the next read of the matching keys go to the network. Also detaches
 * requests already under way: they started before whatever made the data
 * stale, so nobody new should be handed their answer.
 */
export function forgetFreshness(matcher?: (key: string) => boolean): void {
  if (!matcher) {
    fetchedAt.clear();
    inFlight.clear();
    return;
  }
  for (const key of Array.from(fetchedAt.keys())) if (matcher(key)) fetchedAt.delete(key);
  for (const key of Array.from(inFlight.keys())) if (matcher(key)) inFlight.delete(key);
}

/**
 * Like `forgetFreshness` for one key, but keeps a request already under way:
 * used by explicit "refetch" calls, which usually follow a write whose
 * invalidation has just started exactly that request.
 */
export function expireFreshness(key: string): void {
  fetchedAt.delete(key);
}

/**
 * SWR middleware: answers a revalidation from the cache while the key is still
 * fresh, and lets concurrent revalidations of one key share a single request.
 *
 * It gates the fetcher rather than SWR's own `dedupingInterval`, because that
 * one is driven by timers — which a backgrounded WebView throttles, so a phone
 * coming back after an hour could still see keys as "just fetched". Here
 * freshness is a timestamp compared at the moment of the read.
 */
export const freshness: Middleware = (useSWRNext) => (key, fetcher, config) => {
  const { cache } = useSWRConfig();

  // Polled keys must reach the network on every tick; only plain string keys are gated.
  if (typeof key !== 'string' || !fetcher || config.refreshInterval) {
    return useSWRNext(key, fetcher, config);
  }

  return useSWRNext(key, gate(key, fetcher, cache), config);
};

function gate<F>(key: string, fetcher: F, cache: Cache): F {
  const ttl = freshForMs(key);
  return ((...args: unknown[]) => {
    const at = fetchedAt.get(key);
    if (ttl > 0 && at !== undefined && Date.now() - at < ttl) {
      // The cache, not a private copy: it also carries local optimistic updates.
      const current = cache.get(key);
      if (current && current.data !== undefined && !current.error) return current.data;
    }

    const pending = inFlight.get(key);
    if (pending) return pending;

    const request: Promise<unknown> = Promise.resolve((fetcher as (...a: unknown[]) => unknown)(...args))
      .then((data) => {
        // Still the registered request → nothing invalidated the key meanwhile.
        if (inFlight.get(key) === request) fetchedAt.set(key, Date.now());
        return data;
      })
      .finally(() => {
        if (inFlight.get(key) === request) inFlight.delete(key);
      });
    inFlight.set(key, request);
    return request;
  }) as F;
}
