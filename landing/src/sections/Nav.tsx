import { useEffect, useState } from 'react';
import { ArrowRight, Dumbbell, House, LayoutGrid, Plus, Users, UtensilsCrossed, type LucideIcon } from 'lucide-react';
import { getSeason, plural, useNow } from '../lib/season';

const APP = 'https://app.leniwakluska.pl';

const SECTIONS = ['top', 'trening', 'kalkulator', 'bieganie', 'dieta', 'nawyki', 'postepy', 'zwierzak', 'ekipa', 'trenerzy', 'wiecej', 'funkcje', 'rok', 'cennik', 'faq'];

const LINKS = [
  ['Trening', 'trening'],
  ['Bieganie', 'bieganie'],
  ['Jedzenie', 'dieta'],
  ['Postępy', 'postepy'],
  ['Zwierzak', 'zwierzak'],
  ['Ekipa', 'ekipa'],
  ['Trener', 'trenerzy'],
  ['Funkcje', 'funkcje'],
  ['Cennik', 'cennik'],
] as const;

/* the app's own bar: which page section each tab stands for */
const TABS: { label: string; href: string; icon: LucideIcon; covers: string[] }[] = [
  { label: 'Dziś', href: '#top', icon: House, covers: ['top'] },
  { label: 'Trening', href: '#trening', icon: Dumbbell, covers: ['trening', 'kalkulator', 'bieganie'] },
  { label: 'Dieta', href: '#dieta', icon: UtensilsCrossed, covers: ['dieta'] },
  { label: 'Ekipa', href: '#ekipa', icon: Users, covers: ['ekipa', 'trenerzy'] },
  { label: 'Funkcje', href: '#funkcje', icon: LayoutGrid, covers: ['funkcje'] },
];

/** The id of the section the reader is in: the last one whose top has passed 40 % of the viewport. */
function useActiveSection() {
  const [active, setActive] = useState('top');

  useEffect(() => {
    const measure = () => {
      const line = window.innerHeight * 0.4;
      let current = 'top';
      for (const id of SECTIONS) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top < line) current = id;
      }
      setActive(current);
    };
    measure();
    window.addEventListener('scroll', measure, { passive: true });
    window.addEventListener('resize', measure);
    return () => {
      window.removeEventListener('scroll', measure);
      window.removeEventListener('resize', measure);
    };
  }, []);

  return active;
}

/* Campaign strip that scrolls away, a floating pill of links on wide screens, and on phones the
   app's own tab bar — the lime marker slides to the section being read. */
export function Nav() {
  const active = useActiveSection();
  const season = getSeason(useNow(60_000));
  const tab = TABS.findIndex((t) => t.covers.includes(active));
  // the "+" sits in the middle column, so tabs 2 and up shift one column to the right
  const col = tab < 2 ? tab : tab + 1;

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

      <header className="sticky top-0 z-50 pt-3">
        <div className="shell">
          <div className="nav-pill flex h-14 items-center justify-between gap-2 pl-3 pr-2 sm:gap-3 sm:pl-4">
            <a href="#top" aria-label="Leniwa Kluska — do góry" className="flex shrink-0 items-center gap-2.5">
              <img src="/icons/icon-192.png" alt="" width={192} height={192} className="size-8 rounded-[10px] max-[359px]:hidden" />
              <span className="hash font-display text-xl font-extrabold min-[380px]:text-[1.375rem] uppercase leading-none tracking-[0.01em]">leniwakluska</span>
            </a>

            <nav aria-label="Sekcje" className="hidden items-center min-[1180px]:flex">
              {LINKS.map(([name, id]) => (
                <a
                  key={id}
                  href={`#${id}`}
                  aria-current={active === id ? 'true' : undefined}
                  className={`relative whitespace-nowrap px-2.5 py-2 text-[0.9375rem] font-semibold transition-colors hover:text-ink ${active === id ? 'text-ink' : 'text-ink-2'}`}
                >
                  {name}
                  <span
                    aria-hidden
                    className={`absolute inset-x-2.5 -bottom-0.5 h-[3px] rounded-full bg-volt transition-transform duration-300 ease-[var(--ease-out)] ${active === id ? 'scale-x-100' : 'scale-x-0'}`}
                  />
                </a>
              ))}
            </nav>

            <div className="flex shrink-0 items-center gap-1">
              <a href={APP} className="hidden whitespace-nowrap px-3 py-2 text-[0.9375rem] font-semibold text-ink-2 transition-colors hover:text-ink sm:block min-[1180px]:hidden xl:block">
                Zaloguj się
              </a>
              <a href={APP} className="btn btn-primary btn-sm !rounded-full !px-4">
                Zacznij dziś
              </a>
            </div>
          </div>
        </div>
      </header>

      <nav aria-label="Skróty" className="tabbar fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-50 mx-auto max-w-md min-[1180px]:hidden">
        <div className="relative grid h-[3.75rem] grid-cols-6">
          <span
            aria-hidden
            className={`tab-indicator absolute left-0 top-0 h-[3px] w-1/6 px-4 transition-opacity duration-300 ${tab < 0 ? 'opacity-0' : ''}`}
            style={{ transform: `translateX(${Math.max(0, col) * 100}%)` }}
          >
            <span className="block h-full rounded-b-full bg-volt" />
          </span>
          {TABS.slice(0, 2).map((t, n) => (
            <Tab key={t.label} {...t} on={tab === n} />
          ))}
          <a href={APP} aria-label="Otwórz aplikację" className="grid place-items-center">
            <span className="grid size-12 -translate-y-3 place-items-center rounded-full bg-accent text-on-accent shadow-[0_8px_22px_-6px_var(--color-accent)] transition-transform duration-150 ease-[var(--ease-out)] active:scale-95">
              <Plus className="size-6" strokeWidth={2.6} aria-hidden />
            </span>
          </a>
          {TABS.slice(2).map((t, n) => (
            <Tab key={t.label} {...t} on={tab === n + 2} />
          ))}
        </div>
      </nav>
    </>
  );
}

function Tab({ label, href, icon: Icon, on }: { label: string; href: string; icon: LucideIcon; on: boolean }) {
  return (
    <a
      href={href}
      aria-current={on ? 'true' : undefined}
      className={`flex flex-col items-center justify-center gap-1 transition-colors active:opacity-70 ${on ? 'text-ink' : 'text-ink-3'}`}
    >
      <Icon className="size-[22px]" strokeWidth={on ? 2.4 : 2} aria-hidden />
      <span className={`text-[0.6875rem] leading-none ${on ? 'font-semibold' : 'font-medium'}`}>{label}</span>
    </a>
  );
}
