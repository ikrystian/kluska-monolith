import type { TourDef } from './types';

/**
 * Which tours an account has already been through, and whether it wants them
 * at all. Kept in localStorage per user id (like the dashboard layout), so
 * every account on a shared device, guests included, gets its own first run.
 */
interface StoredTours {
  /** Tour id → version that was shown. */
  seen: Record<string, number>;
  disabled?: boolean;
}

const storageKey = (uid: string) => `athlete-spa:tours:${uid}`;

function read(uid: string): StoredTours {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey(uid)) ?? 'null') as Partial<StoredTours> | null;
    if (parsed && typeof parsed === 'object' && parsed.seen && typeof parsed.seen === 'object') {
      return { seen: parsed.seen, disabled: parsed.disabled === true };
    }
  } catch {
    // Unreadable entry: behave as on a first run.
  }
  return { seen: {} };
}

function write(uid: string, state: StoredTours) {
  try {
    localStorage.setItem(storageKey(uid), JSON.stringify(state));
  } catch {
    // Storage full or blocked: the tour may show again, which beats crashing.
  }
}

export function hasSeenTour(uid: string, tour: TourDef): boolean {
  return (read(uid).seen[tour.id] ?? 0) >= tour.version;
}

export function markTourSeen(uid: string, tour: TourDef) {
  const state = read(uid);
  write(uid, { ...state, seen: { ...state.seen, [tour.id]: tour.version } });
}

export function areToursEnabled(uid: string): boolean {
  return !read(uid).disabled;
}

export function setToursEnabled(uid: string, enabled: boolean) {
  write(uid, { ...read(uid), disabled: !enabled });
}

/** Forgets every seen tour, so each screen introduces itself again on the next visit. */
export function resetTours(uid: string) {
  write(uid, { ...read(uid), seen: {} });
}
