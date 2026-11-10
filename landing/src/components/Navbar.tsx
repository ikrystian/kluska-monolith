import type { CSSProperties } from 'react';
import { useEffect, useState } from 'react';
import { ArrowRight, Menu, X } from 'lucide-react';
import { STAGES, totalAfter, useCountUp, useStagesPassed } from '../lib/stages';
import { Wordmark } from './Wordmark';

const navLinks = [
  ...STAGES.map((s, i) => ({ name: s.label, href: `#${s.id}`, tone: s.tone as string | undefined, stage: i })),
  { name: 'Dla trenerów', href: '#trenerzy', tone: undefined, stage: -1 },
  { name: 'Cennik', href: '#cennik', tone: undefined, stage: -1 },
];

/* A plain row over the hero; once the page moves it settles into a floating bar
   that keeps the running total — the plates fill in as the stages go by. */
export function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const passed = useStagesPassed();
  const kg = useCountUp(totalAfter(passed));

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const solid = scrolled || open;

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div className="shell">
        <div className="relative isolate">
          <span
            aria-hidden
            className={`absolute -inset-x-2 bottom-0 top-2 -z-10 rounded-[18px] border border-rule bg-paper-2/85 shadow-pop backdrop-blur-xl transition-opacity duration-300 sm:-inset-x-3 ${
              solid ? 'opacity-100' : 'opacity-0'
            }`}
          />

          <div className="flex h-[var(--header-h)] items-center justify-between gap-4 pt-2">
            <a href="#" aria-label="Leniwa Kluska — strona główna" className="shrink-0">
              <Wordmark collapse />
            </a>

            <nav aria-label="Sekcje" className="hidden items-center lg:flex">
              {navLinks.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  className="flex items-center gap-2 whitespace-nowrap rounded-[10px] px-2.5 py-2 text-sm font-semibold text-ink-2 transition-colors hover:bg-paper-3 hover:text-ink xl:px-3"
                >
                  {l.tone && (
                    <span
                      aria-hidden
                      className={`plate h-3.5 w-[5px] transition-opacity duration-300 ${l.stage < passed ? 'opacity-100' : 'opacity-35'}`}
                      style={{ '--tone': l.tone } as CSSProperties}
                    />
                  )}
                  {l.name}
                </a>
              ))}
            </nav>

            <div className="flex shrink-0 items-center gap-1.5">
              <p
                aria-hidden
                className={`mr-2 hidden items-baseline gap-1 transition-opacity duration-300 xl:flex ${scrolled ? 'opacity-100' : 'opacity-0'}`}
              >
                <span className="big text-2xl">{kg}</span>
                <span className="text-xs font-semibold text-ink-2">kg</span>
              </p>
              <a
                href="/athlete/login"
                className="hidden whitespace-nowrap rounded-[10px] px-3 py-2 text-sm font-semibold text-ink-2 transition-colors hover:text-ink lg:block"
              >
                Zaloguj się
              </a>
              <a href="/athlete/dashboard" className="btn btn-primary btn-sm hidden min-[420px]:inline-flex">
                Zacznij za darmo
              </a>
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                aria-controls="mobile-menu"
                aria-label={open ? 'Zamknij menu' : 'Otwórz menu'}
                className="grid size-11 place-items-center rounded-[12px] text-ink transition-colors hover:bg-paper-3 lg:hidden"
              >
                {open ? <X className="size-5" /> : <Menu className="size-5" />}
              </button>
            </div>
          </div>

          {open && (
            <nav id="mobile-menu" aria-label="Sekcje" className="pb-3 pt-1 lg:hidden">
              {navLinks.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-[var(--radius-ui)] px-1 py-2.5 font-display text-3xl font-bold uppercase leading-none"
                >
                  <span
                    aria-hidden
                    className="plate h-6 w-2"
                    style={{ '--tone': l.tone ?? 'var(--color-rule-strong)' } as CSSProperties}
                  />
                  <span className="flex-1">{l.name}</span>
                  <ArrowRight className="size-4 text-ink-2" aria-hidden />
                </a>
              ))}
              <div className="mt-3 grid grid-cols-2 gap-2">
                <a href="/athlete/dashboard" className="btn btn-primary">
                  Zacznij za darmo
                </a>
                <a href="/athlete/login" className="btn btn-ghost">
                  Zaloguj się
                </a>
              </div>
            </nav>
          )}
        </div>
      </div>
    </header>
  );
}
