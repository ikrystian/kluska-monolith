import type { Cache, State } from 'swr';

const STORAGE_KEY = 'athlete-spa:swr-cache';

/**
 * localStorage tops out around 5 MB and is shared with auth, drafts and
 * preferences, so the cache gets a conservative slice of it. Reads that do
 * not fit are left out rather than allowed to evict a workout draft.
 */
const MAX_SERIALISED_BYTES = 1_500_000;

type CacheEntry = [string, State<unknown>];

function isPersistable(key: string, value: State<unknown> | undefined): boolean {
  // Only successful reads are worth restoring — replaying an old error would
  // show a failure that may no longer be true.
  return Boolean(key.startsWith('/api/') && value && value.data !== undefined && !value.error);
}

/** Wipes the snapshot; call on logout so one account's data can't surface under another. */
export function clearPersistedCache(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to clear if storage is unavailable.
  }
}

/**
 * Drops entries whose key matches `match` from the on-disk snapshot right now,
 * rather than waiting for the next background write. Used when a workout is
 * saved or discarded so an app killed before it backgrounds can't restore the
 * finished session as a phantom "in-progress" workout.
 */
export function purgePersistedEntries(match: (key: string) => boolean): void {
  try {
    const snapshot = readSnapshot();
    if (snapshot.length === 0) return;
    const kept = snapshot.filter(([key]) => !match(key));
    if (kept.length === snapshot.length) return;
    if (kept.length === 0) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(kept));
    }
  } catch {
    // Storage unavailable — nothing to purge.
  }
}

function readSnapshot(): CacheEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * One read above this stays out of the snapshot. The whole exercise library is
 * a single ~12 MB read; counted in, it used to push the snapshot over its limit
 * and take every other screen's data with it, so nothing survived a restart.
 */
const MAX_ENTRY_BYTES = 250_000;
/** Lists longer than this are skipped without even being serialised. */
const MAX_ENTRY_ROWS = 1_000;

function writeSnapshot(map: Map<string, State<unknown>>): void {
  try {
    const parts: string[] = [];
    let total = 2;
    for (const [key, value] of map.entries()) {
      if (!isPersistable(key, value)) continue;
      if (Array.isArray(value.data) && value.data.length > MAX_ENTRY_ROWS) continue;

      const serialised = JSON.stringify([key, { data: value.data }] satisfies CacheEntry);
      if (serialised.length > MAX_ENTRY_BYTES) continue;
      // Over budget: leave this one out, a smaller later one may still fit.
      if (total + serialised.length + 1 > MAX_SERIALISED_BYTES) continue;

      parts.push(serialised);
      total += serialised.length + 1;
    }

    if (parts.length === 0) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    localStorage.setItem(STORAGE_KEY, `[${parts.join(',')}]`);
  } catch {
    // Quota exceeded or storage disabled — the app works, just without a
    // warm cache on next start.
  }
}

/**
 * SWR cache backed by a localStorage snapshot.
 *
 * Without it every cold start begins with empty skeletons and a network round
 * trip — which in a gym basement means blank screens. Restoring the last known
 * data makes the app readable offline; SWR still revalidates in the background
 * as soon as a request succeeds.
 *
 * The snapshot is written when the app is backgrounded rather than only on
 * `beforeunload`, which Android does not reliably fire when it kills a WebView.
 */
export function createPersistentCacheProvider() {
  return (): Cache => {
    const map = new Map<string, State<unknown>>(readSnapshot());

    const persist = () => writeSnapshot(map);

    // `hidden` is the last reliable moment on Android; `pagehide` covers
    // navigations away in a plain browser tab.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') persist();
    });
    window.addEventListener('pagehide', persist);

    return map as Cache;
  };
}
