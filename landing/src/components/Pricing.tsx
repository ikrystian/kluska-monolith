import { ArrowRight, Check } from 'lucide-react';

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

/* One plan, so no table: the price printed across a chalk field as large as the page allows. */
export function Pricing() {
  return (
    <section id="cennik" aria-labelledby="pricing-title" className="sheet grain">
      <div className="shell py-20 sm:py-28">
        <h2 id="pricing-title" className="h-section">
          Jeden plan. Cała aplikacja.
        </h2>

        <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-14 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:gap-24">
          <div>
            <p className="big text-[clamp(9rem,38vw,24rem)] !leading-[0.8] text-sheet-accent">
              0<span className="text-[0.5em] text-sheet-ink">&nbsp;zł</span>
            </p>
            <p className="muted mt-6 max-w-[30rem] text-lg leading-relaxed sm:text-xl">
              Bez subskrypcji, bez wersji premium i bez podawania karty. Wybierasz tylko, od czego zaczynasz.
            </p>

            <ul className="mt-8 grid grid-cols-[minmax(0,1fr)] gap-x-8 border-t border-sheet-rule sm:grid-cols-2">
              {included.map((f) => (
                <li key={f} className="flex items-start gap-2.5 border-b border-sheet-rule py-3.5 font-medium">
                  <Check className="mt-1 size-4 shrink-0 text-sheet-accent" strokeWidth={3.5} aria-hidden />
                  {f}
                </li>
              ))}
            </ul>

            <a href="https://app.leniwakluska.pl" className="btn btn-ink btn-lg mt-9">
              Zacznij za darmo
              <ArrowRight className="nudge size-5" aria-hidden />
            </a>
          </div>

          <div className="lg:pt-10">
            <h3 className="h-sub">Pierwszy trening jeszcze dziś.</h3>
            <ol className="mt-7 border-t border-sheet-ink">
              {steps.map((s, i) => (
                <li key={s.title} className="grid grid-cols-[3.25rem_minmax(0,1fr)] gap-4 border-b border-sheet-rule py-6">
                  <span className="big text-6xl text-sheet-accent" aria-hidden>
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-display text-[1.625rem] font-bold uppercase leading-[1.05]">{s.title}</p>
                    <p className="muted mt-1.5 leading-relaxed">{s.body}</p>
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
