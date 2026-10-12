import { useEffect, useState } from 'react';
import { ArrowRight, Menu, X } from 'lucide-react';
import { Wordmark } from './Wordmark';

const navLinks = [
  { name: 'Korzyści', href: '#korzysci' },
  { name: 'Jak to działa', href: '#funkcje' },
  { name: 'Dla trenerów', href: '#trenerzy' },
  { name: 'Cennik', href: '#cennik' },
  { name: 'FAQ', href: '#faq' },
];

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
    <header className="sticky top-0 z-50 px-3 pt-3 sm:px-4">
      <div
        className={`mx-auto max-w-[72rem] rounded-[20px] border bg-card/90 backdrop-blur-md transition-[border-color,box-shadow] duration-200 ${
          scrolled || open
            ? 'border-rule shadow-float'
            : 'border-transparent'
        }`}
      >
        <div className="flex h-14 items-center justify-between gap-4 pl-3 pr-2 sm:pl-4">
          <a href="#" aria-label="Leniwa Kluska — strona główna">
            <Wordmark />
          </a>

          <nav aria-label="Sekcje" className="hidden items-center gap-1 lg:flex">
            {navLinks.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="rounded-[var(--radius-pill)] px-3.5 py-2 text-sm font-medium text-ink-2 transition-colors hover:bg-paper-2 hover:text-ink"
              >
                {l.name}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-1.5">
            <a
              href="/athlete/login"
              className="hidden rounded-[var(--radius-pill)] px-3.5 py-2 text-sm font-medium text-ink-2 transition-colors hover:text-ink sm:block"
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
              className="grid size-10 place-items-center rounded-[var(--radius-pill)] text-ink transition-colors hover:bg-paper-2 lg:hidden"
            >
              {open ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>

        {open && (
          <nav id="mobile-menu" aria-label="Sekcje" className="border-t border-rule px-2 pb-3 pt-2 lg:hidden">
            {navLinks.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="flex items-center justify-between rounded-[var(--radius-ui)] px-3 py-3.5 font-display text-xl font-semibold tracking-[-0.02em] hover:bg-paper-2"
              >
                {l.name}
                <ArrowRight className="size-4 text-ink-2" aria-hidden />
              </a>
            ))}
            <div className="mt-2 grid gap-2 px-1 sm:grid-cols-2">
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
