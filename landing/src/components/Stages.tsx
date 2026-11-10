import { useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { ArrowRight, Check, Flame, Square, Volume2 } from 'lucide-react';
import { reveal } from '../lib/reveal';
import { FULL_KG, STAGES, totalAfter } from '../lib/stages';
import {
  CheckinScreen,
  DietScreen,
  RestTimer,
  RosterScreen,
  RunScreen,
  ScanScreen,
  SyncScreen,
  WorkoutScreen,
} from './AppScreens';

const tone = (value: string) => ({ '--tone': value }) as CSSProperties;

const PLATE_H: Record<number, string> = { 25: 'h-16', 20: 'h-16', 15: 'h-[3.25rem]', 10: 'h-10' };

/* The divider between stages: the bar so far. Plates earned up to this stage slide onto the
   sleeve, the shaft runs across the page and the running total closes the line. */
function StageRule({ index }: { index: number }) {
  const stage = STAGES[index];
  const total = totalAfter(index + 1);
  const onBar = STAGES.slice(0, index + 1);

  return (
    <div>
      <div className="flex items-center" aria-hidden>
        <span className="h-2 w-6 rounded-l-[3px] bg-steel/70 sm:w-10" />
        <span className="flex items-center gap-[3px]">
          {[...onBar].reverse().map((s, i) => (
            <span
              {...reveal(onBar.length - i, 'plate')}
              key={s.id}
              className={`plate ${PLATE_H[s.kg]} ${s.id === stage.id ? '' : 'opacity-45'}`}
              style={{ ...tone(s.tone), '--i': onBar.length - i } as CSSProperties}
            />
          ))}
        </span>
        <span className="ml-[3px] h-7 w-1.5 rounded-[2px] bg-steel" />
        <span className="h-[3px] min-w-6 flex-1 bg-steel/40" />
        <span className="big pl-4 text-[clamp(2.5rem,5vw,4rem)]">
          {total}
          <span className="ml-1 font-sans text-sm font-semibold text-ink-2">kg</span>
        </span>
      </div>
      <p className="label mt-4 text-[var(--tone)]">
        Talerz {stage.kg} kg · {stage.label}
        {total === FULL_KG && <span className="text-volt"> · sztanga pełna. Lightweight, baby!</span>}
      </p>
    </div>
  );
}

type Feature = { title: string; body: ReactNode };

function Stage({
  index,
  id,
  toneValue,
  title,
  lede,
  features,
  actions,
  flip = false,
  band = false,
  children,
}: {
  index?: number;
  id: string;
  toneValue: string;
  title: string;
  lede: string;
  features: Feature[];
  actions?: ReactNode;
  flip?: boolean;
  band?: boolean;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} style={tone(toneValue)} className={`section ${band ? 'bg-paper-2' : ''}`}>
      <div className="shell">
        {index !== undefined && <StageRule index={index} />}

        <div className="mt-8 grid grid-cols-[minmax(0,1fr)] items-start gap-12 lg:grid-cols-2 lg:gap-20">
          <div className={flip ? 'lg:order-2' : ''}>
            <h2 {...reveal(0)} id={`${id}-title`} className="h-section">
              {title}
            </h2>
            <p {...reveal(1)} className="lede mt-6 max-w-[34rem]">
              {lede}
            </p>

            <dl className="mt-10 border-t border-rule">
              {features.map((f) => (
                <div key={f.title} className="grid grid-cols-[minmax(0,1fr)] gap-1.5 border-b border-rule py-5 sm:grid-cols-[13rem_minmax(0,1fr)] sm:gap-6">
                  <dt className="font-semibold leading-snug">{f.title}</dt>
                  <dd className="leading-relaxed text-ink-2">{f.body}</dd>
                </div>
              ))}
            </dl>

            {actions && <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">{actions}</div>}
          </div>

          <div
            {...reveal(1)}
            className={`stage-proof p-4 sm:p-8 lg:sticky lg:top-[calc(var(--header-h)+1.5rem)] ${band ? '!bg-paper' : ''}`}
          >
            <div aria-hidden className="knurl absolute inset-0 -z-10" />
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}

/* A real photo on top of the proof panel; the screens below overlap its bottom edge. */
function Still({ src, alt, width, height, position = '50% 50%' }: { src: string; alt: string; width: number; height: number; position?: string }) {
  return (
    <figure className="overflow-hidden rounded-[20px]">
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading="lazy"
        style={{ objectPosition: position }}
        className="block aspect-[16/10] w-full object-cover"
      />
    </figure>
  );
}

/* Screens that sit over the bottom of a Still. */
function OverStill({ children }: { children: ReactNode }) {
  return <div className="relative -mt-14 sm:mx-6">{children}</div>;
}

/* the two staggered screens of a proof panel */
function Stagger({ children }: { children: [ReactNode, ReactNode, ...ReactNode[]] }) {
  const [first, second, ...rest] = children;
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <div className="sm:mr-14">{first}</div>
      <div className="sm:-mt-2 sm:ml-14">{second}</div>
      {rest.map((r, i) => (
        <div key={i} className={i % 2 === 0 ? 'sm:mr-14' : 'sm:ml-14'}>
          {r}
        </div>
      ))}
    </div>
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

/* ---------------------------------------------------------------- Trening */

export function TrainingStage() {
  return (
    <Stage
      index={0}
      id="trening"
      toneValue={STAGES[0].tone}
      title="Zapisz. Pobij. Powtórz."
      lede="Dziennik siłowy, który pamięta, ile podniosłeś tydzień temu — i nie przeszkadza w ciężkiej serii."
      features={[
        { title: 'Zawsze wiesz, co pobić.', body: 'Wynik sprzed tygodnia widzisz przy każdej serii, a aplikacja podpowiada kolejny krok.' },
        {
          title: 'Przerwa startuje sama.',
          body: 'Po każdej serii liczy się przerwa, a ekran nie gaśnie w trakcie ćwiczenia. Stoper obok działa — naciśnij play.',
        },
        {
          title: 'Działa w piwnicy.',
          body: 'Każda seria zapisuje się na telefonie i synchronizuje w tle, gdy tylko wrócisz do sieci. Nic nie ginie.',
        },
        { title: 'Bez odblokowywania.', body: 'Przerwa i bieżące ćwiczenie na ekranie blokady. Na Androidzie.' },
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
    >
      <Still src="/images/grip-chalk.webp" alt="Dłoń w magnezji zaciśnięta na gryfie tuż przed martwym ciągiem" width={1600} height={1067} position="50% 40%" />
      <OverStill>
        <Stagger>
          <WorkoutScreen />
          <RestTimer />
          <SyncScreen />
        </Stagger>
      </OverStill>
    </Stage>
  );
}

/* --------------------------------------------------------------- Bieganie */

export function RunningStage() {
  return (
    <Stage
      index={1}
      id="bieganie"
      toneValue={STAGES[1].tone}
      flip
      title="W dni bez sztangi — trasa."
      lede="GPS, tempo na każdym kilometrze i Strava. Bez osobnej aplikacji do biegania."
      features={[
        { title: 'Trasa, tempo, przewyższenia.', body: 'Wbudowany rejestrator zapisuje trasę, tempo na każdym kilometrze i przewyższenia.' },
        {
          title: 'Strava dostaje resztę.',
          body: 'Łączysz konto jednym kliknięciem. Po „Zakończ bieg” aktywność z mapą, tempem i kadencją trafia na Strava sama.',
        },
        { title: 'Tempo podane głosem.', body: 'Split podawany głosem co kilometr. Po biegu widzisz tempo na każdym odcinku.' },
        { title: 'Bieg i siłownia razem.', body: 'Tygodniowe podsumowanie łączy tonaż z siłowni z kilometrami z biegania.' },
      ]}
    >
      <Still src="/images/runners-dusk.webp" alt="Troje biegaczy na drodze o zmierzchu, pod światło" width={1800} height={1200} position="50% 45%" />
      <OverStill>
        <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
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
      </OverStill>
    </Stage>
  );
}

/* ------------------------------------------------------------------ Dieta */

export function NutritionStage() {
  return (
    <Stage
      index={2}
      id="dieta"
      toneValue={STAGES[2].tone}
      title="Forma zaczyna się w kuchni."
      lede="Dziennik posiłków z makro, skaner kodów i plan od trenera — w tym samym miejscu, w którym zapisujesz trening."
      features={[
        { title: 'Białko, węgle, tłuszcze.', body: 'Dzienne podsumowanie kalorii i makro. Od razu widać, czego jeszcze brakuje do celu.' },
        {
          title: 'Skanujesz, nie przepisujesz.',
          body: 'Kod kreskowy z opakowania i makro z bazy Open Food Facts. Gdy skan nie łapie, wpisujesz kod ręcznie.',
        },
        { title: 'Dieta od trenera.', body: 'Realizujesz plan diety od trenera albo prowadzisz własny.' },
      ]}
    >
      <Still src="/images/meal-plate.webp" alt="Talerz z jajkiem, warzywami i awokado na drewnianym stole" width={1600} height={1089} position="50% 50%" />
      <OverStill>
        <Stagger>
          <DietScreen />
          <ScanScreen />
        </Stagger>
      </OverStill>
    </Stage>
  );
}

/* ----------------------------------------------------------------- Nawyki */

const goals = [
  { label: 'Trening', hint: 'zrobiony', progress: 1, tone: 'var(--color-accent)' },
  { label: 'Kalorie', hint: '2 450 / 2 750 kcal', progress: 0.89, tone: 'var(--color-food)' },
  { label: 'Białko', hint: '148 / 180 g', progress: 0.82, tone: 'var(--color-run)' },
  { label: 'Nawyki', hint: '3 / 4 odhaczone', progress: 0.75, tone: 'var(--color-volt)' },
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
        {goals.map((g) => (
          <li key={g.label} className="flex items-center gap-3 border-t border-rule/60 px-3 py-2.5 first:border-t-0">
            {g.progress >= 1 ? (
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent text-on-accent" aria-hidden>
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

export function HabitsStage() {
  return (
    <Stage
      index={3}
      id="nawyki"
      toneValue={STAGES[3].tone}
      flip
      title="Małe rzeczy. Codziennie."
      lede="Woda, sen, kreatyna — codzienne cele obok treningu, odhaczane jednym dotknięciem."
      features={[
        {
          title: 'Cele dnia na jednej liście.',
          body: 'Trening, kalorie, białko i nawyki. Pierścień wypełnia się w ciągu dnia, a zrobiony cel dostaje ptaszka.',
        },
        { title: 'Seria, której szkoda przerwać.', body: 'Punkty XP za treningi, odznaki za rekordy i licznik dni z rzędu.' },
        { title: 'Tydzień na jednym pasku.', body: 'Siedem dat: wypełniona po treningu, w obwódce, gdy trening dopiero jest w planie.' },
      ]}
    >
      <Still src="/images/stairs-steps.webp" alt="Biegaczka w pomarańczowych butach wchodząca po betonowych schodach" width={1600} height={1067} position="50% 50%" />
      <OverStill>
        <Stagger>
          <GoalsScreen />
          <WeekScreen />
        </Stagger>
      </OverStill>
    </Stage>
  );
}

/* ----------------------------------------------------------------- Trener */

export function CoachStage() {
  return (
    <Stage
      id="trenerzy"
      toneValue="var(--color-social)"
      band
      title="Trener widzi wszystko."
      lede="Prowadzisz podopiecznych? Panel trenera pokazuje, kto trenuje, kto odpuszcza i czyj check-in czeka na odpowiedź. Bez arkuszy i zrzutów ekranu."
      features={[
        { title: 'Rozpisujesz raz.', body: 'Rozpisujesz plan raz — podopieczny widzi go od razu w swoim dzienniku.' },
        { title: 'Każda seria trafia do Ciebie.', body: 'Wyniki widzisz po zakończeniu treningu — bez proszenia podopiecznego o zrzut ekranu.' },
        {
          title: 'Raport w dwie minuty.',
          body: 'Waga, obwody, samopoczucie i zdjęcia sylwetki w jednym miejscu, a odpowiedź trenera od razu w aplikacji.',
        },
        { title: 'Jeden czat zamiast pięciu.', body: 'Wiadomości z powiadomieniami push, bez gubienia ich między Instagramem a WhatsAppem.' },
      ]}
      actions={
        <>
          <a href="/login" className="btn btn-primary">
            Przejdź do panelu trenera
            <ArrowRight className="nudge size-4" aria-hidden />
          </a>
          <a href="/athlete/login" className="link text-sm">
            Mam kod od trenera
          </a>
        </>
      }
    >
      <Still src="/images/coach-floor.webp" alt="Trenerka asekuruje podopieczną podczas brzuszków na macie" width={1600} height={1104} position="50% 45%" />
      <OverStill>
      <Stagger>
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
      </Stagger>
      </OverStill>
    </Stage>
  );
}
