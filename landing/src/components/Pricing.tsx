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

/* the reference leads with a statement, then cards; there is one plan here, so one card — the paper receipt */
export function Pricing() {
  return (
    <section id="cennik" aria-labelledby="pricing-title" className="section">
      <div className="shell">
        <h2 id="pricing-title" className="h-section max-w-[16ch]">
          Jeden plan. Cała aplikacja.
        </h2>
        <p className="lede mt-5 max-w-xl">Bez wersji premium i bez odblokowywania funkcji. Wybierasz tylko, od czego zaczynasz.</p>

        <div className="mt-12 grid grid-cols-[minmax(0,1fr)] gap-12 lg:mt-16 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-20">
          <div className="receipt p-7 sm:p-10">
            <p className="text-lg font-semibold">Leniwa Kluska</p>
            <p className="display mt-3 text-[clamp(4.5rem,11vw,7rem)] leading-none">0&nbsp;zł</p>
            <p className="mt-3 text-lg text-receipt-ink/75">Bez subskrypcji i bez podawania karty.</p>

            <ul className="mt-8 grid gap-3 border-t border-receipt-rule pt-8 sm:grid-cols-2">
              {included.map((f) => (
                <li key={f} className="flex gap-2.5 text-[0.9375rem]">
                  <Check className="mt-0.5 size-4 shrink-0 text-sheet-accent" strokeWidth={2.5} aria-hidden />
                  {f}
                </li>
              ))}
            </ul>

            <a href="/athlete/dashboard" className="btn btn-primary btn-lg mt-10 w-full">
              Zacznij za darmo
              <ArrowRight className="nudge size-4" aria-hidden />
            </a>
          </div>

          <div className="flex flex-col justify-center">
            <h3 className="font-display text-[clamp(1.75rem,3vw,2.5rem)] font-semibold leading-[1.08] tracking-[-0.03em]">
              Pierwszy trening jeszcze dziś.
            </h3>
            <ol className="mt-10 space-y-8">
              {steps.map((s, i) => (
                <li key={s.title} className="grid grid-cols-[2.75rem_minmax(0,1fr)] gap-5">
                  <span className="num grid size-11 place-items-center rounded-full border border-rule-strong bg-paper-2 text-lg font-semibold">
                    {i + 1}
                  </span>
                  <div className="pt-1.5">
                    <p className="font-display text-xl font-semibold tracking-[-0.02em]">{s.title}</p>
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
