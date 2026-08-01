import { apiFetch } from '@/lib/api-client';
import { subscribeToNetworkStatus, getNetworkStatusSnapshot } from '@/lib/network-status';

const STORAGE_KEY = 'athlete-spa:offline-queue';
/** Prefix that marks an id the server has never seen. */
const TEMP_ID_PREFIX = 'offline-';

export type QueuedMethod = 'POST' | 'PATCH' | 'DELETE';

export interface QueuedMutation {
  /** Queue entry id, distinct from the document id. */
  id: string;
  method: QueuedMethod;
  collection: string;
  /** Target document. For POST this is the temp id handed back to the caller. */
  docId: string;
  body?: unknown;
  createdAt: number;
}

type Listener = () => void;

const listeners = new Set<Listener>();
let queue: QueuedMutation[] = [];
let flushing = false;

export function isTempId(id: string | undefined | null): boolean {
  return typeof id === 'string' && id.startsWith(TEMP_ID_PREFIX);
}

function createTempId(): string {
  return `${TEMP_ID_PREFIX}${crypto.randomUUID()}`;
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch {
    // Storage full — the in-memory queue still drains this session.
  }
}

function emit() {
  for (const listener of listeners) listener();
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    queue = Array.isArray(parsed) ? parsed : [];
  } catch {
    queue = [];
  }
}

load();

export function subscribeToOfflineQueue(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getPendingCount(): number {
  return queue.length;
}

/** Drops everything pending; used on logout so writes don't replay as the next user. */
export function clearOfflineQueue(): void {
  queue = [];
  persist();
  emit();
}

/**
 * Records a write that could not reach the server.
 *
 * Returns the document id the caller should use straight away — the real one
 * for updates and deletes, a temp id for creates. Temp ids are rewritten to
 * the server's id when the queue drains, so a create followed by edits (the
 * shape of logging a workout: POST the log, then PATCH it after every set)
 * replays as one coherent sequence rather than a create plus orphaned updates.
 */
export function enqueueMutation(input: {
  method: QueuedMethod;
  collection: string;
  docId?: string;
  body?: unknown;
}): string {
  const docId = input.method === 'POST' ? createTempId() : input.docId ?? '';

  queue.push({
    id: crypto.randomUUID(),
    method: input.method,
    collection: input.collection,
    docId,
    body: input.body,
    createdAt: Date.now(),
  });

  persist();
  emit();
  return docId;
}

/** Rewrites every queued reference to `tempId` once the server has assigned a real one. */
function remapTempId(tempId: string, realId: string) {
  for (const entry of queue) {
    if (entry.docId === tempId) entry.docId = realId;
  }
}

async function send(entry: QueuedMutation): Promise<string | undefined> {
  const base = `/api/db/${entry.collection}`;
  const jsonHeaders = { 'Content-Type': 'application/json' };

  if (entry.method === 'POST') {
    const response = await apiFetch(base, {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify(entry.body),
    });
    if (!response.ok) throw new Error(`Replay failed: ${response.status}`);
    const result = await response.json();
    return result?.data?.id ?? result?.data?._id;
  }

  const response = await apiFetch(`${base}/${entry.docId}`, {
    method: entry.method,
    ...(entry.method === 'PATCH'
      ? { headers: jsonHeaders, body: JSON.stringify(entry.body) }
      : {}),
  });
  if (!response.ok) throw new Error(`Replay failed: ${response.status}`);
  return undefined;
}

/**
 * Replays pending writes oldest-first.
 *
 * Order matters — an edit must not overtake the create it depends on — so
 * entries go one at a time and a failure stops the drain, leaving the rest
 * queued for the next attempt.
 */
export async function flushOfflineQueue(): Promise<void> {
  if (flushing || queue.length === 0 || !getNetworkStatusSnapshot()) return;
  flushing = true;

  try {
    while (queue.length > 0 && getNetworkStatusSnapshot()) {
      const entry = queue[0];

      // A create that never made it to the server can't be edited or deleted
      // by id; those entries are only meaningful once the create replays.
      if (entry.method !== 'POST' && isTempId(entry.docId)) {
        queue.shift();
        persist();
        emit();
        continue;
      }

      try {
        const realId = await send(entry);
        if (entry.method === 'POST' && realId) remapTempId(entry.docId, realId);
      } catch (error) {
        // A rejected write (validation, conflict) would block the queue
        // forever, so only a genuine network failure is worth retrying.
        if (getNetworkStatusSnapshot()) {
          console.warn('Dropping unreplayable offline mutation', entry, error);
          queue.shift();
          persist();
          emit();
          continue;
        }
        break;
      }

      queue.shift();
      persist();
      emit();
    }
  } finally {
    flushing = false;
  }
}

// Drain as soon as the app can reach the backend again.
subscribeToNetworkStatus(() => {
  if (getNetworkStatusSnapshot()) void flushOfflineQueue();
});
