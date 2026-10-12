import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';

/** Horizontal, snap-scrolling row of cards with arrow controls. The scroller is focusable so
 *  keyboard users can pan it with the arrow keys; the buttons are a pointer convenience. */
export function CardRail({ label, children }: { label: string; children: ReactNode }) {
  const scroller = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ start: true, end: false });

  const measure = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    setEdge({ start: el.scrollLeft < 8, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 8 });
  }, []);

  useEffect(() => {
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure]);

  const go = (dir: 1 | -1) => {
    const el = scroller.current;
    if (!el) return;
    const card = el.firstElementChild as HTMLElement | null;
    const step = (card?.offsetWidth ?? 320) + 16;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollBy({ left: dir * step, behavior: reduce ? 'auto' : 'smooth' });
  };

  const arrow =
    'grid size-11 place-items-center rounded-full border border-rule-strong text-ink transition-colors hover:border-ink-2 hover:bg-paper-3 disabled:pointer-events-none disabled:opacity-35';

  return (
    <div>
      <div className="shell hidden justify-end gap-2 pb-5 sm:flex">
        <button type="button" onClick={() => go(-1)} disabled={edge.start} aria-label="Poprzednie karty" className={arrow}>
          <ArrowLeft className="size-4" aria-hidden />
        </button>
        <button type="button" onClick={() => go(1)} disabled={edge.end} aria-label="Następne karty" className={arrow}>
          <ArrowRight className="size-4" aria-hidden />
        </button>
      </div>
      <div
        ref={scroller}
        onScroll={measure}
        role="region"
        aria-label={label}
        tabIndex={0}
        className="rail pb-2 focus-visible:outline-offset-[-3px]"
      >
        {children}
      </div>
    </div>
  );
}

type Tone = 'sheet' | 'accent' | 'dark';

const tones: Record<Tone, string> = {
  sheet: 'sheet',
  accent: 'bg-accent-wash text-ink rounded-[var(--radius-card)]',
  dark: 'bg-paper-3 text-ink rounded-[var(--radius-card)]',
};

/** One card in a rail: small category, short title, a visual, one sentence of explanation. */
export function RailCard({
  label,
  title,
  children,
  body,
  tone = 'sheet',
  wide = false,
}: {
  label: string;
  title: string;
  children?: ReactNode;
  body: ReactNode;
  tone?: Tone;
  wide?: boolean;
}) {
  const quiet = tone === 'sheet' ? 'text-sheet-ink-2' : tone === 'accent' ? 'text-accent-ink' : 'text-ink-2';

  return (
    <article
      className={`flex min-h-[31rem] flex-col p-6 sm:p-7 ${tones[tone]} ${
        wide ? 'w-[min(90vw,36rem)]' : 'w-[min(84vw,22.5rem)]'
      }`}
    >
      <p className={`label ${quiet}`}>{label}</p>
      <h3 className="mt-2 font-display text-[1.625rem] font-semibold leading-[1.08] tracking-[-0.03em]">{title}</h3>
      {children && <div className="my-6 flex flex-1 flex-col justify-center">{children}</div>}
      <div className={`${children ? '' : 'mt-auto pt-6'} text-[0.9375rem] leading-relaxed ${quiet}`}>{body}</div>
    </article>
  );
}
