import { useRef, useState, type ReactNode } from 'react';
import { ArrowRight, Check, Square, Volume2 } from 'lucide-react';
import { CardRail, RailCard } from './CardRail';
import { Chapter } from './Chapter';
import {
  Barcode,
  CheckinScreen,
  MacroBars,
  RestTimer,
  RosterScreen,
  SplitBars,
  SyncScreen,
} from './AppScreens';

/* a small dark readout inside a light card */
function Readout({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`screen text-sm ${className}`}>{children}</div>;
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
    <button type="button" onClick={toggle} aria-pressed={playing} className="btn btn-light btn-sm">
      {playing ? <Square className="size-3.5 text-accent" aria-hidden /> : <Volume2 className="size-4" aria-hidden />}
      {playing ? 'Zatrzymaj' : 'Odtwórz „Lightweight baby!”'}
    </button>
  );
}

const week = ['P', 'W', 'Ś', 'C', 'P', 'S', 'N'];
const habits = [
  ['Woda 2,5 l', true],
  ['Sen 8 h', true],
  ['Kreatyna', true],
  ['10 000 kroków', false],
] as const;

/* ---------------------------------------------------------------- Trening */

export function TrainingChapter() {
  return (
    <Chapter
      id="trening"
      title="Zapisz. Pobij. Powtórz."
      lede="Dziennik siłowy, który pamięta, ile podniosłeś tydzień temu — i nie przeszkadza w ciężkiej serii."
      image={{ src: '/images/barbell-140kg.webp', width: 2400, height: 1100 }}
    >
      <CardRail label="Funkcje treningu">
        <RailCard
          label="Progresja"
          title="Zawsze wiesz, co pobić."
          body="Wynik sprzed tygodnia widzisz przy każdej serii, a aplikacja podpowiada kolejny krok."
        >
          <Readout className="space-y-2 p-3">
            <div className="row flex justify-between px-3.5 py-3">
              <span className="text-ink-2">Tydzień temu</span>
              <span className="num font-semibold">135 kg × 5</span>
            </div>
            <div className="flex justify-between rounded-[var(--radius-ui)] bg-accent-wash px-3.5 py-3 text-accent-ink">
              <span className="font-medium">Dziś</span>
              <span className="num font-semibold">140 kg × 5 ↑</span>
            </div>
          </Readout>
        </RailCard>

        <RailCard
          label="Stoper"
          title="Przerwa startuje sama."
          body="Po każdej serii liczy się przerwa, a ekran nie gaśnie w trakcie ćwiczenia. Wypróbuj — to działający stoper."
        >
          <RestTimer />
        </RailCard>

        <RailCard
          label="Offline"
          title="Działa w piwnicy. Bez zasięgu."
          body="Każda seria zapisuje się na telefonie i synchronizuje w tle, gdy tylko wrócisz do sieci. Nic nie ginie."
        >
          <SyncScreen />
        </RailCard>

        <RailCard
          label="Kalkulator talerzy"
          title="Talerze rozpisane na stronę."
          body={
            <>
              Wpisz ciężar, a aplikacja rozpisze talerze.{' '}
              <a href="#kalkulator" className="link text-sheet-ink">
                Spróbuj niżej
                <ArrowRight className="size-3.5" aria-hidden />
              </a>
            </>
          }
        >
          <div className="well px-4 py-5">
            <p className="label text-sheet-ink-2">140 kg, gryf 20 kg — na każdą stronę</p>
            <p className="num mt-1 text-2xl font-semibold">2 × 25 + 10 kg</p>
            <div className="mt-5 flex items-center" aria-hidden>
              <div className="h-2 w-10 rounded-l-sm bg-steel" />
              <div className="flex items-center gap-[3px] bg-steel/70 py-[0.35rem] pr-1">
                <span className="h-24 w-3.5 rounded-[3px] bg-plate-25" />
                <span className="h-24 w-3.5 rounded-[3px] bg-plate-25" />
                <span className="h-16 w-3 rounded-[3px] bg-plate-10" />
              </div>
              <div className="h-2 w-16 rounded-r-sm bg-steel/70" />
            </div>
          </div>
        </RailCard>

        <RailCard
          tone="accent"
          label="Seria dni"
          title="Seria, której szkoda przerwać."
          body="Punkty XP za treningi, odznaki za rekordy i licznik dni z rzędu."
        >
          <ol className="grid grid-cols-7 gap-1.5" aria-label="Przykładowy tydzień: 5 z 7 dni z treningiem">
            {week.map((d, k) => (
              <li key={k} className="grid gap-1.5 text-center">
                <span
                  className={`grid aspect-square place-items-center rounded-[8px] ${
                    k < 5 ? 'bg-accent text-on-accent' : 'border border-dashed border-rule-strong'
                  }`}
                  aria-hidden
                >
                  {k < 5 && <Check className="size-3.5" strokeWidth={3} />}
                </span>
                <span className="label text-ink-2">{d}</span>
              </li>
            ))}
          </ol>
        </RailCard>

        <RailCard
          label="Ekran blokady · Android"
          title="Trening bez odblokowywania."
          body="Przerwa i bieżące ćwiczenie na ekranie blokady. Na Androidzie."
        >
          <Readout className="flex items-center justify-between gap-3 !rounded-[20px] px-4 py-4">
            <div className="min-w-0">
              <p className="truncate font-semibold">Przysiad</p>
              <p className="label text-ink-2">seria 4 z 5</p>
            </div>
            <p className="num text-3xl font-semibold text-accent">01:24</p>
          </Readout>
        </RailCard>

        <RailCard
          label="Muzyka"
          title="Twoja muzyka. I Ronnie na rekord."
          body="Sterujesz Spotify bez wychodzenia z dziennika, a przed ciężkim podejściem jeden przycisk odpala kultowy okrzyk."
        >
          <div className="well grid gap-4 px-4 py-5">
            <p className="text-sm text-sheet-ink-2">Sprawdź, jak brzmi motywacja.</p>
            <RonnieButton />
          </div>
        </RailCard>
      </CardRail>
    </Chapter>
  );
}

