import type { ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';
import { reveal } from '../lib/reveal';
import { useScrub } from '../lib/motion';
import { CATEGORIES, byCat, type CategoryId } from './features';
import { CoachDemo, CrewDemo, FoodDemo, HabitsDemo, ProgressDemo, RunDemo, WorkoutDemo } from './demos';
import { vars } from './ui';

/* One chapter of the tour: the app's own #TITLE, a claim, the screen playing its scene,
   and every feature of that area as a short row. The screen stays in view on wide screens
   while the rows scroll past it. */
function Chapter({
  id,
  hash,
  title,
  lede,
  demo,
  flip = false,
  band = false,
  children,
}: {
  id: CategoryId;
  hash: string;
  title: ReactNode;
  lede: string;
  demo: ReactNode;
  flip?: boolean;
  band?: boolean;
  children?: ReactNode;
}) {
  const tone = CATEGORIES.find((c) => c.id === id)!.tone;
  const items = byCat(id);
  const scrub = useScrub<HTMLDivElement>();

  return (
    <section id={id} aria-labelledby={`${id}-title`} className={`relative isolate overflow-clip ${band ? 'bg-paper-2' : ''}`} style={vars({ '--tone': tone })}>
      <div className="shell section grid grid-cols-[minmax(0,1fr)] gap-x-16 gap-y-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <div className={flip ? 'lg:order-2' : ''}>
          <p className="hash font-display text-2xl font-extrabold uppercase leading-none tracking-[0.01em] text-ink-2 sm:text-[1.75rem]">{hash}</p>
          <h2 id={`${id}-title`} className="h-section mt-3">
            {title}
          </h2>
          <p className="lede mt-5 max-w-[36rem]">{lede}</p>

          {/* on phones the screen comes right after the claim */}
          <div className="mt-10 lg:hidden">
            <div {...reveal(0, 'screen')} className="mx-auto w-full max-w-[22.5rem]">
              {demo}
            </div>
          </div>

          <ul className="chapter-list mt-10 border-t border-rule-strong">
            {items.map((x, n) => (
              <li key={x.title} {...reveal(n % 4, 'row')} className="flex gap-3.5 border-b border-rule py-4">
                <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-paper-3">
                  <x.icon className="size-[18px]" style={{ color: 'var(--tone)' }} aria-hidden />
                </span>
                <div className="min-w-0">
                  <h3 className="font-semibold leading-snug">{x.title}</h3>
                  <p className="mt-1 text-[0.9375rem] leading-relaxed text-ink-2">{x.body}</p>
                </div>
              </li>
            ))}
          </ul>
          {children}
        </div>

        <div ref={scrub} className={`relative hidden lg:block ${flip ? 'lg:order-1' : ''}`}>
          <div className="sticky top-[calc(var(--header-h)+2.5rem)] pb-4">
            <div aria-hidden className="bloom absolute -inset-x-16 -top-10 bottom-0 -z-10" />
            <div {...reveal(0, 'screen')} className="mx-auto w-full max-w-[22.5rem]">
              {demo}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const More = ({ href, children }: { href: string; children: ReactNode }) => (
  <a href={href} className="link mt-8">
    {children}
    <ArrowRight className="size-4" aria-hidden />
  </a>
);

export function TrainingChapter() {
  return (
    <Chapter
      id="trening"
      hash="Trening"
      title={
        <>
          Zapisz. <span className="text-accent">Pobij.</span> Powtórz.
        </>
      }
      lede="Dziennik siłowy, który pamięta, ile podniosłeś tydzień temu, sam odlicza przerwę i po ostatniej serii rozdaje nagrody."
      demo={<WorkoutDemo />}
    >
      <More href="#kalkulator">Wypróbuj kalkulator talerzy</More>
    </Chapter>
  );
}

export function RunningChapter() {
  return (
    <Chapter
      id="bieganie"
      hash="Bieg"
      title={
        <>
          Schowaj telefon <span className="text-run">i biegnij.</span>
        </>
      }
      lede="Trasa zapisuje się przy zgaszonym ekranie, tempo słyszysz w słuchawkach, a po biegu dostajesz mapę, międzyczasy i komentarz."
      demo={<RunDemo />}
      flip
      band
    />
  );
}

export function FoodChapter() {
  return (
    <Chapter
      id="dieta"
      hash="Kalorie"
      title={
        <>
          Makro policzone, <span className="text-food">zanim zjesz.</span>
        </>
      }
      lede="Skanujesz kod, wybierasz gotowe danie albo wpisujesz kalorie ręcznie. Dziennik od razu pokazuje, ile zostało na resztę dnia."
      demo={<FoodDemo />}
    />
  );
}

export function DailyChapter() {
  return (
    <Chapter
      id="nawyki"
      hash="Nawyki"
      title={
        <>
          Dzień zamknięty <span className="text-volt">na cztery cele.</span>
        </>
      }
      lede="Forma robi się między treningami. Aplikacja pilnuje wody, snu i rozciągania tak samo jak serii — i mówi, co jest następne."
      demo={<HabitsDemo />}
      flip
      band
    />
  );
}

export function ProgressChapter() {
  return (
    <Chapter
      id="postepy"
      hash="Wykresy"
      title={
        <>
          Postęp widać <span className="text-volt">na wykresie.</span>
        </>
      }
      lede="Siła, objętość, waga i obwody rysują się same z tego, co zapisujesz. Cele też liczą się same — Ty tylko odbierasz trofea."
      demo={<ProgressDemo />}
    />
  );
}

export function CrewChapter() {
  return (
    <Chapter
      id="ekipa"
      hash="Ekipa"
      title={
        <>
          Samemu łatwiej <span className="text-social">odpuścić.</span>
        </>
      }
      lede="Znajomi widzą Twój trening, Ty widzisz ich bieg. A kiedy motywacja siada, wyzywasz kogoś na wyścig do 50 kilometrów."
      demo={<CrewDemo />}
      flip
      band
    />
  );
}

export function CoachChapter() {
  return (
    <Chapter
      id="trenerzy"
      hash="Trener"
      title={
        <>
          Trener w kieszeni, <span className="text-social">nie w mailach.</span>
        </>
      }
      lede="Program, czat i cotygodniowy check-in w tej samej aplikacji, w której trenujesz. Nie masz trenera? Znajdziesz go w katalogu."
      demo={<CoachDemo />}
    >
      <More href="https://app.leniwakluska.pl">Jesteś trenerem? Otwórz panel</More>
    </Chapter>
  );
}
