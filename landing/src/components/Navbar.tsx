import { useEffect, useState } from 'react';
import { ArrowRight, Menu, X } from 'lucide-react';
import { Wordmark } from './Wordmark';

const navLinks = [
  { name: 'Jak to działa', href: '#funkcje' },
  { name: 'Trening', href: '#trening' },
  { name: 'Bieganie', href: '#bieganie' },
  { name: 'Dieta', href: '#dieta' },
  { name: 'Dla trenerów', href: '#trenerzy' },
  { name: 'Cennik', href: '#cennik' },
];

/* Centred stack on desktop — wordmark above, links beneath (as on the reference) — and a plain bar on phones. */
export function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
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

  return (
    <header
      className={`sticky top-0 z-50 border-b backdrop-blur-md transition-colors duration-200 ${
        scrolled || open ? 'border-rule bg-paper/85' : 'border-transparent bg-paper/0'
      }`}
    >
      <div className="shell">
        <div className="flex h-[3.75rem] items-center justify-between lg:h-auto lg:flex-col lg:gap-2 lg:pb-3 lg:pt-4">
          <a href="#" aria-label="Leniwa Kluska — strona główna">
            <Wordmark collapse />
          </a>

          <nav aria-label="Sekcje" className="hidden items-center gap-1 lg:flex">
            {navLinks.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="whitespace-nowrap rounded-[var(--radius-pill)] px-3 py-1.5 text-sm font-medium text-ink-2 transition-colors hover:bg-paper-2 hover:text-ink"
              >
                {l.name}
              </a>
            ))}
            <span className="mx-2 h-4 w-px bg-rule-strong" aria-hidden />
            <a
              href="/athlete/login"
              className="whitespace-nowrap rounded-[var(--radius-pill)] px-3 py-1.5 text-sm font-medium text-ink-2 transition-colors hover:text-ink"
            >
              Zaloguj się
            </a>
            <a href="/athlete/dashboard" className="btn btn-primary btn-sm ml-1">
              Zacznij za darmo
            </a>
          </nav>

          <div className="flex items-center gap-1.5 lg:hidden">
            <a href="/athlete/dashboard" className="btn btn-primary btn-sm hidden min-[420px]:inline-flex">
              Zacznij za darmo
            </a>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls="mobile-menu"
              aria-label={open ? 'Zamknij menu' : 'Otwórz menu'}
              className="grid size-11 place-items-center rounded-[var(--radius-pill)] text-ink transition-colors hover:bg-paper-2"
            >
              {open ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>

        {open && (
          <nav id="mobile-menu" aria-label="Sekcje" className="border-t border-rule pb-4 pt-2 lg:hidden">
            {navLinks.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="flex items-center justify-between rounded-[var(--radius-ui)] px-1 py-3.5 font-display text-xl font-semibold tracking-[-0.02em]"
              >
                {l.name}
                <ArrowRight className="size-4 text-ink-2" aria-hidden />
              </a>
            ))}
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
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
    </header>
  );
}
