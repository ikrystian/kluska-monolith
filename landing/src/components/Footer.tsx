import { Wordmark } from './Wordmark';

const groups = [
  {
    title: 'Aplikacja',
    links: [
      ['Jak to działa', '#funkcje'],
      ['Trening', '#trening'],
      ['Bieganie', '#bieganie'],
      ['Dieta', '#dieta'],
      ['Kalkulator talerzy', '#kalkulator'],
    ],
  },
  {
    title: 'Dla trenerów',
    links: [
      ['Panel trenera', '/login'],
      ['Mam kod od trenera', '/athlete/login'],
    ],
  },
  {
    title: 'Konto',
    links: [
      ['Zacznij za darmo', '/athlete/dashboard'],
      ['Zaloguj się', '/athlete/login'],
      ['Cennik', '#cennik'],
      ['FAQ', '#faq'],
    ],
  },
];

export function Footer() {
  return (
    <footer className="pb-8 pt-16 sm:pt-20">
      <div className="shell">
        <div className="grid grid-cols-[minmax(0,1fr)] gap-12 sm:grid-cols-3 lg:grid-cols-[minmax(0,1.3fr)_repeat(3,minmax(0,0.6fr))] lg:gap-10">
          <div className="max-w-md sm:col-span-3 lg:col-span-1">
            <a href="#" aria-label="Leniwa Kluska — do góry">
              <Wordmark size="lg" />
            </a>
            <p className="mt-5 font-display text-2xl font-semibold leading-tight tracking-[-0.025em] text-ink-2">
              Trening, bieganie i dieta w jednym dzienniku. Zrobione w Polsce.
            </p>
          </div>

          {groups.map((g) => (
            <nav key={g.title} aria-label={g.title}>
              <p className="label text-ink-2">{g.title}</p>
              <ul className="mt-4 space-y-3 text-[0.9375rem]">
                {g.links.map(([l, href]) => (
                  <li key={href + l}>
                    <a href={href} className="whitespace-nowrap text-ink transition-colors hover:text-accent-ink">
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-14 flex flex-col gap-3 border-t border-rule pt-6 text-sm text-ink-2 sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} Leniwa Kluska</p>
          <p className="flex gap-6">
            <a href="#" className="transition-colors hover:text-ink">
              Prywatność
            </a>
            <a href="#" className="transition-colors hover:text-ink">
              Regulamin
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
