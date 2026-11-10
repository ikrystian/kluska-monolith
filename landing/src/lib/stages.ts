import { useEffect, useState } from 'react';

/* The page's four stages. Each one is a plate in its domain colour — the same pairing the app's
   design system uses (trening ember, bieg niebieski, jedzenie żółty, nawyki zielony). */
export const STAGES = [
  { id: 'trening', kg: 25, label: 'Trening', hint: 'dziennik serii, progresja, stoper', tone: 'var(--color-accent)' },
  { id: 'bieganie', kg: 20, label: 'Bieganie', hint: 'GPS, tempo, Strava', tone: 'var(--color-run)' },
  { id: 'dieta', kg: 15, label: 'Jedzenie', hint: 'makro, skaner kodów', tone: 'var(--color-food)' },
  { id: 'nawyki', kg: 10, label: 'Nawyki', hint: 'cele dnia, seria, odznaki', tone: 'var(--color-volt)' },
] as const;

export type StageId = (typeof STAGES)[number]['id'];

export const BAR_KG = 20;

/** Weight on the bar once the first `n` stages are loaded (plates go on both sides). */
export const totalAfter = (n: number) => BAR_KG + 2 * STAGES.slice(0, n).reduce((sum, s) => sum + s.kg, 0);

export const FULL_KG = totalAfter(STAGES.length);

/** How many stage sections the reader has scrolled into — drives the nav's running total. */
export function useStagesPassed() {
  const [passed, setPassed] = useState(0);

  useEffect(() => {
    // Four rect reads per scroll event; React drops the update when the count is unchanged.
    const measure = () => {
      const line = window.innerHeight * 0.6;
      let count = 0;
      for (const s of STAGES) {
        const el = document.getElementById(s.id);
        if (el && el.getBoundingClientRect().top < line) count += 1;
      }
      setPassed(count);
    };
    measure();
    window.addEventListener('scroll', measure, { passive: true });
    window.addEventListener('resize', measure);
    return () => {
      window.removeEventListener('scroll', measure);
      window.removeEventListener('resize', measure);
    };
  }, []);

  return passed;
}

/** Eases a displayed number towards its target, so the kg readout rolls instead of jumping. */
export function useCountUp(target: number) {
  const [value, setValue] = useState(target);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setValue(target);
      return;
    }
    let raf = 0;
    let from: number | null = null;
    const t0 = performance.now();
    const tick = (t: number) => {
      setValue((current) => {
        if (from === null) from = current;
        const k = Math.min(1, (t - t0) / 520);
        const eased = 1 - Math.pow(1 - k, 3);
        return Math.round(from + (target - from) * eased);
      });
      if (t - t0 < 520) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);

  return value;
}
