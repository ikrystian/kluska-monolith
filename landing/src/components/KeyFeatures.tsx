import { BookOpen, CalendarDays, ClipboardList, Map, Ruler, TrendingUp, Trophy, Users2 } from 'lucide-react';

/* the reference's "advanced features" block: icon + bold lead + a sentence, staggered on a 12-column grid.
   Every item is a screen that exists in the athlete app. */
const items = [
  {
    icon: BookOpen,
    lead: 'Atlas ćwiczeń.',
    text: 'Ponad 250 ćwiczeń z opisem ruchu i zaangażowanymi mięśniami — gdy nie pamiętasz, jak to się robiło.',
    cls: 'lg:col-span-5',
  },
  {
    icon: TrendingUp,
    lead: 'Wykresy i rekordy.',
    text: 'Zobacz, jak rosną Twoje ciężary, i zbieraj odznaki za nowe rekordy.',
    cls: 'lg:col-span-4 lg:col-start-7 lg:mt-14',
  },
  {
    icon: ClipboardList,
    lead: 'Szablony i programy.',
    text: 'Gotowe plany (PPL, FBW i inne) albo własny program ułożony pod Twój tydzień.',
    cls: 'lg:col-span-4',
  },
  {
    icon: CalendarDays,
    lead: 'Kalendarz treningów.',
    text: 'Co zrobiłeś i co masz w planie — na jednym widoku.',
    cls: 'lg:col-span-4 lg:mt-10',
  },
  {
    icon: Ruler,
    lead: 'Pomiary ciała.',
    text: 'Waga i obwody w jednym miejscu, obok raportów dla trenera.',
    cls: 'lg:col-span-4 lg:mt-24',
  },
  {
    icon: Trophy,
    lead: 'Cele i trofea.',
    text: 'Ustaw cel, odhaczaj kolejne i zbieraj punkty XP za treningi.',
    cls: 'lg:col-span-4',
  },
  {
    icon: Map,
    lead: 'Mapa siłowni.',
    text: 'Znajdź miejsce do treningu w swojej okolicy.',
    cls: 'lg:col-span-4 lg:mt-12',
  },
  {
    icon: Users2,
    lead: 'Społeczność i strefa wiedzy.',
    text: 'Czat, profile innych sportowców i artykuły, do których wracasz, kiedy masz wątpliwości.',
    cls: 'lg:col-span-4 lg:mt-0',
  },
];

export function KeyFeatures() {
  return (
    <section aria-labelledby="more-title" className="section">
      <div className="shell">
        <h2 id="more-title" className="h-section max-w-[18ch]">
          Wszystko, czego potrzebuje Twój tydzień.
        </h2>

        <ul className="mt-14 grid grid-cols-[minmax(0,1fr)] gap-x-10 gap-y-10 sm:grid-cols-2 lg:mt-20 lg:grid-cols-12 lg:gap-y-6">
          {items.map(({ icon: Icon, lead, text, cls }) => (
            <li key={lead} className={cls}>
              <Icon className="size-7 text-accent" strokeWidth={1.75} aria-hidden />
              <p className="mt-4 leading-relaxed text-ink-2">
                <strong className="font-semibold text-ink">{lead}</strong> {text}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