/* --------------------------------------------------------------- Bieganie */

export function RunningChapter() {
  return (
    <Chapter
      id="bieganie"
      title="W dni bez sztangi — trasa."
      lede="GPS, tempo na każdym kilometrze i Strava. Bez osobnej aplikacji do biegania."
      image={{ src: '/images/route-terrain.webp', width: 2400, height: 1573 }}
      imageClass="object-[50%_62%]"
    >
      <CardRail label="Funkcje biegania">
        <RailCard
          label="GPS"
          title="Trasa, tempo, przewyższenia."
          body="Wbudowany rejestrator zapisuje trasę, tempo na każdym kilometrze i przewyższenia."
        >
          <Readout>
            <dl className="grid grid-cols-3 divide-x divide-rule">
              {[
                ['Dystans', '10,24 km'],
                ['Tempo', '4:45 /km'],
                ['Kalorie', '680 kcal'],
              ].map(([k, v]) => (
                <div key={k} className="px-3 py-4">
                  <dt className="label text-ink-2">{k}</dt>
                  <dd className="num mt-1 font-semibold">{v}</dd>
                </div>
              ))}
            </dl>
          </Readout>
        </RailCard>

        <RailCard
          label="Strava"
          title="Aktywność ląduje na profilu."
          body="Łączysz konto jednym kliknięciem. Po „Zakończ bieg” aktywność z mapą, tempem i kadencją trafia na Strava sama."
        >
          <Readout className="px-4 py-4">
            <p className="font-medium">Park Leśny — pętla 10 km</p>
            <p className="chip mt-2 bg-volt text-on-volt">
              <Check className="size-3" strokeWidth={3} aria-hidden />
              Wysłano do Strava
            </p>
          </Readout>
        </RailCard>

        <RailCard
          label="Splity"
          title="Tempo podane głosem."
          body="Split podawany głosem co kilometr. Po biegu widzisz tempo na każdym odcinku."
        >
          <Readout>
            <SplitBars />
          </Readout>
        </RailCard>

        <RailCard
          tone="accent"
          label="Tydzień"
          title="Bieg i siłownia w jednym podsumowaniu."
          body="Tygodniowe podsumowanie łączy tonaż z siłowni z kilometrami z biegania."
        >
          <div>
            <p className="label text-ink-2">Przykładowy tydzień</p>
            <dl className="mt-3 grid grid-cols-2 gap-4">
              <div>
                <dt className="label text-ink-2">Tonaż</dt>
                <dd className="display num mt-1 text-4xl text-accent-ink">8,4 t</dd>
              </div>
              <div>
                <dt className="label text-ink-2">Kilometry</dt>
                <dd className="display num mt-1 text-4xl text-accent-ink">21,3</dd>
              </div>
            </dl>
          </div>
        </RailCard>
      </CardRail>
    </Chapter>
  );
}

/* ------------------------------------------------------------------ Dieta */

