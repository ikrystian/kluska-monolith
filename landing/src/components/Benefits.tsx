import { useRef, useState, type ReactNode } from 'react';
import {
  ArrowRight,
  BookOpen,
  Check,
  CloudOff,
  Flame,
  ListChecks,
  Lock,
  Music2,
  RefreshCw,
  Route,
  ScanBarcode,
  Square,
  TrendingUp,
  Users,
  Volume2,
} from 'lucide-react';
import { reveal } from '../lib/reveal';

function Tile({
  dark = false,
  className = '',
  i = 0,
  children,
}: {
  dark?: boolean;
  className?: string;
  i?: number;
  children: ReactNode;
}) {
  return (
    <li
      {...reveal(i)}
      className={`relative flex flex-col overflow-hidden ${dark ? 'stage on-night' : 'card'} ${className}`}
    >
      {children}
    </li>
  );
}

function TileText({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div>
      <span className="icon-tile" aria-hidden>
        {icon}
      </span>
      <h3 className="mt-5 font-display text-[1.375rem] font-semibold leading-tight tracking-[-0.025em]">{title}</h3>
      <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink-2 [.on-night_&]:text-night-ink-2">{children}</p>
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
    <button type="button" onClick={toggle} aria-pressed={playing} className="btn btn-dark btn-sm">
      {playing ? <Square className="size-3.5 text-accent" aria-hidden /> : <Volume2 className="size-4" aria-hidden />}
      {playing ? 'Zatrzymaj' : 'Odtwórz „Lightweight baby!”'}
    </button>
  );
}

const barcode = [2, 1, 3, 1, 1, 2, 1, 3, 2, 1, 1, 2, 3, 1, 2, 1];
const week = ['P', 'W', 'Ś', 'C', 'P', 'S', 'N'];
const habits = [
  ['Woda 2,5 l', true],
  ['Sen 8 h', true],
  ['Kreatyna', true],
  ['10 000 kroków', false],
] as const;
const more = ['Kalendarz treningów', 'Wykresy i rekordy', 'Pomiary ciała', 'Gotowe plany i szablony', 'Mapa siłowni', 'Strefa wiedzy', 'Społeczność'];

