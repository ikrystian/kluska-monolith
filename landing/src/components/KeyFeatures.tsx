import { BookOpen, CalendarDays, ClipboardList, Map, Ruler, TrendingUp, Trophy, Users2 } from 'lucide-react';
import { reveal } from '../lib/reveal';

/* A spec sheet, not a card grid: every row is a screen that exists in the athlete app. */
const items = [
  { icon: BookOpen, lead: 'Atlas ćwiczeń', text: 'Ponad 250 ćwiczeń z opisem ruchu i zaangażowanymi mięśniami — gdy nie pamiętasz, jak to się robiło.' },
  { icon: TrendingUp, lead: 'Wykresy i rekordy', text: 'Zobacz, jak rosną Twoje ciężary, i zbieraj odznaki za nowe rekordy.' },
  { icon: ClipboardList, lead: 'Szablony i programy', text: 'Gotowe plany (PPL, FBW i inne) albo własny program ułożony pod Twój tydzień.' },
  { icon: CalendarDays, lead: 'Kalendarz treningów', text: 'Co zrobiłeś i co masz w planie — na jednym widoku.' },
  { icon: Ruler, lead: 'Pomiary ciała', text: 'Waga i obwody w jednym miejscu, obok raportów dla trenera.' },
  { icon: Trophy, lead: 'Cele i trofea', text: 'Ustaw cel, odhaczaj kolejne i zbieraj punkty XP za treningi.' },
  { icon: Map, lead: 'Mapa siłowni', text: 'Znajdź miejsce do treningu w swojej okolicy.' },
  { icon: Users2, lead: 'Ekipa i strefa wiedzy', text: 'Czat, profile innych sportowców i artykuły, do których wracasz, kiedy masz wątpliwości.' },
];

export function KeyFeatures() {
  return (
    <section aria-labelledby="more-title" className="section">
      <div className="shell grid grid-cols-[minmax(0,1fr)] gap-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-20">
        <div className="lg:sticky lg:top-[calc(var(--header-h)+2rem)] lg:self-start">
          <h2 {...reveal(0)} id="more-title" className="h-section">
            Wszystko, czego potrzebuje Twój tydzień.
          </h2>
          <p {...reveal(1)} className="lede mt-6 max-w-md">
            Poza czterema talerzami jest jeszcze reszta siłowni. Każda pozycja to gotowy ekran w aplikacji.
          </p>
        </div>

        <ul className="border-t border-rule">
          {items.map(({ icon: Icon, lead, text }) => (
            <li key={lead} className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-4 gap-y-1 border-b border-rule py-5 sm:grid-cols-[2.5rem_14rem_minmax(0,1fr)] sm:items-baseline">
              <Icon className="size-5 self-center text-ink-2 sm:self-auto sm:translate-y-1" strokeWidth={1.75} aria-hidden />
              <p className="font-display text-2xl font-bold uppercase leading-none">{lead}</p>
              <p className="col-start-2 leading-relaxed text-ink-2 sm:col-start-3">{text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
