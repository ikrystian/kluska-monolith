/**
 * Small in-process cache for reads that are the same for every caller and
 * change rarely (the exercise library, gyms, muscle groups, the leaderboard…).
 *
 * Those reads used to hit MongoDB on every request from every device. Here a
 * result is computed once and reused until it expires or a write to the same
 * data drops it. Entries are bounded by total size, oldest-used first out.
 *
 * It lives in the Node process: with more than one server instance a write on
 * one instance is only seen by the others once the TTL runs out, so keep TTLs
 * short for anything a user edits and expects to see back at once.
 */

interface Entry {
  value: unknown;
  expiresAt: number;
  size: number;
}

interface CacheState {
  entries: Map<string, Entry>;
  pending: Map<string, Promise<unknown>>;
  /** Bumped by every invalidation, so a load that raced with a write is not stored. */
  generation: number;
  bytes: number;
}

/** Upper bound for everything held at once. */
const MAX_BYTES = 64 * 1024 * 1024;
/** A single value above this is returned but never stored (the full exercise library is ~12 MB). */
const MAX_ENTRY_BYTES = 16 * 1024 * 1024;

const globalRef = globalThis as typeof globalThis & { __kluskaServerCache?: CacheState };

// On `globalThis` so dev hot reloads keep one cache instead of leaking one per reload.
const state: CacheState = (globalRef.__kluskaServerCache ??= {
  entries: new Map(),
  pending: new Map(),
  generation: 0,
  bytes: 0,
});

function drop(key: string) {
  const entry = state.entries.get(key);
  if (!entry) return;
  state.entries.delete(key);
  state.bytes -= entry.size;
}

function store(key: string, value: unknown, ttlMs: number, size: number) {
  drop(key);
  if (size > MAX_ENTRY_BYTES) return;
  state.entries.set(key, { value, expiresAt: Date.now() + ttlMs, size });
  state.bytes += size;
  // Map iteration order is insertion order, and reads re-insert — so the
  // first keys are the least recently used.
  for (const oldest of state.entries.keys()) {
    if (state.bytes <= MAX_BYTES) break;
    drop(oldest);
  }
}

export interface CachedOptions<T> {
  /** How long a computed value may be reused. */
  ttlMs: number;
  /** Approximate size in bytes; defaults to a nominal 1 kB for small values. */
  sizeOf?: (value: T) => number;
}

/**
 * Returns the cached value for `key`, computing it with `load` when missing or
 * expired. Concurrent callers of a missing key share one `load` (no stampede
 * when a popular entry expires). Failures are never cached.
 */
export async function cached<T>(key: string, options: CachedOptions<T>, load: () => Promise<T>): Promise<T> {
  const hit = state.entries.get(key);
  if (hit) {
    if (hit.expiresAt > Date.now()) {
      // Refresh recency.
      state.entries.delete(key);
      state.entries.set(key, hit);
      return hit.value as T;
    }
    drop(key);
  }

  const inFlight = state.pending.get(key);
  if (inFlight) return inFlight as Promise<T>;

  const generation = state.generation;
  const promise = load()
    .then((value) => {
      // A write landed while this was loading: the value may predate it.
      if (generation === state.generation) {
        store(key, value, options.ttlMs, options.sizeOf ? options.sizeOf(value) : 1024);
      }
      return value;
    })
    .finally(() => {
      if (state.pending.get(key) === promise) state.pending.delete(key);
    });

  state.pending.set(key, promise);
  return promise;
}

/** Drops every entry whose key starts with one of `prefixes`. Call after a write. */
export function invalidateCached(...prefixes: string[]): void {
  state.generation++;
  for (const key of Array.from(state.entries.keys())) {
    if (prefixes.some((prefix) => key.startsWith(prefix))) drop(key);
  }
  for (const key of Array.from(state.pending.keys())) {
    if (prefixes.some((prefix) => key.startsWith(prefix))) state.pending.delete(key);
  }
}

/** Every Mongoose operation that can change what a read returns. */
const WRITE_HOOKS = [
  'save',
  'insertMany',
  'bulkWrite',
  'updateOne',
  'updateMany',
  'replaceOne',
  'findOneAndUpdate',
  'findOneAndReplace',
  'findOneAndDelete',
  'deleteOne',
  'deleteMany',
];

/**
 * Makes any write to a model drop the cached reads under `prefixes`, whichever
 * route or script in this process performed it — so callers of `cached` never
 * have to remember to invalidate.
 */
export function invalidateOnWrite(schema: { post: (...args: any[]) => unknown }, ...prefixes: string[]): void {
  const invalidate = () => invalidateCached(...prefixes);
  for (const hook of WRITE_HOOKS) schema.post(hook, invalidate);
  // `doc.deleteOne()` is document middleware, which the plain name does not cover.
  schema.post('deleteOne', { document: true, query: false }, invalidate);
}

/** Key prefixes, so writers and readers can't drift apart on spelling. */
export const cacheKeys = {
  /** Generic `/api/db/<collection>` list reads. */
  collection: (collection: string) => `db:${collection}:`,
  gyms: 'gyms:',
  appSettings: 'app-settings',
  dashboardPromos: 'dashboard-promos',
  ads: 'ads:',
  leaderboard: 'leaderboard:',
  publicExercise: (id: string) => `public-exercise:${id}`,
  publicProfile: (id: string) => `public-profile:${id}`,
};
