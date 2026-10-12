import { ArrowRight } from 'lucide-react';

const roster = [
  { name: 'Anna Kowalczyk', status: 'Check-in do przejrzenia', tone: 'new' },
  { name: 'Tomasz Wrona', status: 'Push B ukończony · 2 godz. temu', tone: 'ok' },
  { name: 'Ola Nowicka', status: '5 dni bez treningu', tone: 'warn' },
  { name: 'Marek Zieliński', status: 'Plan kończy się w niedzielę', tone: 'ok' },
] as const;

const capabilities = [
  'Rozpisujesz plan raz — podopieczny widzi go od razu w dzienniku.',
  'Wyniki każdej serii trafiają do Ciebie po zakończeniu treningu.',
  'Cotygodniowe check-iny z pomiarami i zdjęciami w jednym miejscu.',
  'Czat z powiadomieniami push zamiast pięciu komunikatorów.',
];

function initials(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .join('');
}

export function CoachSection() {
  return (
    <section id="trenerzy" className="border-y border-rule bg-paper-2 py-24 sm:py-32">
      <div className="shell grid grid-cols-[minmax(0,1fr)] items-center gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-20">
        <div className="lg:order-2">
          <h2 className="text-headline font-semibold text-ink">Prowadzisz podopiecznych? Przestań szukać ich wyników.</h2>
          <ul className="mt-8 space-y-4 border-l border-rule-strong pl-5">
            {capabilities.map((c) => (
              <li key={c} className="leading-relaxed text-ink-2">
                {c}
              </li>
            ))}
          </ul>
          <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-4">
            <a href="/login" className="btn btn-primary">
              Przejdź do panelu trenera
              <ArrowRight className="h-4 w-4" aria-hidden />
            </a>
            <a href="/athlete/login" className="link text-sm">
              Mam kod od trenera
            </a>
          </div>
        </div>

        <figure className="panel overflow-hidden lg:order-1" aria-label="Podgląd panelu trenera: lista podopiecznych">
          <div className="flex items-baseline justify-between border-b border-rule px-5 py-4 sm:px-6">
            <p className="font-medium text-ink">Podopieczni</p>
            <p className="font-mono text-xs text-muted tnum">4 aktywnych</p>
          </div>
          <ul>
            {roster.map((p) => (
              <li
                key={p.name}
                className="flex items-center gap-4 border-b border-rule px-5 py-4 last:border-b-0 sm:px-6"
              >
                <span
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-paper-4 text-xs font-semibold text-ink-2"
                  aria-hidden
                >
                  {initials(p.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[0.9375rem] text-ink">{p.name}</p>
                  <p className={`truncate text-sm ${p.tone === 'warn' ? 'text-danger' : 'text-muted'}`}>{p.status}</p>
                </div>
                {p.tone === 'new' && (
                  <span className="shrink-0 rounded-sm bg-accent-wash px-1.5 py-0.5 text-xs font-semibold text-accent">
                    Nowy
                  </span>
                )}
              </li>
            ))}
          </ul>
        </figure>
      </div>
    </section>
  );
}
