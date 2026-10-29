import { ArrowDown, Dumbbell, MessageCircle, Route, UtensilsCrossed } from 'lucide-react';
import { reveal } from '../lib/reveal';

const swaps = [
  {
    icon: Dumbbell,
    before: 'Notatki w telefonie',
    after: 'Dziennik z progresją',
    body: 'Poprzednie ciężary, RPE, tonaż i rekordy liczą się same.',
  },
  {
    icon: Route,
    before: 'Osobna apka do biegania',
    after: 'Bieg z GPS i Stravą',
    body: 'Trasa, splity, tempo — i automatyczny eksport na profil.',
  },
  {
    icon: UtensilsCrossed,
    before: 'Licznik kalorii',
    after: 'Dieta i makro',
    body: 'Posiłki, białko i skaner kodów kreskowych w tym samym miejscu.',
  },
  {
    icon: MessageCircle,
    before: 'Komunikator z trenerem',
    after: 'Check-in i czat',
    body: 'Trener widzi Twoje treningi, pomiary i zdjęcia bez proszenia.',
  },
];

export function ReplaceStrip() {
  return (
    <section aria-labelledby="replace-title" className="border-y border-rule bg-paper-2 py-16 sm:py-20">
      <div className="shell">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-end lg:gap-14">
          <h2 {...reveal(0)} id="replace-title" className="h-section">
            Cztery aplikacje zastąpione jedną.
          </h2>
          <p {...reveal(1)} className="lede max-w-xl">
            Dane z każdego modułu widać w pozostałych — tygodniowe podsumowanie łączy tonaż z siłowni z kilometrami
            z biegania.
          </p>
        </div>

        <ul className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {swaps.map(({ icon: Icon, before, after, body }, i) => (
            <li {...reveal(i)} key={after} className="card flex flex-col p-5 sm:p-6">
              <p className="text-sm text-ink-2 line-through decoration-rule-strong">{before}</p>
              <ArrowDown className="my-3 size-4 text-rule-strong" aria-hidden />
              <div className="flex items-center gap-3">
                <span className="icon-tile size-9 shrink-0" aria-hidden>
                  <Icon className="size-4.5" />
                </span>
                <p className="font-display text-lg font-semibold tracking-[-0.02em]">{after}</p>
              </div>
              <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-2">{body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
