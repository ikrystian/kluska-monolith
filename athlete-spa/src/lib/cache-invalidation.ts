import type { Cache, Middleware, ScopedMutator } from 'swr';
import { useEffect } from 'react';
import { forgetFreshness } from '@/lib/cache-freshness';

/**
 * Keeps SWR's cache honest after writes.
 *
 * Reads are cached aggressively (and persisted across cold starts), so every
 * successful non-GET request made through `apiFetch` — including offline
 * mutations replayed later — marks the reads it could have changed as stale:
 *  - keys a mounted screen is showing are revalidated in place (no skeleton);
 *  - keys nobody is showing are dropped, so the next visit fetches fresh data
 *    instead of flashing the old snapshot first.
 */

interface Binding {
  mutate: ScopedMutator;
  cache: Cache;
}

let binding: Binding | null = null;

/** Registered once from inside <SWRConfig> so we talk to the app's cache, not SWR's default. */
export function bindCacheInvalidation(next: Binding | null) {
  binding = next;
}

/** Reference-counted set of keys that currently have a mounted `useSWR` consumer. */
const activeKeys = new Map<string, number>();

export const trackActiveKeys: Middleware = (useSWRNext) => (key, fetcher, config) => {
  const swr = useSWRNext(key, fetcher, config);
  const stringKey = typeof key === 'string' ? key : null;

  useEffect(() => {
    if (!stringKey) return;
    activeKeys.set(stringKey, (activeKeys.get(stringKey) ?? 0) + 1);
    return () => {
      const count = (activeKeys.get(stringKey) ?? 1) - 1;
      if (count <= 0) activeKeys.delete(stringKey);
      else activeKeys.set(stringKey, count);
    };
  }, [stringKey]);

  return swr;
};

type KeyMatcher = (key: string) => boolean;

const startsWithAny = (prefixes: string[]): KeyMatcher => (key) =>
  prefixes.some((prefix) => key.startsWith(prefix));

/** Writes that never change anything the app reads back through SWR. */
const NEVER_STALE = [
  '/api/auth',
  '/api/upload',
  '/api/generate-image',
  '/api/spotify',
  '/api/push',
  '/api/notifications',
];

/** Chat is self-contained and polled; a workout write must not reload it (and vice versa). */
const CHAT_PREFIXES = ['/api/conversations', '/api/db/conversations', '/api/db/messages'];

/** Which cached reads can a write to `path` have changed? `null` = none. */
export function staleKeyMatcher(path: string): KeyMatcher | null {
  const pathname = path.split('?')[0];
  if (NEVER_STALE.some((prefix) => pathname.startsWith(prefix))) return null;

  if (CHAT_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return startsWithAny(CHAT_PREFIXES);
  }

  // Everything else (workout logs, measurements, nutrition, check-ins,
  // challenges, social, …) feeds derived aggregates — progress, gamification,
  // dashboard summaries, the profile — so a write invalidates every cached
  // read except chat. Writes are rare next to reads; correctness over reuse.
  return (key) => key.startsWith('/api/') && !CHAT_PREFIXES.some((prefix) => key.startsWith(prefix));
}

/**
 * `only` narrows the default "everything but chat" to the reads a write is
 * known to affect — for writes that repeat often and feed nothing else, like
 * the autosave of a workout in progress.
 */
export function invalidateAfterMutation(path: string, only?: KeyMatcher): void {
  const matcher = staleKeyMatcher(path);
  if (!matcher) return;
  invalidateMatching(only ? (key) => matcher(key) && only(key) : matcher);
}

/** Drops unseen cached reads matching `matcher` and revalidates the visible ones. */
export function invalidateMatching(matcher: KeyMatcher): void {
  if (!binding) return;
  const { mutate, cache } = binding;
  // Reads answered from the cache while "fresh" must hit the network again.
  forgetFreshness(matcher);
  const keys = Array.from(cache.keys()).filter(matcher);
  const inactive = keys.filter((key) => !activeKeys.has(key));
  for (const key of inactive) {
    // Also clears SWR's own dedupe marker for the key. Left in place, a screen
    // opened within the dedupe window would neither find data nor fetch any.
    void mutate(key);
    cache.delete(key);
  }

  // No data argument: revalidate in place instead of blanking visible screens.
  void mutate((key) => typeof key === 'string' && activeKeys.has(key) && matcher(key));
}

/**
 * Rewrites one cached read in place, without refetching. Use this instead of
 * the `mutate` exported by 'swr': that one talks to SWR's default cache, which
 * this app does not use, so it sees nothing and changes nothing.
 */
export async function updateCached<T>(key: string, update: (current: T | undefined) => T | undefined): Promise<void> {
  if (!binding) return;
  await binding.mutate(key, update, { revalidate: false });
}

/**
 * Re-reads the matching reads a mounted screen is showing, but only the ones
 * no longer fresh — for "make sure this is current" moments that need no
 * network when the data was fetched a moment ago.
 */
export function revalidateStale(matcher: KeyMatcher): void {
  if (!binding) return;
  void binding.mutate((key) => typeof key === 'string' && activeKeys.has(key) && matcher(key));
}

/** Pull-to-refresh: re-reads everything on screen from the network, fresh or not. */
export function refreshAllVisible(): Promise<unknown> {
  forgetFreshness();
  if (!binding) return Promise.resolve();
  // No data argument: passing `undefined` would blank every screen to skeletons first.
  return binding.mutate((key) => typeof key === 'string' && activeKeys.has(key));
}

/** Empties the in-memory cache (logout) so the next account can't see this one's data. */
export function clearMemoryCache(): void {
  forgetFreshness();
  if (!binding) return;
  for (const key of Array.from(binding.cache.keys())) binding.cache.delete(key);
}
