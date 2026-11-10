import { ArrowRight, Check } from 'lucide-react';
import { reveal } from '../lib/reveal';

const included = [
  'Dziennik treningowy i gotowe plany',
  'Bieganie z GPS i eksport do Stravy',
  'Dieta, makro i skaner kodów',
  'Kalkulator talerzy i stoper przerw',
  'Współpraca z trenerem i check-iny',
  'Nawyki, odznaki i wykresy postępów',
];

const steps = [
  {
    title: 'Otwórz aplikację',
    body: 'W przeglądarce telefonu albo jako aplikację na Androida. Na iPhonie dodajesz ją do ekranu początkowego.',
  },
  {
    title: 'Wybierz plan',
    body: 'Weź gotowy szablon (PPL, FBW i inne), zbuduj własny albo wpisz kod od trenera.',
  },
  {
    title: 'Trenuj',
    body: 'Zapisujesz serie, a postępy, rekordy i podsumowania tygodnia liczą się same.',
  },
];

/* One plan, so one object: a chalk-white card with the price set as large as the page allows. */
export function Pricing() {
  return (
    <section id="cennik" aria-labelledby="pricing-title" className="section">
      <div className="shell">
        <h2 {...reveal(0)} id="pricing-title" className="h-section max-w-[14ch]">
          Jeden plan. Cała aplikacja.
        </h2>
        <p {...reveal(1)} className="lede mt-6 max-w-xl">
          Bez wersji premium i bez odblokowywania funkcji. Wybierasz tylko, od czego zaczynasz.
        </p>

        <div className="mt-12 grid grid-cols-[minmax(0,1fr)] gap-12 lg:mt-16 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-20">
          <div {...reveal(0)} className="sheet p-6 sm:p-10">
            <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-2">
              <p className="big text-[clamp(6.5rem,17vw,13rem)]">0&nbsp;zł</p>
              <p className="muted max-w-[14rem] pb-3 text-lg font-medium leading-snug sm:pb-6">Bez subskrypcji i bez podawania karty.</p>
            </div>

            <ul className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-3 border-t border-sheet-rule pt-7 sm:grid-cols-2">
              {included.map((f) => (
                <li key={f} className="flex gap-2.5 text-[0.9375rem] font-medium">
                  <Check className="mt-0.5 size-4 shrink-0 text-sheet-accent" strokeWidth={3} aria-hidden />
                  {f}
                </li>
              ))}
            </ul>

            <a href="/athlete/dashboard" className="btn btn-primary btn-lg mt-9 w-full">
              Zacznij za darmo
              <ArrowRight className="nudge size-4" aria-hidden />
            </a>
          </div>

          <div className="flex flex-col justify-center">
            <h3 className="h-sub">Pierwszy trening jeszcze dziś.</h3>
            <ol className="mt-8 border-t border-rule">
              {steps.map((s, i) => (
                <li key={s.title} className="grid grid-cols-[3.5rem_minmax(0,1fr)] gap-4 border-b border-rule py-6">
                  <span className="big text-5xl text-ink-3" aria-hidden>
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-lg font-semibold">{s.title}</p>
                    <p className="mt-1.5 leading-relaxed text-ink-2">{s.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
