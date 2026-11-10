/* An index, not a card grid: every line is a screen that exists in the athlete app. */
const items = [
  {
    lead: 'Atlas ćwiczeń',
    text: 'Ponad 250 ćwiczeń z opisem ruchu i zaangażowanymi mięśniami — gdy nie pamiętasz, jak to się robiło.',
  },
  {
    lead: 'Wykresy i rekordy',
    text: 'Zobacz, jak rosną Twoje ciężary, i zbieraj odznaki za nowe rekordy.',
  },
  {
    lead: 'Szablony i programy',
    text: 'Gotowe plany (PPL, FBW i inne) albo własny program ułożony pod Twój tydzień.',
  },
  {
    lead: 'Kalendarz treningów',
    text: 'Co zrobiłeś i co masz w planie — na jednym widoku.',
  },
  {
    lead: 'Pomiary ciała',
    text: 'Waga i obwody w jednym miejscu, obok raportów dla trenera.',
  },
  {
    lead: 'Cele i trofea',
    text: 'Ustaw cel, odhaczaj kolejne i zbieraj punkty XP za treningi.',
  },
  {
    lead: 'Mapa siłowni',
    text: 'Znajdź miejsce do treningu w swojej okolicy.',
  },
  {
    lead: 'Ekipa i strefa wiedzy',
    text: 'Czat, profile innych sportowców i artykuły, do których wracasz, kiedy masz wątpliwości.',
  },
];

export function KeyFeatures() {
  return (
    <section aria-labelledby="more-title" className="section border-t border-rule">
      <div className="shell">
        <h2 id="more-title" className="h-section max-w-[16ch]">
          Wszystko, czego potrzebuje Twój tydzień.
        </h2>
        <p className="lede mt-6 max-w-xl">Poza dziennikiem jest jeszcze reszta siłowni. Każda pozycja to gotowy ekran w aplikacji.</p>

        <ul className="mt-12 grid grid-cols-[minmax(0,1fr)] border-t border-rule-strong sm:mt-16 md:grid-cols-2 md:gap-x-16">
          {items.map(({ lead, text }) => (
            <li key={lead} className="group border-b border-rule py-6">
              <p className="font-display text-[2rem] font-extrabold uppercase leading-none transition-colors duration-200 group-hover:text-accent sm:text-[2.5rem]">
                {lead}
              </p>
              <p className="mt-2.5 max-w-[30rem] leading-relaxed text-ink-2">{text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
