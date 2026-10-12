import { useEffect, useState } from 'react';
import { ArrowRight, Menu, X } from 'lucide-react';

const navLinks = [
  { name: 'Moduły', href: '#funkcje' },
  { name: 'Bieganie', href: '#bieganie' },
  { name: 'Kalkulator', href: '#kalkulator' },
  { name: 'Offline', href: '#offline' },
  { name: 'FAQ', href: '#faq' },
];

export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`display uppercase leading-none tracking-[0.035em] [font-kerning:none] ${className}`}>
      Leniwa<span className="text-accent">·</span>Kluska
    </span>
  );
}

export function Navbar() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      {/* utility line — scrolls away */}
      <div className="border-b border-rule">
        <div className="shell flex h-9 items-center justify-between gap-4 label text-ink-2">
          <p className="truncate">
            <span className="hidden sm:inline">Dziennik treningowy · Bieganie z GPS · Dieta · Trener — </span>
            PWA i Android
          </p>
          <a href="/athlete/login" className="shrink-0 hover:text-ink transition-colors">
            Zaloguj się
          </a>
        </div>
      </div>

      <header className="sticky top-0 z-50 bg-paper/95 backdrop-blur-sm border-b border-rule">
        <div className="shell flex h-16 items-center justify-between gap-6">
          <a href="#" aria-label="Leniwa Kluska — strona główna" className="text-2xl sm:text-[1.75rem]">
            <Wordmark />
          </a>

          <nav aria-label="Sekcje" className="hidden lg:flex items-center gap-7">
            {navLinks.map((l) => (
              <a key={l.href} href={l.href} className="text-[0.9375rem] text-ink-2 hover:text-ink transition-colors">
                {l.name}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <a href="/athlete/dashboard" className="btn btn-primary hidden sm:inline-flex !min-h-10 !px-4 text-sm">
              Otwórz aplikację
              <ArrowRight className="size-4" aria-hidden />
            </a>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls="mobile-menu"
              aria-label={open ? 'Zamknij menu' : 'Otwórz menu'}
              className="lg:hidden grid size-10 place-items-center rounded-[var(--radius-ui)] border border-rule hover:border-ink transition-colors"
            >
              {open ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>

        {open && (
          <div id="mobile-menu" className="lg:hidden border-t border-rule bg-paper">
            <nav aria-label="Sekcje" className="shell py-2">
              {navLinks.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-between border-b border-rule py-4 display text-3xl"
                >
                  {l.name}
                  <ArrowRight className="size-5 text-ink-2" aria-hidden />
                </a>
              ))}
              <div className="grid gap-2 py-5 sm:grid-cols-2">
                <a href="/athlete/dashboard" className="btn btn-primary">
                  Otwórz aplikację
                </a>
                <a href="/athlete/login" className="btn btn-ghost">
                  Zaloguj się
                </a>
              </div>
            </nav>
          </div>
        )}
      </header>
    </>
  );
}
