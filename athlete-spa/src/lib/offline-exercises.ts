import { apiFetchRemote, setLocalReadInterceptor, toAbsoluteMediaUrl } from '@/lib/api-client';
import { invalidateMatching } from '@/lib/cache-invalidation';
import { clearOfflineMedia, setOfflineMedia } from '@/lib/offline-media';
import { SETUP_GROUPS } from '@/components/shared/exercises/setup';
import type { Exercise } from '@/lib/types';

/**
 * Offline exercise library ("Pobierz dane" in the profile settings).
 *
 * Downloads every exercise the athlete can see plus its media into IndexedDB.
 * Once a pack exists, every GET to `/api/db/exercises…` made through
 * `apiFetch` is answered locally — the Mongo-style filters the screens build
 * (`buildExerciseFilter`, `visibleExercisesScope`, `useDoc`) are evaluated in
 * memory, so search and filters need no server at all. Media URLs resolve to
 * blob: URLs via `resolveMediaUrl`.
 *
 * Media stays on the device across logouts (it isn't account-specific), so a
 * later download only fetches what's missing; the exercise documents — which
 * include private and trainer exercises — are dropped on logout.
 */

const DB_NAME = 'athlete-spa-offline';
const DB_VERSION = 1;
const KV_STORE = 'kv';
const MEDIA_STORE = 'media';
const EXERCISES_KEY = 'exercises';
const META_KEY = 'exercises-meta';

const DOWNLOAD_CONCURRENCY = 6;
const PROGRESS_THROTTLE_MS = 150;

export interface OfflinePackMeta {
  downloadedAt: string;
  exerciseCount: number;
  mediaCount: number;
  failedMedia: number;
  withAnimations: boolean;
}

export interface OfflineDownloadProgress {
  phase: 'exercises' | 'media' | 'saving';
  done: number;
  total: number;
  bytes: number;
  failed: number;
}

export interface OfflineExercisesState {
  /** The stored pack has been read (or found missing). */
  ready: boolean;
  meta: OfflinePackMeta | null;
  /** Bytes of media held on the device. */
  mediaBytes: number;
  progress: OfflineDownloadProgress | null;
  error: string | null;
}

// --- IndexedDB ---------------------------------------------------------------

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  dbPromise ??= new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(KV_STORE)) db.createObjectStore(KV_STORE);
      if (!db.objectStoreNames.contains(MEDIA_STORE)) db.createObjectStore(MEDIA_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  dbPromise.catch(() => {
    dbPromise = null;
  });
  return dbPromise;
}

function promisify<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore<T>(
  name: string,
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  const db = await openDb();
  return promisify(run(db.transaction(name, mode).objectStore(name)));
}

async function readAllMedia(): Promise<[string, Blob][]> {
  const db = await openDb();
  const store = db.transaction(MEDIA_STORE, 'readonly').objectStore(MEDIA_STORE);
  const [keys, blobs] = await Promise.all([promisify(store.getAllKeys()), promisify(store.getAll())]);
  return keys.map((key, i) => [String(key), blobs[i] as Blob]);
}

// --- State -------------------------------------------------------------------

let state: OfflineExercisesState = { ready: false, meta: null, mediaBytes: 0, progress: null, error: null };
const listeners = new Set<() => void>();

function setState(patch: Partial<OfflineExercisesState>) {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
}

