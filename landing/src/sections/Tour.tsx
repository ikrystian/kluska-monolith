import type { ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';
import { reveal } from '../lib/reveal';
import { useScrub } from '../lib/motion';
import { CATEGORIES, byCat, type CategoryId } from './features';
import { CoachDemo, CrewDemo, FoodDemo, TodayDemo, ProgressDemo, RunDemo, WorkoutDemo } from './demos';
import { Device, vars } from './ui';

type Shot = [file: string, alt: string];
type Photo = { src: string; alt: string; width: number; height: number; position?: string };

/* One chapter of the tour: a photograph with the claim set over it, the screen playing its scene
   next to the six features that matter most, then real screenshots of that part of the app. */
function Chapter({
  id,
  hash,
  title,
  lede,
  demo,
  photo,
  shots,
  flip = false,
  band = false,
  children,
}: {
  id: CategoryId;
  hash: string;
  title: ReactNode;
  lede: string;
  demo: ReactNode;
  photo: Photo;
  shots: Shot[];
  flip?: boolean;
  band?: boolean;
  children?: ReactNode;
}) {
  const cat = CATEGORIES.find((c) => c.id === id)!;
  const all = byCat(id);
  const items = all.slice(0, 6);
  const photoRef = useScrub<HTMLDivElement>();
  const stripRef = useScrub<HTMLDivElement>();

  return (
    <section id={id} aria-labelledby={`${id}-title`} className={`relative isolate overflow-clip ${band ? 'bg-paper-2' : ''}`} style={vars({ '--tone': cat.tone })}>
      <div ref={photoRef} className="relative isolate h-[68svh] max-h-[44rem] min-h-[26rem] overflow-hidden bg-shade">
        <img
          src={photo.src}
          alt={photo.alt}
          width={photo.width}
          height={photo.height}
          loading="lazy"
          style={{ objectPosition: photo.position ?? '50% 50%' }}
          className="band-photo block size-full object-cover"
        />
        <div aria-hidden className={`absolute inset-0 bg-linear-to-t ${band ? 'from-paper-2 via-paper-2/45' : 'from-paper via-paper/45'} to-transparent`} />
        <div className="shell absolute inset-x-0 bottom-0 pb-3">
          <p className="hash font-display text-2xl font-extrabold uppercase leading-none tracking-[0.01em] sm:text-[1.75rem]">{hash}</p>
          <h2 id={`${id}-title`} className="display mt-2 text-[clamp(3.25rem,11vw,9.5rem)]">
            {title}
          </h2>
        </div>
      </div>

      <div className="shell grid grid-cols-[minmax(0,1fr)] items-center gap-x-16 gap-y-12 pb-16 pt-10 sm:pb-24 sm:pt-14 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <div className={flip ? 'lg:order-2' : ''}>
          <p className="lede max-w-[36rem] !text-ink">{lede}</p>

          <ul className="chapter-list mt-9 border-t border-rule-strong">
            {items.map((x, n) => (
              <li key={x.title} {...reveal(n % 2, 'row')} className="border-b border-rule py-5">
                <h3 className="font-display text-[1.625rem] font-bold uppercase leading-[1.05]">{x.title}</h3>
                <p className="mt-1.5 leading-relaxed text-ink-2">{x.body}</p>
              </li>
            ))}
          </ul>

          <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-4">
            {all.length > items.length && (
              <a href="#funkcje" className="link">
                Jeszcze {all.length - items.length} w dziale {cat.label}
                <ArrowRight className="size-4" aria-hidden />
              </a>
            )}
            {children}
          </div>
        </div>

        <div className={`relative ${flip ? 'lg:order-1' : ''}`}>
          <div aria-hidden className="bloom absolute -inset-x-16 -inset-y-10 -z-10" />
          <div {...reveal(0, 'screen')} className="mx-auto w-full max-w-[22.5rem]">
            {demo}
          </div>
        </div>
      </div>

      <div ref={stripRef} className="shell pb-20 sm:pb-28">
        <p className="label text-ink-2">Prosto z aplikacji</p>
        <div className="mt-5 grid grid-cols-[repeat(2,minmax(0,1fr))] items-start gap-3 sm:grid-cols-[repeat(3,minmax(0,1fr))] sm:gap-6 lg:gap-10">
          {shots.map(([file, alt], n) => (
            <div key={file} className={`lag ${n === 2 ? 'max-sm:hidden' : ''} ${n === 1 ? 'mt-10 sm:mt-16' : ''}`} style={vars({ '--sy': `${[40, 110, 70][n]}px` })}>
              <div {...reveal(n, 'screen')}>
                <Device shot={file} alt={alt} className="mx-auto max-w-[16.875rem]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const More = ({ href, children }: { href: string; children: ReactNode }) => (
  <a href={href} className="link">
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
      photo={{ src: '/images/grip-chalk.webp', alt: 'Dłoń w magnezji zaciśnięta na gryfie tuż przed martwym ciągiem', width: 1600, height: 1067, position: '50% 42%' }}
      shots={[
        ['workouts', 'Ekran szablonów treningowych z okładkami i filtrem partii mięśni'],
        ['workout-detail', 'Szczegóły treningu Full Body A z listą ćwiczeń'],
        ['history-detail', 'Podsumowanie ukończonego treningu: tonaż, czas i zaangażowane partie'],
      ]}
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
      photo={{ src: '/images/runners-dusk.webp', alt: 'Troje biegaczy na tle nieba o zmierzchu', width: 1800, height: 1200, position: '50% 60%' }}
      shots={[
        ['running', 'Ekran biegania: kilometry w tygodniu i programy od trenera'],
        ['running-detail', 'Szczegóły biegu z rozkładem tempa w strefach'],
        ['running-record', 'Start szybkiego biegu na mapie'],
      ]}
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
      photo={{ src: '/images/meal-plate.webp', alt: 'Talerz z jajkiem, awokado i warzywami na drewnianym stole', width: 1600, height: 1089, position: '50% 40%' }}
      shots={[
        ['nutrition', 'Dziennik kalorii z posiłkami dnia i makroskładnikami'],
        ['diet', 'Ekran diety z dzienniczkiem, przepisami i artykułami'],
        ['knowledge-zone-article', 'Artykuł o diecie wysokobiałkowej w Strefie wiedzy'],
      ]}
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
      demo={<TodayDemo />}
      photo={{ src: '/images/stairs-steps.webp', alt: 'Stopy w butach biegowych na betonowych schodach', width: 1600, height: 1067, position: '50% 55%' }}
      shots={[
        ['habits', 'Nawyki z tygodniową siatką odhaczonych dni'],
        ['calendar', 'Kalendarz z zaplanowanymi treningami'],
        ['menu', 'Menu aplikacji z wyszukiwarką i szybkim dostępem'],
      ]}
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
      photo={{ src: '/images/plates-floor.webp', alt: 'Sztanga z talerzami leżąca na podłodze siłowni', width: 1600, height: 1067, position: '50% 60%' }}
      shots={[
        ['goals', 'Cele i trofea: poziom, cele liczone automatycznie i wyzwania tygodnia'],
        ['measurements', 'Pomiary: aktualna waga i obwody ciała'],
        ['you', 'Profil z poziomem, serią dni i podsumowaniem miesiąca'],
      ]}
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
      photo={{ src: '/images/gym-hall.webp', alt: 'Hala siłowni z rzędami sprzętu', width: 2400, height: 1600, position: '50% 55%' }}
      shots={[
        ['social-feed', 'Tablica znajomych: bieg ze Stravy i osiągnięty cel 100 km'],
        ['challenge-detail', 'Wyścig biegowy do 50 km na żywo: Ty 41 km, rywalka 37 km'],
        ['challenges', 'Lista wyzwań: zaproszenie na 30 km i trwający wyścig'],
      ]}
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
      photo={{ src: '/images/coach-floor.webp', alt: 'Trenerka i podopieczna rozmawiają na macie w sali treningowej', width: 1600, height: 1104, position: '50% 35%' }}
      shots={[
        ['trainers', 'Katalog trenerów ze specjalizacjami i przyciskiem Napisz'],
        ['chat', 'Czat z polecanym trenerem i pytaniami na start'],
        ['workout-plans', 'Ekran programu od trenera'],
      ]}
    >
      <More href="https://app.leniwakluska.pl">Jesteś trenerem? Otwórz panel</More>
    </Chapter>
  );
}
