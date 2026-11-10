import { useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { ArrowRight, Check, Flame, Square, Volume2 } from 'lucide-react';
import { reveal } from '../lib/reveal';
import { CheckinScreen, DietScreen, RestTimer, RosterScreen, RunScreen, ScanScreen, SyncScreen, WorkoutScreen } from './AppScreens';

/* The five parts of the app. Each one is composed differently on purpose — a band, a full-bleed
   photograph, an overlap, a triptych, a split — so the page never repeats the same block twice. */

const tone = (value: string) => ({ '--tone': value }) as CSSProperties;

type Feature = { title: string; body: ReactNode };

function Features({ items, className = '' }: { items: Feature[]; className?: string }) {
  return (
    <dl className={`border-t border-rule-strong ${className}`}>
      {items.map((f) => (
        <div key={f.title} className="border-b border-rule py-5">
          <dt className="font-display text-[1.625rem] font-bold uppercase leading-[1.05]">{f.title}</dt>
          <dd className="mt-1.5 max-w-[34rem] leading-relaxed text-ink-2">{f.body}</dd>
        </div>
      ))}
    </dl>
  );
}

/* A photograph uncovered once, when it scrolls into view. */
function Photo({
  src,
  alt,
  width,
  height,
  position = '50% 50%',
  className = '',
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  position?: string;
  className?: string;
}) {
  return (
    <figure {...reveal(0, 'curtain')} className={`overflow-hidden bg-shade ${className}`}>
      <div className="cur size-full">
        <img
          src={src}
          alt={alt}
          width={width}
          height={height}
          loading="lazy"
          style={{ objectPosition: position }}
          className="block size-full object-cover"
        />
      </div>
    </figure>
  );
}

function RonnieButton() {
  const [playing, setPlaying] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);

  const toggle = () => {
    if (!audio.current) {
      audio.current = new Audio('/ronnie_lightweight-baby.mp3');
      audio.current.onended = () => setPlaying(false);
    }
    if (playing) {
      audio.current.pause();
      audio.current.currentTime = 0;
      setPlaying(false);
      return;
    }
    audio.current
      .play()
      .then(() => setPlaying(true))
      .catch(() => setPlaying(false));
  };

  return (
    <button type="button" onClick={toggle} aria-pressed={playing} className="btn btn-ghost btn-sm mt-3">
      {playing ? <Square className="size-3.5 text-accent" aria-hidden /> : <Volume2 className="size-4" aria-hidden />}
      {playing ? 'Zatrzymaj' : 'Odtwórz „Lightweight baby!”'}
    </button>
  );
}

/* ---------------------------------------------------------------- Trening
   a wide band of chalk and steel with the claim set over it, then the diary itself */