export function subscribeOfflineExercises(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getOfflineExercisesState(): OfflineExercisesState {
  return state;
}

/** The pack in memory; `null` = no pack, queries go to the server. */
let exercises: Exercise[] | null = null;
let byId = new Map<string, Exercise>();

async function loadPack(): Promise<void> {
  try {
    const [meta, docs, media] = await Promise.all([
      withStore<OfflinePackMeta | undefined>(KV_STORE, 'readonly', (s) => s.get(META_KEY)),
      withStore<Exercise[] | undefined>(KV_STORE, 'readonly', (s) => s.get(EXERCISES_KEY)),
      readAllMedia(),
    ]);
    exercises = meta && docs ? docs : null;
    byId = new Map((exercises ?? []).map((ex) => [docId(ex), ex]));
    setOfflineMedia(media);
    setState({
      ready: true,
      meta: exercises ? (meta ?? null) : null,
      mediaBytes: media.reduce((sum, [, blob]) => sum + blob.size, 0),
    });
  } catch {
    // IndexedDB unavailable (private mode, storage blocked): online-only.
    exercises = null;
    setState({ ready: true, meta: null });
  }
}

let loaded = loadPack();

// --- Local query evaluation --------------------------------------------------

type Filter = Record<string, unknown>;

class UnsupportedQuery extends Error {}

const docId = (doc: Exercise) => String(doc.id ?? (doc as unknown as { _id?: string })._id ?? '');

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Values at a dotted path, descending into arrays the way Mongo does. */
function valuesAt(node: unknown, path: string[], flattenLeaf = true): unknown[] {
  if (path.length === 0) {
    return flattenLeaf && Array.isArray(node) ? node : [node];
  }
  if (Array.isArray(node)) return node.flatMap((item) => valuesAt(item, path, flattenLeaf));
  if (!isPlainObject(node)) return [];
  const [head, ...rest] = path;
  if (!(head in node) || node[head] === undefined) return [];
  return valuesAt(node[head], rest, flattenLeaf);
}

const looseEquals = (a: unknown, b: unknown) =>
  a === b || (a != null && b != null && typeof a !== 'object' && String(a) === String(b));

const regexCache = new Map<string, RegExp>();
function toRegExp(pattern: unknown, options: unknown): RegExp {
  const key = `${String(pattern)}/${String(options ?? '')}`;
  let rx = regexCache.get(key);
  if (!rx) {
    rx = new RegExp(String(pattern), String(options ?? ''));
    regexCache.set(key, rx);
  }
  return rx;
}

function matchCondition(doc: Record<string, unknown>, field: string, cond: unknown): boolean {
  const path = field.split('.');
  const values = field === '_id' ? [docId(doc as unknown as Exercise)] : valuesAt(doc, path);

  if (!isPlainObject(cond) || !Object.keys(cond).some((k) => k.startsWith('$'))) {
    if (cond === null) return values.length === 0 || values.includes(null);
    if (isPlainObject(cond)) throw new UnsupportedQuery('object equality');
    return values.some((v) => looseEquals(v, cond));
  }

  return Object.entries(cond).every(([op, arg]) => {
    switch (op) {
      case '$eq':
        return values.some((v) => looseEquals(v, arg));
      case '$ne':
        return arg === null ? values.some((v) => v != null) : !values.some((v) => looseEquals(v, arg));
      case '$in':
        return Array.isArray(arg) && values.some((v) => arg.some((a) => looseEquals(v, a)));
      case '$nin':
        return Array.isArray(arg) && !values.some((v) => arg.some((a) => looseEquals(v, a)));
      case '$exists':
        return arg ? values.length > 0 : values.length === 0;
      case '$regex': {
        const rx = toRegExp(arg, cond.$options);
        return values.some((v) => typeof v === 'string' && rx.test(v));
      }
      case '$options':
        return true;
      case '$elemMatch': {
        if (!isPlainObject(arg)) throw new UnsupportedQuery('$elemMatch');
        const arrays = valuesAt(doc, path, false).filter(Array.isArray);
        return arrays.some((items) =>
          items.some((item) =>
            isPlainObject(item) && !Object.keys(arg).some((k) => k.startsWith('$'))
              ? matchFilter(item, arg)
              : matchCondition({ v: item }, 'v', arg)
          )
        );
      }
      default:
        throw new UnsupportedQuery(op);
    }
  });
}

function matchFilter(doc: Record<string, unknown>, filter: Filter): boolean {
  return Object.entries(filter).every(([key, cond]) => {
    switch (key) {
      case '$and':
        return (cond as Filter[]).every((f) => matchFilter(doc, f));
      case '$or':
        return (cond as Filter[]).some((f) => matchFilter(doc, f));
      case '$nor':
        return !(cond as Filter[]).some((f) => matchFilter(doc, f));
      default:
        if (key.startsWith('$')) throw new UnsupportedQuery(key);
        return matchCondition(doc, key, cond);
    }
  });
}

const collator = new Intl.Collator('pl', { numeric: true });

function compareValues(a: unknown, b: unknown): number {
  if (a === b) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return collator.compare(String(a), String(b));
}

function sortDocs(docs: Exercise[], sort: Record<string, number>): Exercise[] {
  const keys = Object.entries(sort);
  const first = (doc: Exercise, field: string) =>
    field === '_id' ? docId(doc) : valuesAt(doc, field.split('.'))[0];
  return [...docs].sort((a, b) => {
    for (const [field, dir] of keys) {
      const diff = compareValues(first(a, field), first(b, field));
      if (diff !== 0) return dir < 0 ? -diff : diff;
    }
    return 0;
  });
}

const EXERCISES_PATH = /^\/api\/db\/exercises(?:\/([^/?]+))?$/;

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

/** Answers an exercises GET from the pack; `undefined` = let the server handle it. */
function answerLocally(path: string): Response | undefined {
  if (!exercises) return undefined;
  const url = new URL(path, 'http://local');
  const match = EXERCISES_PATH.exec(url.pathname);
  if (!match) return undefined;

  const id = match[1];
  if (id) {
    const doc = byId.get(decodeURIComponent(id));
    // Unknown id (e.g. created on another device since the download): ask the server.
    return doc ? jsonResponse({ data: doc }) : undefined;
  }

  try {
    const params = url.searchParams;
    const query = params.get('query');
    const filter = query ? (JSON.parse(query) as Filter) : {};
    let result = Object.keys(filter).length
      ? exercises.filter((doc) => matchFilter(doc as unknown as Record<string, unknown>, filter))
      : exercises;

    if (params.get('count') === '1') return jsonResponse({ total: result.length });

    const sort = params.get('sort');
    if (sort) result = sortDocs(result, JSON.parse(sort));
    const skip = Number(params.get('skip')) || 0;
    const limit = Number(params.get('limit')) || 0;
    if (skip || limit) result = result.slice(skip, limit ? skip + limit : undefined);
    return jsonResponse({ data: result });
  } catch {
    // A filter shape this evaluator doesn't know — the server stays the source of truth.
    return undefined;
  }
}

async function savePack(docs: Exercise[], meta: OfflinePackMeta) {
  const db = await openDb();
  const tx = db.transaction(KV_STORE, 'readwrite');
  tx.objectStore(KV_STORE).put(docs, EXERCISES_KEY);
  tx.objectStore(KV_STORE).put(meta, META_KEY);
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

/** Keeps the pack in step with the athlete's own create/edit/delete of exercises. */
async function applyWrite(path: string, method: string, response: Response): Promise<void> {
  await loaded;
  if (!exercises || !state.meta) return;
  const match = EXERCISES_PATH.exec(path.split('?')[0]);
  if (!match) return;

  let next = exercises;
  if (method === 'DELETE' && match[1]) {
    next = exercises.filter((ex) => docId(ex) !== match[1]);
  } else if (method === 'POST' || method === 'PATCH' || method === 'PUT') {
    const payload = (await response.json().catch(() => null)) as { data?: Exercise } | null;
    const doc = payload?.data;
    if (!doc) return;
    const id = docId(doc);
    next = byId.has(id) ? exercises.map((ex) => (docId(ex) === id ? doc : ex)) : [...exercises, doc];
  } else {
    return;
  }

  exercises = next;
  byId = new Map(next.map((ex) => [docId(ex), ex]));
  const meta = { ...state.meta, exerciseCount: next.length };
  setState({ meta });
  await savePack(next, meta).catch(() => undefined);
}

setLocalReadInterceptor({
  async read(path) {
    if (!path.startsWith('/api/db/exercises')) return undefined;
    await loaded;
    return answerLocally(path);
  },
  afterWrite: applyWrite,
});

// --- Download ----------------------------------------------------------------

/** Remote media URLs an exercise shows: thumbnail, muscle images and (optionally) the animation clip. */
function mediaUrlsOf(exercise: Exercise, withAnimations: boolean): string[] {
  const urls = [exercise.mediaUrl, exercise.image];
  for (const group of [...(exercise.mainMuscleGroups ?? []), ...(exercise.secondaryMuscleGroups ?? [])]) {
    urls.push(group?.imageUrl);
  }
  if (withAnimations) {
    urls.push(exercise.setup?.find((s) => s.group === SETUP_GROUPS.animation)?.value);
  }
  return urls
    .filter((url): url is string => Boolean(url))
    .map(toAbsoluteMediaUrl)
    // YouTube pages can't be stored; data:/blob: are already local.
    .filter((url) => /^https?:/.test(url) && !/youtube\.com|youtu\.be/.test(url));
}

let controller: AbortController | null = null;

export async function downloadOfflineExercises({ withAnimations }: { withAnimations: boolean }): Promise<void> {
  if (controller) return;
  controller = new AbortController();
  const { signal } = controller;
  const progress: OfflineDownloadProgress = { phase: 'exercises', done: 0, total: 0, bytes: 0, failed: 0 };
  setState({ progress: { ...progress }, error: null });

  try {
    // Ask the browser not to evict the pack under storage pressure.
    void navigator.storage?.persist?.().catch(() => undefined);

    const sort = encodeURIComponent(JSON.stringify({ name: 1, _id: 1 }));
    const res = await apiFetchRemote(`/api/db/exercises?sort=${sort}`, { signal });
    if (!res.ok) throw new Error(`Serwer odpowiedział ${res.status}`);
    const docs = ((await res.json()) as { data?: Exercise[] }).data ?? [];

    const wanted = new Set(docs.flatMap((ex) => mediaUrlsOf(ex, withAnimations)));
    const stored = new Set(
      (await withStore(MEDIA_STORE, 'readonly', (s) => s.getAllKeys())).map(String)
    );
    const queue = [...wanted].filter((url) => !stored.has(url));

    Object.assign(progress, { phase: 'media', total: queue.length });
    let lastEmit = 0;
    const emit = (force = false) => {
      const now = Date.now();
      if (!force && now - lastEmit < PROGRESS_THROTTLE_MS) return;
      lastEmit = now;
      setState({ progress: { ...progress } });
    };
    emit(true);

    let cursor = 0;
    const worker = async () => {
      while (cursor < queue.length) {
        signal.throwIfAborted();
        const url = queue[cursor++];
        try {
          const media = await fetch(url, { signal });
          if (!media.ok) throw new Error(String(media.status));
          const blob = await media.blob();
          await withStore(MEDIA_STORE, 'readwrite', (s) => s.put(blob, url));
          progress.bytes += blob.size;
        } catch (err) {
          if (signal.aborted) throw err;
          progress.failed += 1;
        }
        progress.done += 1;
        emit();
      }
    };
    await Promise.all(Array.from({ length: DOWNLOAD_CONCURRENCY }, worker));

    signal.throwIfAborted();
    progress.phase = 'saving';
    emit(true);

    // Media no longer referenced (deleted exercises, animations switched off).
    const stale = [...stored].filter((url) => !wanted.has(url));
    if (stale.length) {
      const db = await openDb();
      const tx = db.transaction(MEDIA_STORE, 'readwrite');
      for (const url of stale) tx.objectStore(MEDIA_STORE).delete(url);
      await new Promise<void>((resolve) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      });
    }

    await savePack(docs, {
      downloadedAt: new Date().toISOString(),
      exerciseCount: docs.length,
      mediaCount: wanted.size - progress.failed,
      failedMedia: progress.failed,
      withAnimations,
    });
    loaded = loadPack();
    await loaded;
    invalidateMatching((key) => key.startsWith('/api/db/exercises'));
    setState({ progress: null });
  } catch (err) {
    setState({
      progress: null,
      error: signal.aborted
        ? null
        : err instanceof TypeError
          ? 'Brak połączenia z serwerem.'
          : err instanceof Error
            ? err.message
            : 'Nie udało się pobrać danych.',
    });
  } finally {
    controller = null;
  }
}

/** Stops a running download; media fetched so far is kept and skipped next time. */
export function cancelOfflineDownload(): void {
  controller?.abort();
}

/** Removes the whole pack, media included ("Usuń dane offline"). */
export async function deleteOfflineExercises(): Promise<void> {
  cancelOfflineDownload();
  try {
    const db = await openDb();
    const tx = db.transaction([KV_STORE, MEDIA_STORE], 'readwrite');
    tx.objectStore(KV_STORE).clear();
    tx.objectStore(MEDIA_STORE).clear();
    await new Promise<void>((resolve) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // Nothing stored.
  }
  exercises = null;
  byId = new Map();
  clearOfflineMedia();
  setState({ meta: null, mediaBytes: 0, error: null });
  invalidateMatching((key) => key.startsWith('/api/db/exercises'));
}

/**
 * Logout: the exercise documents belong to this account (private and trainer
 * exercises), the media doesn't — keep it so the next download is quick.
 */
export function clearOfflineExerciseData(): void {
  cancelOfflineDownload();
  exercises = null;
  byId = new Map();
  setState({ meta: null, error: null });
  void openDb()
    .then((db) => {
      const tx = db.transaction(KV_STORE, 'readwrite');
      tx.objectStore(KV_STORE).clear();
    })
    .catch(() => undefined);
}
