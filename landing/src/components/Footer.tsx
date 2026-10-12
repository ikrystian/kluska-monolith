import { Wordmark } from './Navbar';
import { reveal } from '../lib/reveal';

const groups = [
  {
    title: 'Aplikacja',
    links: [
      ['Panel główny', '/athlete/dashboard'],
      ['Trenuj teraz', '/athlete/log'],
      ['Bieganie', '/athlete/running'],
      ['Mój program', '/athlete/workout-plans'],
      ['Atlas ćwiczeń', '/athlete/exercises'],
    ],
  },
  {
    title: 'Narzędzia',
    links: [
      ['Kalkulator talerzy', '#kalkulator'],
      ['Dieta i makro', '/athlete/diet'],
      ['Wykresy i rekordy', '/athlete/progress'],
      ['Nawyki', '/athlete/habits'],
      ['Mapa siłowni', '/athlete/map'],
    ],
  },
  {
    title: 'Trenerzy',
    links: [
      ['Panel trenera', '/login'],
      ['Check-in', '#trenerzy'],
      ['Strefa wiedzy', '/athlete/knowledge-zone'],
    ],
  },
];

export function Footer() {
  return (
    <footer className="on-night bg-night text-night-ink">
      <div className="shell pb-8">
        <div className="border-t border-night-rule pt-14">
          <div className="grid gap-10 sm:grid-cols-3 lg:max-w-3xl">
            {groups.map((g) => (
              <nav key={g.title} aria-label={g.title}>
                <h2 className="label text-night-ink-2">{g.title}</h2>
                <ul className="mt-4 space-y-2.5">
                  {g.links.map(([l, href]) => (
                    <li key={href}>
                      <a href={href} className="whitespace-nowrap text-[0.9375rem] transition-colors hover:text-accent">
                        {l}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>

          <a {...reveal(0)} href="#" aria-label="Leniwa Kluska — do góry" className="mt-16 block text-[clamp(3rem,12.4vw,10.75rem)]">
            <Wordmark className="block" />
          </a>

          <div className="label mt-8 flex flex-col gap-3 border-t border-night-rule pt-6 text-night-ink-2 sm:flex-row sm:justify-between">
            <p>© {new Date().getFullYear()} Leniwa Kluska. Zrobione w Polsce.</p>
            <p className="flex gap-6">
              <a href="#" className="hover:text-night-ink transition-colors">
                Prywatność
              </a>
              <a href="#" className="hover:text-night-ink transition-colors">
                Regulamin
              </a>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