export function Benefits() {
  return (
    <section id="korzysci" aria-labelledby="benefits-title" className="section">
      <div className="shell">
        <div className="mx-auto max-w-3xl text-center">
          <h2 {...reveal(0)} id="benefits-title" className="h-section">
            Zbudowana na prawdziwą siłownię.
          </h2>
          <p {...reveal(1)} className="lede mx-auto mt-5 max-w-2xl">
            Grube ściany, spocone ręce i ciężka seria za minutę. Każda funkcja powstała z myślą o tych warunkach — a
            nie o idealnym demo.
          </p>
        </div>

        <ul className="mt-14 grid gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* A — offline, tall */}
          <Tile dark i={0} className="md:col-span-2 lg:row-span-2">
            <div className="relative h-56 sm:h-64 lg:h-auto lg:flex-1">
              <img
                src="/images/kettlebells.webp"
                alt="Trzy odważniki kettlebell na gumowej podłodze w ciemnej siłowni"
                width={1800}
                height={1260}
                loading="lazy"
                className="absolute inset-0 size-full object-cover [mask-image:linear-gradient(to_bottom,black_55%,transparent)]"
              />
            </div>
            <div className="relative grid gap-6 p-6 sm:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] sm:items-end sm:p-8 lg:grid-cols-1">
              <TileText icon={<CloudOff className="size-5" />} title="Działa w piwnicy. Bez zasięgu.">
                Każda seria zapisuje się na telefonie i synchronizuje w tle, gdy tylko wrócisz do sieci. Nic nie
                ginie.
              </TileText>
              <ol className="ui text-sm" aria-label="Przykład synchronizacji">
                <li className="flex items-center justify-between gap-3 px-4 py-3">
                  <span className="min-w-0 truncate">
                    Seria 3 · <span className="num">140 kg × 5</span>
                  </span>
                  <span className="chip shrink-0 bg-night-3 text-night-ink-2">na telefonie</span>
                </li>
                <li className="flex items-center justify-between gap-3 border-t border-night-rule px-4 py-3">
                  <span className="inline-flex min-w-0 items-center gap-2 truncate">
                    <RefreshCw className="size-3.5 shrink-0 text-night-ink-2" aria-hidden />
                    Wracasz do zasięgu
                  </span>
                  <span className="chip shrink-0 bg-volt text-on-volt">
                    <Check className="size-3" strokeWidth={3} aria-hidden />
                    w chmurze
                  </span>
                </li>
              </ol>
            </div>
          </Tile>

          {/* B — running, wide */}
          <Tile dark i={1} className="md:col-span-2">
            <img
              src="/images/route-terrain.webp"
              alt=""
              width={2400}
              height={1300}
              loading="lazy"
              className="absolute inset-0 -z-0 size-full object-cover opacity-50 [mask-image:linear-gradient(to_left,black,transparent_85%)]"
            />
            <div className="relative grid flex-1 gap-6 p-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end sm:p-8">
              <TileText icon={<Route className="size-5" />} title="Bieg z GPS prosto na Stravę.">
                Trasa, tempo na każdym kilometrze i przewyższenia. Kończysz bieg — aktywność ląduje na Twoim profilu.
              </TileText>
              <div className="ui w-full p-4 sm:w-56">
                <dl className="grid grid-cols-2 gap-3">
                  <div>
                    <dt className="label text-night-ink-2">Dystans</dt>
                    <dd className="num text-xl font-semibold">10,24 km</dd>
                  </div>
                  <div>
                    <dt className="label text-night-ink-2">Tempo</dt>
                    <dd className="num text-xl font-semibold">4:45</dd>
                  </div>
                </dl>
                <p className="chip mt-3 bg-volt text-on-volt">
                  <Check className="size-3" strokeWidth={3} aria-hidden />
                  Wysłano do Strava
                </p>
              </div>
            </div>
          </Tile>

          {/* C — progression */}
          <Tile i={2} className="p-6 sm:p-7">
            <TileText icon={<TrendingUp className="size-5" />} title="Zawsze wiesz, co pobić.">
              Wynik sprzed tygodnia widzisz przy każdej serii.
            </TileText>
            <div className="mt-6 grid gap-2 text-sm">
              <div className="flex justify-between rounded-[var(--radius-ui)] bg-paper-2 px-3.5 py-2.5">
                <span className="text-ink-2">Tydzień temu</span>
                <span className="num font-semibold">135 kg × 5</span>
              </div>
              <div className="flex justify-between rounded-[var(--radius-ui)] bg-accent-wash px-3.5 py-2.5 text-accent-ink">
                <span className="font-medium">Dziś</span>
                <span className="num font-semibold">140 kg × 5 ↑</span>
              </div>
            </div>
          </Tile>

          {/* D — barcode */}
          <Tile i={3} className="p-6 sm:p-7">
            <TileText icon={<ScanBarcode className="size-5" />} title="Skanujesz, nie przepisujesz.">
              Kod kreskowy z opakowania i makro z bazy Open Food Facts.
            </TileText>
            <div className="mt-6 flex items-center gap-4 rounded-[var(--radius-ui)] bg-paper-2 px-3.5 py-3">
              <div className="flex h-9 shrink-0 items-stretch gap-[2px]" aria-hidden>
                {barcode.map((w, k) => (
                  <span key={k} className="bg-ink" style={{ width: w }} />
                ))}
              </div>
              <p className="min-w-0 text-sm leading-snug">
                <span className="block font-medium">Znaleziono</span>
                <span className="text-ink-2">makro na 100 g</span>
              </p>
            </div>
          </Tile>

          {/* E — streak */}
          <Tile i={0} className="p-6 sm:p-7">
            <TileText icon={<Flame className="size-5" />} title="Seria, której szkoda przerwać.">
              Punkty XP za treningi, odznaki za rekordy i licznik dni z rzędu.
            </TileText>
            <ol className="mt-6 grid grid-cols-7 gap-1.5" aria-label="Przykładowy tydzień: 5 z 7 dni z treningiem">
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
          </Tile>

          {/* F — lock screen widget */}
          <Tile dark i={1} className="p-6 sm:p-7">
            <TileText icon={<Lock className="size-5" />} title="Trening na ekranie blokady.">
              Przerwa i bieżące ćwiczenie bez odblokowywania telefonu. Na Androidzie.
            </TileText>
            <div className="ui mt-6 flex items-center justify-between gap-3 rounded-[20px] px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">Przysiad</p>
                <p className="label text-night-ink-2">seria 4 z 5</p>
              </div>
              <p className="num text-2xl font-semibold text-accent">01:24</p>
            </div>
          </Tile>

          {/* G — music + Ronnie, wide */}
          <Tile i={2} className="p-6 sm:p-7 md:col-span-2">
            <div className="flex flex-1 flex-col justify-between gap-6">
              <TileText icon={<Music2 className="size-5" />} title="Twoja muzyka. I Ronnie na rekord.">
                Sterujesz Spotify bez wychodzenia z dziennika, a przed ciężkim podejściem jeden przycisk odpala
                kultowy okrzyk.
              </TileText>
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-ui)] bg-paper-2 py-3 pl-4 pr-3">
                <p className="text-sm text-ink-2">Sprawdź, jak brzmi motywacja</p>
                <RonnieButton />
              </div>
            </div>
          </Tile>

          {/* H — habits */}
          <Tile i={3} className="p-6 sm:p-7">
            <TileText icon={<ListChecks className="size-5" />} title="Nawyki jednym dotknięciem.">
              Woda, sen, suplementy — codzienne cele obok treningu.
            </TileText>
            <ul className="mt-6 flex flex-wrap gap-1.5" aria-label="Przykładowe nawyki">
              {habits.map(([h, done]) => (
                <li
                  key={h}
                  className={`chip ${done ? 'bg-accent-wash text-accent-ink' : 'border border-rule-strong text-ink-2'}`}
                >
                  {done && <Check className="size-3" strokeWidth={3} aria-hidden />}
                  {h}
                </li>
              ))}
            </ul>
          </Tile>

          {/* I — atlas */}
          <Tile i={0} className="p-6 sm:p-7">
            <TileText icon={<BookOpen className="size-5" />} title="Ponad 250 ćwiczeń z techniką.">
              Opis ruchu i zaangażowane mięśnie — gdy nie pamiętasz, jak to się robiło.
            </TileText>
          </Tile>

          {/* J — coach, wide */}
          <Tile i={1} className="p-6 sm:p-7 md:col-span-2">
            <div className="grid flex-1 gap-6 sm:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)] sm:items-end">
              <div>
                <TileText icon={<Users className="size-5" />} title="Masz trenera? Widzi każdą serię.">
                  Plan od trenera trafia prosto do dziennika, a raz w tygodniu wysyłasz check-in w dwie minuty.
                </TileText>
                <a href="#trenerzy" className="link mt-5 text-sm">
                  Jak działa współpraca
                  <ArrowRight className="size-3.5" aria-hidden />
                </a>
              </div>
              <figure className="rounded-[var(--radius-ui)] bg-paper-2 p-4">
                <figcaption className="label text-ink-2">Trener Michał · odpowiedź do check-inu</figcaption>
                <blockquote className="mt-1.5 text-[0.9375rem] leading-relaxed">
                  Dobry progres na ławce. Od poniedziałku +100 g węglowodanów w dni treningowe.
                </blockquote>
              </figure>
            </div>
          </Tile>
        </ul>

        <div {...reveal(0)} className="mt-8 flex flex-col items-center gap-3 text-center">
          <p className="text-sm text-ink-2">A do tego:</p>
          <ul className="flex max-w-3xl flex-wrap justify-center gap-2">
            {more.map((m) => (
              <li key={m} className="chip border border-rule bg-card text-ink">
                {m}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
