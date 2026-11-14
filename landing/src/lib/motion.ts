import { useEffect, useRef, useState } from 'react';

export const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** True once the element has entered the viewport (and stays true). */
export function useInView<T extends Element>(threshold = 0.2) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!('IntersectionObserver' in window)) {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setInView(true);
        io.disconnect();
      },
      { threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);

  return [ref, inView] as const;
}

/**
 * How far the element has been read, as a whole number 0 → `steps`: starts when its top reaches 80 % of the viewport
 * height and completes when its bottom reaches 60 %. Listens to scroll only while the element
 * is near the viewport; returns `steps` straight away under reduced motion.
 */
export function useReadProgress<T extends HTMLElement>(steps: number) {
  const ref = useRef<T | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reducedMotion() || !('IntersectionObserver' in window)) {
      setProgress(steps);
      return;
    }

    const measure = () => {
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const p = (vh * 0.8 - rect.top) / (rect.height + vh * 0.2);
      setProgress(Math.round(Math.min(1, Math.max(0, p)) * steps));
    };
    // the value is a whole step, so React drops the update on most scroll events
    const onScroll = measure;

    let listening = false;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !listening) {
          window.addEventListener('scroll', onScroll, { passive: true });
          window.addEventListener('resize', onScroll);
          listening = true;
          measure();
        } else if (!entry.isIntersecting && listening) {
          window.removeEventListener('scroll', onScroll);
          window.removeEventListener('resize', onScroll);
          listening = false;
          measure();
        }
      },
      { rootMargin: '20% 0px 20% 0px' },
    );
    io.observe(el);

    return () => {
      io.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [steps]);

  return [ref, progress] as const;
}

/** True while the element is on screen — pauses demo loops that nobody is watching. */
export function useOnScreen<T extends Element>(rootMargin = '0px') {
  const ref = useRef<T | null>(null);
  const [on, setOn] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(([entry]) => setOn(entry.isIntersecting), { rootMargin, threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, [rootMargin]);

  return [ref, on] as const;
}

/**
 * A step counter that advances while `active`: 0 → steps-1 → 0 …, each step lasting `ms`
 * (or its own entry when `ms` is a list). Under reduced motion it rests on `still`.
 */
export function useLoop(steps: number, ms: number | number[], active: boolean, still = steps - 1) {
  const [step, setStep] = useState(0);
  const reduced = reducedMotion();

  useEffect(() => {
    if (!active || reduced) return;
    const wait = Array.isArray(ms) ? ms[step] ?? ms[ms.length - 1] : ms;
    const id = window.setTimeout(() => setStep((s) => (s + 1) % steps), wait);
    return () => window.clearTimeout(id);
  }, [active, reduced, step, steps, ms]);

  return reduced ? still : step;
}

/* One scroll listener for every scrubbed element on the page. */
const scrubbed = new Set<HTMLElement>();
let scrubRaf = 0;

function scrub() {
  scrubRaf = 0;
  const vh = window.innerHeight;
  for (const el of scrubbed) {
    const r = el.getBoundingClientRect();
    if (r.bottom < -vh * 0.5 || r.top > vh * 1.5) continue;
    // 0 when the element's top touches the bottom of the viewport, 1 when its bottom leaves the top
    const p = Math.min(1, Math.max(0, (vh - r.top) / (vh + r.height)));
    el.style.setProperty('--p', p.toFixed(4));
  }
}

function requestScrub() {
  if (!scrubRaf) scrubRaf = requestAnimationFrame(scrub);
}

/**
 * Writes the element's progress through the viewport to its `--p` custom property (0 → 1),
 * for CSS to turn into transforms. No React renders. Stays at 0.5 under reduced motion.
 */
export function useScrub<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reducedMotion()) {
      el.style.setProperty('--p', '0.5');
      return;
    }
    if (scrubbed.size === 0) {
      window.addEventListener('scroll', requestScrub, { passive: true });
      window.addEventListener('resize', requestScrub);
    }
    scrubbed.add(el);
    requestScrub();
    return () => {
      scrubbed.delete(el);
      if (scrubbed.size === 0) {
        window.removeEventListener('scroll', requestScrub);
        window.removeEventListener('resize', requestScrub);
      }
    };
  }, []);

  return ref;
}

/** Pointer position over the element as `--mx` / `--my` (−1 → 1), eased; fine pointers only. */
export function usePointerVars<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || reducedMotion() || !window.matchMedia('(pointer: fine)').matches) return;
    let raf = 0;
    let tx = 0;
    let ty = 0;
    let x = 0;
    let y = 0;
    const tick = () => {
      x += (tx - x) * 0.08;
      y += (ty - y) * 0.08;
      el.style.setProperty('--mx', x.toFixed(3));
      el.style.setProperty('--my', y.toFixed(3));
      raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.002 ? requestAnimationFrame(tick) : 0;
    };
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width) * 2 - 1;
      ty = ((e.clientY - r.top) / r.height) * 2 - 1;
      if (!raf) raf = requestAnimationFrame(tick);
    };
    const onLeave = () => {
      tx = 0;
      ty = 0;
      if (!raf) raf = requestAnimationFrame(tick);
    };
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);
    return () => {
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
      cancelAnimationFrame(raf);
    };
  }, []);

  return ref;
}
