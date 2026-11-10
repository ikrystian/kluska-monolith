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
