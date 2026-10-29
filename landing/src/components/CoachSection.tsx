import { ArrowRight, Check } from 'lucide-react';
import { reveal } from '../lib/reveal';

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
    <section id="trenerzy" aria-labelledby="coach-title" className="px-3 sm:px-4">
      <div className="stage on-night mx-auto max-w-[90rem] py-20 sm:py-28">
        <div className="shell grid items-center gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-20">
          <div>
            <h2 {...reveal(0)} id="coach-title" className="h-section">
              Prowadzisz podopiecznych? Przestań szukać ich wyników.
            </h2>
            <p {...reveal(1)} className="lede mt-5 max-w-xl !text-night-ink-2">
              Panel trenera pokazuje, kto trenuje, kto odpuszcza i czyj check-in czeka na odpowiedź. Bez arkuszy i
              zrzutów ekranu.
            </p>
            <ul {...reveal(2)} className="mt-8 space-y-3.5">
              {capabilities.map((c) => (
                <li key={c} className="flex gap-3 leading-relaxed">
                  <span className="mt-1 grid size-5 shrink-0 place-items-center rounded-full bg-volt text-on-volt" aria-hidden>
                    <Check className="size-3" strokeWidth={3} />
                  </span>
                  {c}
                </li>
              ))}
            </ul>
            <div {...reveal(3)} className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-4">
              <a href="/login" className="btn btn-primary">
                Przejdź do panelu trenera
                <ArrowRight className="nudge size-4" aria-hidden />
              </a>
              <a href="/athlete/login" className="link text-sm">
                Mam kod od trenera
              </a>
            </div>
          </div>

          <figure {...reveal(1)} className="ui overflow-hidden shadow-pop" aria-label="Podgląd panelu trenera: lista podopiecznych">
            <div className="flex items-baseline justify-between border-b border-night-rule px-5 py-4 sm:px-6">
              <p className="font-display font-semibold tracking-[-0.02em]">Podopieczni</p>
              <p className="label text-night-ink-2">4 aktywnych</p>
            </div>
            <ul>
              {roster.map((p) => (
                <li key={p.name} className="flex items-center gap-4 border-b border-night-rule px-5 py-4 last:border-b-0 sm:px-6">
                  <span
                    className="grid size-10 shrink-0 place-items-center rounded-full bg-night-3 text-xs font-semibold text-night-ink-2"
                    aria-hidden
                  >
                    {initials(p.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[0.9375rem] font-medium">{p.name}</p>
                    <p className={`truncate text-sm ${p.tone === 'warn' ? 'text-accent' : 'text-night-ink-2'}`}>{p.status}</p>
                  </div>
                  {p.tone === 'new' && <span className="chip shrink-0 bg-volt text-on-volt">Nowy</span>}
                </li>
              ))}
            </ul>
          </figure>
        </div>
      </div>
    </section>
  );
}
