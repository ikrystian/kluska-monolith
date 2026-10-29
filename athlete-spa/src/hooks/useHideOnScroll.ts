import { useEffect, useState, type RefObject } from 'react';

/** Distance scrolled in one direction before the chrome reacts, so jitter doesn't flicker it. */
const THRESHOLD = 12;
/** Always visible this close to the top of the page. */
const TOP_ZONE = 24;
/**
 * Hiding the header resizes the scroll container, which can clamp scrollTop
 * near the bottom and look like an upward scroll. Ignore scrolls right after a toggle.
 */
const SETTLE_MS = 350;

/**
 * Facebook-style chrome: `true` while the user scrolls down (hide the header and
 * bottom nav), back to `false` as soon as they scroll up or reach the top.
 *
 * `root` is the element wrapping the screen. Scroll events don't bubble, so they
 * are caught in the capture phase — that covers the main outlet as well as pages
 * that scroll in their own inner container. It is state, not a ref, so the
 * listener attaches once the element actually mounts (the layout renders a
 * loading screen first).
 */
export function useHideOnScroll(root: HTMLElement | null, resetKey: string, enabled = true) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    setHidden(false);
  }, [resetKey, enabled]);

  useEffect(() => {
    if (!root || !enabled) return;

    const lastTops = new WeakMap<Element, number>();
    let travelled = 0;
    let settledAt = 0;
    let current = false;

    const set = (next: boolean) => {
      if (next === current) return;
      current = next;
      settledAt = performance.now() + SETTLE_MS;
      travelled = 0;
      setHidden(next);
    };

    const onScroll = (event: Event) => {
      const el = event.target;
      if (!(el instanceof Element)) return;

      const top = el.scrollTop;
      const delta = top - (lastTops.get(el) ?? top);
      lastTops.set(el, top);

      // Horizontal scrollers (carousels, chip rows) fire scroll too, but don't move vertically.
      if (delta === 0) return;
      if (performance.now() < settledAt) return;
      if (top <= TOP_ZONE) return set(false);
      // Rubber-banding past either edge reports bogus deltas.
      if (top < 0 || top > el.scrollHeight - el.clientHeight) return;

      // Reset the running total when the direction flips.
      travelled = Math.sign(delta) === Math.sign(travelled) ? travelled + delta : delta;
      if (travelled >= THRESHOLD) set(true);
      else if (travelled <= -THRESHOLD) set(false);
    };

    root.addEventListener('scroll', onScroll, { capture: true, passive: true });
    return () => root.removeEventListener('scroll', onScroll, { capture: true });
  }, [root, enabled, resetKey]);

  return hidden;
}
