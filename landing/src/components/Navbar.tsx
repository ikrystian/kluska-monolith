import { useEffect, useState } from 'react';
import { ArrowRight, Menu, X } from 'lucide-react';
import { getSeason, plural, useNow } from '../lib/season';
import { Wordmark } from './Wordmark';

const navLinks = [
  { name: 'Trening', href: '#trening' },
  { name: 'Bieganie', href: '#bieganie' },
  { name: 'Jedzenie', href: '#dieta' },
  { name: 'Nawyki', href: '#nawyki' },
  { name: 'Dla trenerów', href: '#trenerzy' },
  { name: 'Cennik', href: '#cennik' },
];

/* A campaign strip that scrolls away with the page, then a plain bar that stays:
   clear over the hero photo, solid graphite once the page moves. */
export function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const season = getSeason(useNow(60_000));

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 48);
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
    <>
      {season.pre && (
        <a href="#rok" className="on-ember group block transition-colors hover:bg-accent-hover">
          <span className="shell flex h-10 items-center justify-center gap-2 whitespace-nowrap text-sm font-semibold">
            <span>
              Do Nowego Roku {season.days} {plural(season.days, 'dzień', 'dni', 'dni')}
              <span className="max-[400px]:hidden"> — policz, ile treningów zrobisz do tego czasu</span>
              <span className="min-[401px]:hidden"> — policz swoją przewagę</span>
            </span>
            <ArrowRight className="size-4 shrink-0 transition-transform duration-200 ease-[var(--ease-out)] group-hover:translate-x-1" aria-hidden />
          </span>
        </a>
      )}

      <header
        className={`sticky top-0 z-50 -mb-[var(--header-h)] border-b transition-[background-color,border-color] duration-300 ${
          solid ? 'border-rule bg-paper' : 'border-transparent'
        }`}
      >
        <div className="shell">
          <div className="flex h-[var(--header-h)] items-center justify-between gap-4">
            <a href="#" aria-label="Leniwa Kluska — strona główna" className="shrink-0">
              <Wordmark collapse />
            </a>

            <nav aria-label="Sekcje" className="hidden items-center gap-1 lg:flex">
              {navLinks.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  className="whitespace-nowrap px-2.5 py-2 text-[0.9375rem] font-semibold text-ink/80 transition-colors hover:text-accent-ink xl:px-3.5"
                >
                  {l.name}
                </a>
              ))}
            </nav>

            <div className="flex shrink-0 items-center gap-2">
              <a
                href="https://app.leniwakluska.pl"
                className="hidden whitespace-nowrap px-3 py-2 text-[0.9375rem] font-semibold text-ink/80 transition-colors hover:text-accent-ink lg:block"
              >
                Zaloguj się
              </a>
              <a href="https://app.leniwakluska.pl" className="btn btn-primary btn-sm hidden min-[420px]:inline-flex">
                Zacznij dziś
              </a>
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                aria-controls="mobile-menu"
                aria-label={open ? 'Zamknij menu' : 'Otwórz menu'}
                className="-mr-2 grid size-11 place-items-center text-ink transition-colors hover:text-accent-ink lg:hidden"
              >
                {open ? <X className="size-6" /> : <Menu className="size-6" />}
              </button>
            </div>
          </div>

          {open && (
            <nav id="mobile-menu" aria-label="Sekcje" className="border-t border-rule pb-5 pt-2 lg:hidden">
              {navLinks.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-between gap-3 border-b border-rule py-3.5 font-display text-[2rem] font-extrabold uppercase leading-none"
                >
                  <span className="whitespace-nowrap">{l.name}</span>
                  <ArrowRight className="size-5 shrink-0 text-ink-2" aria-hidden />
                </a>
              ))}
              <div className="mt-5 grid grid-cols-2 gap-2">
                <a href="https://app.leniwakluska.pl" className="btn btn-primary">
                  Zacznij dziś
                </a>
                <a href="https://app.leniwakluska.pl" className="btn btn-ghost">
                  Zaloguj się
                </a>
              </div>
            </nav>
          )}
        </div>
      </header>
    </>
  );
}
