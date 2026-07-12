import { useRef, useSyncExternalStore } from 'react';

/**
 * Tiny global store tracking whether a route transition animation is
 * currently running. AnimatedOutlet drives it; data hooks subscribe so
 * that async data never swaps into the DOM mid-animation (the main cause
 * of janky page transitions — content popping in at different times while
 * the screen is still sliding).
 */

let transitioning = false;
let fallbackTimer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Mark a page transition as started. Auto-clears after `maxMs` in case the
 * animation-complete callback never fires (interrupted animation, etc.) so
 * data can never get stuck frozen.
 */
export function beginPageTransition(maxMs = 1000) {
  if (fallbackTimer) clearTimeout(fallbackTimer);
  fallbackTimer = setTimeout(() => endPageTransition(), maxMs);
  if (!transitioning) {
    transitioning = true;
    emit();
  }
}

export function endPageTransition() {
  if (fallbackTimer) {
    clearTimeout(fallbackTimer);
    fallbackTimer = null;
  }
  if (transitioning) {
    transitioning = false;
    emit();
  }
}

export function usePageTransitioning(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => transitioning,
    () => false
  );
}

/**
 * Returns `live` normally, but while a page transition is animating it keeps
 * returning the last value from before the transition started (or the value
 * from mount, for the screen that is entering). The fresh value is revealed
 * in a single render the moment the animation settles.
 */
export function useFrozenDuringTransition<T>(live: T): T {
  const isTransitioning = usePageTransitioning();
  const frozenRef = useRef(live);
  if (!isTransitioning) {
    frozenRef.current = live;
  }
  return frozenRef.current;
}