export function TrainingStage() {
  return (
    <section id="trening" aria-labelledby="trening-title" style={tone('var(--color-accent)')}>
      <div className="relative isolate">
        <Photo
          src="/images/grip-chalk.webp"
          alt="Dłoń w magnezji zaciśnięta na gryfie tuż przed martwym ciągiem"
          width={1600}
          height={1067}
          position="50% 42%"
          className="h-[70svh] max-h-[46rem] min-h-[24rem]"
        />
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-linear-to-t from-paper via-paper/25 to-transparent" />
        <div className="shell absolute inset-x-0 bottom-0 pb-2">
          <h2 id="trening-title" className="display text-[clamp(3.75rem,13.5vw,11.5rem)]">
            <span className="max-sm:block">Zapisz. </span>
            <span className="text-accent max-sm:block">Pobij. </span>
            <span className="max-sm:block">Powtórz.</span>
          </h2>
        </div>
      </div>

      <div className="shell pb-20 pt-8 sm:pb-28 sm:pt-12">
        <div className="grid grid-cols-[minmax(0,1fr)] gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-20">
          <div>
            <p className="lede max-w-[34rem] !text-ink">
              Dziennik siłowy, który pamięta, ile podniosłeś tydzień temu — i nie przeszkadza w ciężkiej serii.
            </p>
            <Features
              className="mt-9"
              items={[
                {
                  title: 'Zawsze wiesz, co pobić.',
                  body: 'Wynik sprzed tygodnia widzisz przy każdej serii, a aplikacja podpowiada kolejny krok.',
                },
                {
                  title: 'Przerwa startuje sama.',
                  body: 'Po każdej serii liczy się przerwa, a ekran nie gaśnie w trakcie ćwiczenia. Stoper obok działa — naciśnij play.',
                },
                {
                  title: 'Działa w piwnicy.',
                  body: 'Każda seria zapisuje się na telefonie i synchronizuje w tle, gdy tylko wrócisz do sieci. Nic nie ginie.',
                },
                {
                  title: 'Bez odblokowywania.',
                  body: 'Przerwa i bieżące ćwiczenie na ekranie blokady. Na Androidzie.',
                },
                {
                  title: 'Twoja muzyka. I Ronnie.',
                  body: (
                    <>
                      Sterujesz Spotify bez wychodzenia z dziennika, a przed ciężkim podejściem jeden przycisk odpala kultowy okrzyk.
                      <br />
                      <RonnieButton />
                    </>
                  ),
                },
              ]}
            />
          </div>

          <div
            {...reveal(0, 'live')}
            className="grid grid-cols-[minmax(0,1fr)] content-start gap-4 lg:sticky lg:top-[calc(var(--header-h)+1.5rem)] lg:self-start"
          >
            <WorkoutScreen />
            <div className="sm:ml-16">
              <RestTimer />
            </div>
            <div className="sm:mr-16">
              <SyncScreen />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* --------------------------------------------------------------- Bieganie
   the whole section is the road at dusk; the run sits on it */

export function RunningStage() {
  return (
    <section id="bieganie" aria-labelledby="bieganie-title" style={tone('var(--color-run)')} className="relative isolate overflow-clip">
      <div className="max-lg:relative lg:absolute lg:inset-0 lg:-z-10">
        <Photo
          src="/images/runners-dusk.webp"
          alt="Troje biegaczy na drodze o zmierzchu, pod światło"
          width={1800}
          height={1200}
          position="50% 45%"
          className="h-[56svh] min-h-[20rem] lg:h-full"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-linear-to-t from-paper via-transparent to-transparent lg:bg-linear-to-r lg:from-paper lg:via-paper/80 lg:to-paper/10"
        />
      </div>

      <div className="shell pb-20 max-lg:-mt-16 max-lg:relative sm:pb-28 lg:py-36">
        <div className="grid grid-cols-[minmax(0,1fr)] items-end gap-12 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:gap-24">
          <div>
            <h2 id="bieganie-title" className="h-section">
              W dni bez sztangi — <span className="text-run-ink">trasa.</span>
            </h2>
            <p className="lede mt-6 max-w-[32rem] !text-ink">GPS, tempo na każdym kilometrze i Strava. Bez osobnej aplikacji do biegania.</p>
            <Features
              className="mt-9"
              items={[
                {
                  title: 'Trasa, tempo, przewyższenia.',
                  body: 'Wbudowany rejestrator zapisuje trasę, tempo na każdym kilometrze i przewyższenia.',
                },
                {
                  title: 'Strava dostaje resztę.',
                  body: 'Łączysz konto jednym kliknięciem. Po „Zakończ bieg” aktywność z mapą, tempem i kadencją trafia na Strava sama.',
                },
                {
                  title: 'Tempo podane głosem.',
                  body: 'Split podawany głosem co kilometr. Po biegu widzisz tempo na każdym odcinku.',
                },
                {
                  title: 'Bieg i siłownia razem.',
                  body: 'Tygodniowe podsumowanie łączy tonaż z siłowni z kilometrami z biegania.',
                },
              ]}
            />
          </div>

          <div {...reveal(0, 'live')} className="grid grid-cols-[minmax(0,1fr)] gap-4">
            <RunScreen />
            <div className="screen grid grid-cols-2 divide-x divide-rule">
              {[
                ['Tonaż · przykładowy tydzień', '8,4', 't'],
                ['Kilometry', '21,3', 'km'],
              ].map(([k, v, u]) => (
                <div key={k} className="px-4 py-4">
                  <p className="label text-ink-2">{k}</p>
                  <p className="big mt-1.5 text-5xl">
                    {v}
                    <span className="ml-1 font-sans text-sm font-semibold text-ink-2">{u}</span>
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ Dieta
   the plate on the left with the scanner laid over its corner */

export function NutritionStage() {
  return (
    <section id="dieta" aria-labelledby="dieta-title" style={tone('var(--color-food)')} className="section">
      <div className="shell grid grid-cols-[minmax(0,1fr)] gap-14 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-24">
        <div className="relative pb-24 sm:pb-28 lg:self-start">
          <Photo
            src="/images/meal-plate.webp"
            alt="Talerz z jajkiem, warzywami i awokado na drewnianym stole"
            width={1600}
            height={1089}
            className="aspect-[5/6] sm:aspect-[4/3] lg:aspect-[4/5]"
          />
          <div {...reveal(0, 'live')} className="absolute bottom-0 right-0 w-[min(100%,21rem)] sm:-right-6 lg:-right-14">
            <ScanScreen />
          </div>
        </div>

        <div>
          <h2 id="dieta-title" className="h-section">
            Forma zaczyna się <span className="text-food">w kuchni.</span>
          </h2>
          <p className="lede mt-6 max-w-[34rem]">
            Dziennik posiłków z makro, skaner kodów i plan od trenera — w tym samym miejscu, w którym zapisujesz trening.
          </p>
          <div {...reveal(0, 'live')} className="mt-9">
            <DietScreen />
          </div>
          <Features
            className="mt-9"
            items={[
              {
                title: 'Białko, węgle, tłuszcze.',
                body: 'Dzienne podsumowanie kalorii i makro. Od razu widać, czego jeszcze brakuje do celu.',
              },
              {
                title: 'Skanujesz, nie przepisujesz.',
                body: 'Kod kreskowy z opakowania i makro z bazy Open Food Facts. Gdy skan nie łapie, wpisujesz kod ręcznie.',
              },
              {
                title: 'Dieta od trenera.',
                body: 'Realizujesz plan diety od trenera albo prowadzisz własny.',
              },
            ]}
          />
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------- Nawyki */

const goals = [
  {
    label: 'Trening',
    hint: 'zrobiony',
    progress: 1,
    tone: 'var(--color-accent)',
  },
  {
    label: 'Kalorie',
    hint: '2 450 / 2 750 kcal',
    progress: 0.89,
    tone: 'var(--color-food)',
  },
  {
    label: 'Białko',
    hint: '148 / 180 g',
    progress: 0.82,
    tone: 'var(--color-run)',
  },
  {
    label: 'Nawyki',
    hint: '3 / 4 odhaczone',
    progress: 0.75,
    tone: 'var(--color-volt)',
  },
];

const RING = 2 * Math.PI * 16.25;

/* "Cele dnia" as the app draws it: a ring that fills through the day, then a tick. */
function GoalsScreen() {
  return (
    <div className="screen pb-1">
      <div className="flex items-baseline justify-between gap-3 px-4 pt-3.5">
        <p className="text-[15px] font-semibold">Cele dnia</p>
        <p className="num text-sm text-ink-2">1/4 · 3 cele do końca dnia</p>
      </div>
      <ul className="mt-2 px-1">
        {goals.map((g, n) => (
          <li key={g.label} className="flex items-center gap-3 border-t border-rule/60 px-3 py-2.5 first:border-t-0">
            {g.progress >= 1 ? (
              <span className="pop grid size-9 shrink-0 place-items-center rounded-full bg-accent text-on-accent" aria-hidden>
                <Check className="size-[18px]" strokeWidth={3.5} />
              </span>
            ) : (
              <svg width="36" height="36" viewBox="0 0 36 36" className="shrink-0 -rotate-90" aria-hidden>
                <circle cx="18" cy="18" r="16.25" fill="none" strokeWidth="3.5" stroke="var(--color-screen-2)" />
                <circle
                  cx="18"
                  cy="18"
                  r="16.25"
                  fill="none"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke={g.tone}
                  strokeDasharray={RING}
                  strokeDashoffset={RING * (1 - g.progress)}
                  className="ring-arc"
                  style={
                    {
                      '--ring-len': RING,
                      '--ring-to': RING * (1 - g.progress),
                      '--i': n,
                    } as CSSProperties
                  }
                />
              </svg>
            )}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-semibold leading-tight">{g.label}</span>
              <span className="num block truncate text-xs text-ink-2">{g.hint}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const weekDays = [
  { label: 'pon', day: 9, state: 'done' },
  { label: 'wt', day: 10, state: 'done' },
  { label: 'śr', day: 11, state: 'rest' },
  { label: 'czw', day: 12, state: 'done' },
  { label: 'pt', day: 13, state: 'today' },
  { label: 'sob', day: 14, state: 'planned' },
  { label: 'nd', day: 15, state: 'rest' },
] as const;

const dayClass = {
  done: 'bg-accent text-on-accent',
  today: 'bg-ink text-paper',
  planned: 'text-ink ring-[1.5px] ring-inset ring-accent',
  rest: 'text-ink-2',
};

/* The week as seven dates — filled once trained, ringed when planned. */
function WeekScreen() {
  return (
    <div className="screen px-3 py-4 sm:px-4">
      <div className="grid grid-cols-7">
        {weekDays.map((d) => (
          <div key={d.label} className="flex flex-col items-center gap-1.5">
            <span className={`text-xs font-medium ${d.state === 'today' ? 'text-ink' : 'text-ink-2'}`}>{d.label}</span>
            <span className={`big grid size-9 place-items-center rounded-full text-xl sm:size-10 ${dayClass[d.state]}`}>{d.day}</span>
          </div>
        ))}
      </div>
      <p className="mt-3 flex items-center justify-between gap-3 px-1 text-[13px] text-ink-2">
        <span>
          W tym tygodniu <span className="num font-semibold text-ink">3/4</span>
        </span>
        <span className="flex items-center gap-1">
          <Flame className="size-4 text-accent" aria-hidden />
          <span className="num font-semibold text-ink">5</span> dni serii
        </span>
      </p>
    </div>
  );
}

/* a triptych on a lighter band: what you do, what the day looks like, where it leads */
export function HabitsStage() {
  return (
    <section id="nawyki" aria-labelledby="nawyki-title" style={tone('var(--color-volt)')} className="section bg-paper-2">
      <div className="shell">
        <h2 id="nawyki-title" className="display text-[clamp(3.25rem,11.5vw,10rem)]">
          Małe rzeczy. <span className="text-volt">Codziennie.</span>
        </h2>

        <div className="mt-10 grid grid-cols-[minmax(0,1fr)] gap-10 sm:mt-14 md:grid-cols-2 lg:grid-cols-3 lg:gap-12">
          <div>
            <p className="lede !text-ink">Woda, sen, kreatyna — codzienne cele obok treningu, odhaczane jednym dotknięciem.</p>
            <Features
              className="mt-8"
              items={[
                {
                  title: 'Cele dnia na jednej liście.',
                  body: 'Trening, kalorie, białko i nawyki. Pierścień wypełnia się w ciągu dnia, a zrobiony cel dostaje ptaszka.',
                },
                {
                  title: 'Seria, której szkoda przerwać.',
                  body: 'Punkty XP za treningi, odznaki za rekordy i licznik dni z rzędu.',
                },
                {
                  title: 'Tydzień na jednym pasku.',
                  body: 'Siedem dat: wypełniona po treningu, w obwódce, gdy trening dopiero jest w planie.',
                },
              ]}
            />
          </div>

          <div {...reveal(0, 'live')} className="grid grid-cols-[minmax(0,1fr)] content-start gap-4">
            <GoalsScreen />
            <WeekScreen />
          </div>

          <Photo
            src="/images/stairs-steps.webp"
            alt="Biegaczka w pomarańczowych butach wchodząca po betonowych schodach"
            width={1600}
            height={1067}
            position="60% 50%"
            className="aspect-[16/10] md:col-span-2 lg:col-span-1 lg:aspect-auto lg:h-full lg:min-h-[30rem]"
          />
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------- Trener
   a split: the coach on the floor with the roster over the photo, the argument beside it */

export function CoachStage() {
  return (
    <section id="trenerzy" aria-labelledby="trenerzy-title" style={tone('var(--color-social)')} className="section">
      <div className="shell grid grid-cols-[minmax(0,1fr)] gap-14 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:gap-24">
        <div className="lg:order-2">
          <h2 id="trenerzy-title" className="h-section">
            Trener widzi <span className="text-social">wszystko.</span>
          </h2>
          <p className="lede mt-6 max-w-[34rem]">
            Prowadzisz podopiecznych? Panel trenera pokazuje, kto trenuje, kto odpuszcza i czyj check-in czeka na odpowiedź. Bez arkuszy i zrzutów
            ekranu.
          </p>
          <Features
            className="mt-9"
            items={[
              {
                title: 'Rozpisujesz raz.',
                body: 'Rozpisujesz plan raz — podopieczny widzi go od razu w swoim dzienniku.',
              },
              {
                title: 'Każda seria trafia do Ciebie.',
                body: 'Wyniki widzisz po zakończeniu treningu — bez proszenia podopiecznego o zrzut ekranu.',
              },
              {
                title: 'Raport w dwie minuty.',
                body: 'Waga, obwody, samopoczucie i zdjęcia sylwetki w jednym miejscu, a odpowiedź trenera od razu w aplikacji.',
              },
              {
                title: 'Jeden czat zamiast pięciu.',
                body: 'Wiadomości z powiadomieniami push, bez gubienia ich między Instagramem a WhatsAppem.',
              },
            ]}
          />
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
            <a href="https://app.leniwakluska.pl" className="btn btn-primary">
              Przejdź do panelu trenera
              <ArrowRight className="nudge size-4" aria-hidden />
            </a>
            <a href="https://app.leniwakluska.pl" className="link text-sm">
              Mam kod od trenera
            </a>
          </div>
        </div>

        <div className="lg:order-1">
          <Photo
            src="/images/coach-floor.webp"
            alt="Trenerka asekuruje podopieczną podczas brzuszków na macie"
            width={1600}
            height={1104}
            position="50% 45%"
            className="aspect-[16/11]"
          />
          <div className="relative -mt-12 grid grid-cols-[minmax(0,1fr)] gap-4 px-3 sm:px-8">
            <div role="group" aria-label="Podgląd panelu trenera: lista podopiecznych">
              <RosterScreen />
            </div>
            <CheckinScreen />
            <div className="screen space-y-2 p-3 text-sm">
              <p className="max-w-[85%] rounded-[var(--radius-ui)] bg-screen-2 px-3.5 py-2.5">Jak plecy po wczorajszym martwym?</p>
              <p className="ml-auto max-w-[85%] rounded-[var(--radius-ui)] bg-accent px-3.5 py-2.5 font-medium text-on-accent">
                Lepiej. Dziś robię lżejsze serie.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
