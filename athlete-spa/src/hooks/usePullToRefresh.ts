import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { haptic } from '@/lib/haptics';

/** Pull past this (in px) to arm the refresh. */
const TRIGGER_DISTANCE = 72;
/** Cap on how far the indicator travels, so the pull feels resisted. */
const MAX_DISTANCE = 110;
/** Ignore pulls that are mostly horizontal — those are carousel swipes. */
const HORIZONTAL_TOLERANCE = 1.2;

interface PullToRefresh {
  /** Attach to the indicator element; the hook drives it imperatively. */
  indicatorRef: RefObject<HTMLDivElement | null>;
  isRefreshing: boolean;
}

/**
 * Pull-to-refresh for a scroll container.
 *
 * Data is fetched through SWR's stale-while-revalidate, so a screen left open
 * for a while shows stale numbers with no way to ask for fresh ones — on a
 * phone the pull gesture is where users reach for that first.
 *
 * The indicator is positioned by writing to its style directly rather than
 * through state: a `setState` per touchmove would re-render the whole outlet
 * subtree sixty times a second while the finger is down.
 *
 * Damping: travel grows with the square root of the drag, so the sheet resists
 * further the harder it is pulled, matching the platform feel.
 */
export function usePullToRefresh(
  scrollRef: RefObject<HTMLElement | null>,
  onRefresh: () => Promise<unknown> | void,
  enabled = true
): PullToRefresh {
  const indicatorRef = useRef<HTMLDivElement | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const startRef = useRef<{ x: number; y: number } | null>(null);
  const trackingRef = useRef(false);
  const distanceRef = useRef(0);
  const armedRef = useRef(false);
  const refreshingRef = useRef(false);
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  const paint = useCallback((distance: number, spinning: boolean) => {
    const node = indicatorRef.current;
    if (!node) return;
    distanceRef.current = distance;
    node.style.transform = `translateY(${distance}px)`;
    node.style.opacity = String(Math.min(1, distance / TRIGGER_DISTANCE));
    // Settling back to rest should glide; following the finger must not.
    node.style.transition = distance === 0 || spinning ? 'transform 200ms ease-out, opacity 200ms ease-out' : 'none';
    node.dataset.armed = String(distance >= TRIGGER_DISTANCE);
    node.dataset.spinning = String(spinning);
  }, []);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element || !enabled) return;

    const handleTouchStart = (event: TouchEvent) => {
      // Only a pull that begins at the very top can mean "refresh"; anywhere
      // else it is an ordinary scroll.
      if (element.scrollTop > 0 || event.touches.length !== 1 || refreshingRef.current) {
        startRef.current = null;
        return;
      }
      const touch = event.touches[0];
      startRef.current = { x: touch.clientX, y: touch.clientY };
      trackingRef.current = false;
      armedRef.current = false;
    };

    const handleTouchMove = (event: TouchEvent) => {
      const start = startRef.current;
      if (!start || refreshingRef.current) return;

      const touch = event.touches[0];
      const deltaY = touch.clientY - start.y;
      const deltaX = Math.abs(touch.clientX - start.x);

      if (deltaY <= 0 || deltaX > Math.abs(deltaY) * HORIZONTAL_TOLERANCE) {
        if (!trackingRef.current) startRef.current = null;
        return;
      }

      trackingRef.current = true;
      // Suppress the native overscroll glow while we own the gesture.
      if (event.cancelable) event.preventDefault();

      const damped = Math.min(MAX_DISTANCE, Math.sqrt(deltaY) * 7);
      paint(damped, false);

      // Confirm the threshold by touch, so the athlete can release without
      // watching the screen.
      const armed = damped >= TRIGGER_DISTANCE;
      if (armed !== armedRef.current) {
        armedRef.current = armed;
        if (armed) haptic('tap');
      }
    };

    const handleTouchEnd = () => {
      const wasTracking = trackingRef.current;
      const pulled = distanceRef.current;
      startRef.current = null;
      trackingRef.current = false;
      armedRef.current = false;

      if (!wasTracking || pulled < TRIGGER_DISTANCE || refreshingRef.current) {
        paint(0, false);
        return;
      }

      refreshingRef.current = true;
      setIsRefreshing(true);
      paint(TRIGGER_DISTANCE, true);

      void Promise.resolve(onRefreshRef.current()).finally(() => {
        refreshingRef.current = false;
        setIsRefreshing(false);
        paint(0, false);
      });
    };

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd);
    element.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [scrollRef, enabled, paint]);

  return { indicatorRef, isRefreshing };
}
