import { useEffect, type CSSProperties } from 'react';

/**
 * Scroll reveal. Elements marked with `data-reveal` start hidden (only once
 * this hook has armed the page with `.reveal-on`, so no-JS and reduced-motion
 * users always see content) and get `.is-visible` the first time they enter
 * the viewport.
 */
export function useScrollReveal() {
  useEffect(() => {
    const root = document.documentElement;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;

    root.classList.add('reveal-on');

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.classList.add('is-visible');
          io.unobserve(e.target);
        }
      },
      { rootMargin: '0px 0px -6% 0px', threshold: 0.05 }
    );

    const observe = (scope: ParentNode) =>
      scope.querySelectorAll<HTMLElement>('[data-reveal]:not(.is-visible)').forEach((el) => io.observe(el));
    observe(document);

    // pick up elements mounted later (e.g. switched tab panels)
    const mo = new MutationObserver(() => observe(document));
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
      root.classList.remove('reveal-on');
    };
  }, []);
}

/** Spread on an element to reveal it; `i` staggers siblings by 80 ms each. */
export function reveal(i = 0, kind: 'up' | 'image' | 'fade' = 'up') {
  return { 'data-reveal': kind, style: { '--i': i } as CSSProperties };
}