export function NutritionChapter() {
  return (
    <Chapter
      id="dieta"
      title="Forma zaczyna się w kuchni."
      lede="Dziennik posiłków z makro, skaner kodów i plan od trenera — w tym samym miejscu, w którym zapisujesz trening."
    >
      <CardRail label="Funkcje diety">
        <RailCard
          label="Makro"
          title="Białko, węgle, tłuszcze — na dziś."
          body="Dzienne podsumowanie kalorii i makro. Od razu widać, czego jeszcze brakuje do celu."
        >
          <Readout>
            <MacroBars />
          </Readout>
        </RailCard>

        <RailCard
          label="Skaner"
          title="Skanujesz, nie przepisujesz."
          body="Kod kreskowy z opakowania i makro z bazy Open Food Facts. Gdy skan nie łapie, wpisujesz kod ręcznie."
        >
          <Readout className="flex items-center gap-4 px-4 py-5">
            <Barcode />
            <p className="min-w-0 leading-snug">
              <span className="chip bg-volt text-on-volt">
                <Check className="size-3" strokeWidth={3} aria-hidden />
                Znaleziono
              </span>
              <span className="mt-1.5 block text-ink-2">makro na 100 g</span>
            </p>
          </Readout>
        </RailCard>

        <RailCard
          label="Plan od trenera"
          title="Dieta od trenera, tam gdzie trening."
          body="Realizujesz plan diety od trenera albo prowadzisz własny."
        >
          <Readout>
            <ul className="divide-y divide-rule">
              {[
                ['Śniadanie', 'Owsianka proteinowa', '550'],
                ['Obiad', 'Łosoś, kasza bulgur', '720'],
                ['Przed treningiem', 'Ryż z bananem', '470'],
              ].map(([when, what, kcal]) => (
                <li key={when} className="flex items-start justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="label text-ink-2">{when}</p>
                    <p className="truncate font-medium">{what}</p>
                  </div>
                  <span className="num shrink-0 font-semibold">{kcal}</span>
                </li>
              ))}
            </ul>
          </Readout>
        </RailCard>

        <RailCard
          tone="accent"
          label="Nawyki"
          title="Woda, sen, kreatyna."
          body="Codzienne cele obok treningu, odhaczane jednym dotknięciem."
        >
          <ul className="flex flex-wrap gap-2" aria-label="Przykładowe nawyki">
            {habits.map(([h, done]) => (
              <li
                key={h}
                className={`chip !min-h-9 !px-3.5 !text-sm ${done ? 'bg-accent text-on-accent' : 'border border-rule-strong text-ink-2'}`}
              >
                {done && <Check className="size-3.5" strokeWidth={3} aria-hidden />}
                {h}
              </li>
            ))}
          </ul>
        </RailCard>
      </CardRail>
    </Chapter>
  );
}

/* ----------------------------------------------------------------- Trener */

export function CoachChapter() {
  return (
    <Chapter
      id="trenerzy"
      title="Trener widzi wszystko."
      lede="Prowadzisz podopiecznych? Panel trenera pokazuje, kto trenuje, kto odpuszcza i czyj check-in czeka na odpowiedź. Bez arkuszy i zrzutów ekranu."
      aside={
        <div role="group" aria-label="Podgląd panelu trenera: lista podopiecznych">
          <RosterScreen />
        </div>
      }
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
      <CardRail label="Współpraca z trenerem">
        <RailCard
          label="Plan"
          title="Rozpisujesz raz."
          body="Rozpisujesz plan raz — podopieczny widzi go od razu w swoim dzienniku."
        >
          <Readout>
            <ul className="divide-y divide-rule">
              {[
                ['Poniedziałek', 'Push A'],
                ['Środa', 'Pull A'],
                ['Piątek', 'Nogi A'],
              ].map(([d, w]) => (
                <li key={d} className="flex items-center justify-between gap-3 px-4 py-3">
                  <span className="text-ink-2">{d}</span>
                  <span className="font-medium">{w}</span>
                </li>
              ))}
            </ul>
          </Readout>
        </RailCard>

        <RailCard
          label="Wyniki"
          title="Każda seria trafia do Ciebie."
          body="Wyniki widzisz po zakończeniu treningu — bez proszenia podopiecznego o zrzut ekranu."
        >
          <Readout className="px-4 py-4">
            <p className="font-medium">Tomasz Wrona</p>
            <p className="mt-0.5 text-ink-2">Push B ukończony · 2 godz. temu</p>
            <p className="chip mt-3 bg-screen-2 text-ink-2">wyniki serii w dzienniku</p>
          </Readout>
        </RailCard>

        <RailCard
          label="Check-in"
          title="Raport tygodniowy w dwie minuty."
          body="Waga, obwody, samopoczucie i zdjęcia sylwetki w jednym miejscu, a odpowiedź trenera od razu w aplikacji."
        >
          <CheckinScreen />
        </RailCard>

        <RailCard
          label="Czat"
          title="Jeden czat zamiast pięciu komunikatorów."
          body="Wiadomości z powiadomieniami push, bez gubienia ich między Instagramem a WhatsAppem."
        >
          <Readout className="space-y-2 p-3">
            <p className="max-w-[85%] rounded-[var(--radius-ui)] bg-screen-2 px-3.5 py-2.5">Jak plecy po wczorajszym martwym?</p>
            <p className="ml-auto max-w-[85%] rounded-[var(--radius-ui)] bg-accent-wash px-3.5 py-2.5 text-accent-ink">
              Lepiej. Dziś robię lżejsze serie.
            </p>
          </Readout>
        </RailCard>
      </CardRail>
    </Chapter>
  );
}
