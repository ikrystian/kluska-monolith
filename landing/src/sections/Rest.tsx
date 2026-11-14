import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, BookOpen, Check, Coins, Dumbbell, Flame, Hand, MapPin, Moon, Search, Sun, Timer, Utensils, Volleyball, Footprints, X } from 'lucide-react';
import { reveal } from '../lib/reveal';
import { useOnScreen } from '../lib/motion';
import { PetAvatar, type PetAction } from '../pet/PetAvatar';
import type { PetMood, PetSpecies, PetStage } from '../pet/types';
import { SyncScreen } from '../components/AppScreens';
import { Wordmark } from '../components/Wordmark';
import { CATEGORIES, FEATURES, byCat, type CategoryId } from './features';
import { Bar, Device, vars } from './ui';

const APP = 'https://app.leniwakluska.pl';

/* ------------------------------------------------------------------ szablony: okładki z aplikacji */

const COVERS = [
  ['fullbody', 'Całe ciało'],
  ['legs', 'Nogi'],
  ['chest', 'Klatka'],
  ['back', 'Plecy'],
  ['shoulders', 'Barki'],
  ['arms', 'Ramiona'],
  ['core', 'Brzuch'],
  ['run', 'Bieg'],
] as const;

/* The app's own workout covers, drifting past. Pauses on hover and focus. */
export function CoverRail() {
  return (
    <div className="marquee overflow-clip pb-20 sm:pb-28" aria-label="Okładki szablonów treningowych z aplikacji" role="img">
      <div className="marquee-track gap-3 pr-3 sm:gap-4 sm:pr-4" aria-hidden>
        {[...COVERS, ...COVERS].map(([file, label], n) => (
          <figure key={n} className="relative w-[13.5rem] shrink-0 overflow-hidden rounded-2xl border border-rule sm:w-[18rem]">
            <img src={`/app/${file}.svg`} alt="" width={400} height={300} loading="lazy" className="block aspect-[4/3] w-full object-cover" />
            <figcaption className="absolute inset-x-0 bottom-0 flex items-end justify-between bg-linear-to-t from-shade/90 to-transparent p-3.5 pt-10">
              <span className="font-display text-2xl font-extrabold uppercase leading-none">{label}</span>
              <span className="chip bg-paper-3 text-ink-2">szablon</span>
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ zwierzak: prawdziwy awatar z aplikacji */

const SPECIES: [PetSpecies, string][] = [
  ['hamster', 'Chomik'],
  ['fox', 'Lis'],
  ['bear', 'Niedźwiadek'],
];
const STAGES: [PetStage, string][] = [
  ['baby', 'Maluch'],
  ['junior', 'Junior'],
  ['adult', 'Dorosły'],
  ['master', 'Mistrz'],
];
const WEAR = [
  ['head', 'wear_cap', 'Czapka'],
  ['eyes', 'wear_sunglasses', 'Okulary'],
  ['back', 'wear_cape', 'Peleryna'],
  ['feet', 'wear_sneakers', 'Buty'],
] as const;

const ACTIONS: { action: PetAction; label: string; icon: typeof Dumbbell; say: string; hunger: number; joy: number; form: number }[] = [
  { action: 'eat', label: 'Nakarm', icon: Utensils, say: 'Mniam. Jabłko po treningu smakuje najlepiej.', hunger: 28, joy: 6, form: 0 },
  { action: 'header', label: 'Pobaw się', icon: Volleyball, say: 'Jeszcze raz! Jeszcze raz!', hunger: -6, joy: 24, form: 4 },
  { action: 'lift', label: 'Poćwicz', icon: Dumbbell, say: 'Lightweight, baby!', hunger: -12, joy: 8, form: 22 },
  { action: 'run', label: 'Pobiegaj', icon: Footprints, say: 'Tempo trzymam, nie gadam.', hunger: -12, joy: 8, form: 18 },
  { action: 'pet', label: 'Pogłaszcz', icon: Hand, say: 'O tak, tu za uchem.', hunger: 0, joy: 16, form: 0 },
];

const clamp = (n: number) => Math.max(8, Math.min(100, n));

export function PetSection() {
  const [ref, on] = useOnScreen<HTMLDivElement>();
  const [species, setSpecies] = useState<PetSpecies>('hamster');
  const [stage, setStage] = useState<PetStage>('adult');
  const [worn, setWorn] = useState<Record<string, string>>({});
  const [action, setAction] = useState<PetAction>('idle');
  const [say, setSay] = useState('Cześć! Zrobisz dziś trening?');
  const [stats, setStats] = useState({ hunger: 42, joy: 58, form: 50 });
  const [coins, setCoins] = useState(240);
  const touched = useRef(false);
  const back = useRef(0);

  const play = (n: number, byVisitor: boolean) => {
    const a = ACTIONS[n];
    if (byVisitor) touched.current = true;
    window.clearTimeout(back.current);
    setAction(a.action);
    setSay(a.say);
    setStats((s) => ({ hunger: clamp(s.hunger + a.hunger), joy: clamp(s.joy + a.joy), form: clamp(s.form + a.form) }));
    if (a.action === 'eat') setCoins((c) => (c >= 15 ? c - 15 : 240));
    back.current = window.setTimeout(() => setAction('idle'), 2600);
  };

  // until the visitor touches anything, the pet shows off by itself
  useEffect(() => {
    if (!on || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let n = 0;
    const id = window.setInterval(() => {
      if (touched.current) return;
      play(n % ACTIONS.length, false);
      n += 1;
    }, 3800);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on]);

  useEffect(() => () => window.clearTimeout(back.current), []);

  const mood: PetMood = stats.hunger < 30 ? 'hungry' : stats.joy < 30 ? 'sad' : stats.hunger > 70 && stats.joy > 70 && stats.form > 70 ? 'energetic' : 'happy';
  const build = stats.form > 78 ? 'strong' : 'balanced';
  const items = byCat('zwierzak');

  return (
    <section id="zwierzak" aria-labelledby="pet-title" className="relative isolate overflow-clip" style={vars({ '--tone': 'var(--color-food)' })}>
      <div className="shell section grid grid-cols-[minmax(0,1fr)] gap-x-16 gap-y-10 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:grid-rows-[auto_1fr]">
        <div>
          <p className="hash font-display text-2xl font-extrabold uppercase leading-none tracking-[0.01em] text-ink-2 sm:text-[1.75rem]">Zwierzak</p>
          <h2 id="pet-title" className="h-section mt-3">
            Twoja forma <span className="text-food">ma futro.</span>
          </h2>
          <p className="lede mt-5 max-w-[36rem]">
            Za treningi dostajesz FitCoins, a za FitCoins karmisz i ubierasz zwierzaka. Trenujesz — rośnie i skacze z radości. Odpuszczasz — robi smutne
            oczy. To ten sam zwierzak co w aplikacji: nakarm go, zanim pójdziesz dalej.
          </p>
        </div>

        <div ref={ref} className="lg:sticky lg:top-[calc(var(--header-h)+2rem)] lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start">
          <div {...reveal(0, 'screen')} className="pet-stage relative overflow-hidden rounded-[28px] border border-rule">
            <div className="flex items-center justify-between px-4 pt-4">
              <p className="hash font-display text-[1.375rem] font-extrabold uppercase leading-none">Zwierzak</p>
              <span className="chip bg-paper-3 text-ink">
                <Coins className="size-3.5 text-food" aria-hidden />
                <span className="num">{coins}</span> FitCoins
              </span>
            </div>

            <div className="relative grid place-items-center px-4 pb-2 pt-12">
              <p key={say} className="land absolute left-1/2 top-3 w-max max-w-[88%] -translate-x-1/2 rounded-2xl rounded-bl-md bg-ink px-3.5 py-2 text-center text-[0.8125rem] font-semibold leading-snug text-paper" aria-live="polite">
                {say}
              </p>
              <PetAvatar
                species={species}
                stage={stage}
                build={build}
                mood={mood}
                action={action}
                food="food_apple"
                equipped={worn}
                shiny={stage === 'master'}
                size={260}
                className="h-auto w-[min(100%,16.25rem)]"
              />
            </div>

            <div className="grid grid-cols-3 gap-3 px-4 pb-4">
              {[
                ['Głód', stats.hunger, 'var(--color-food)'],
                ['Radość', stats.joy, 'var(--color-accent)'],
                ['Forma', stats.form, 'var(--color-volt)'],
              ].map(([k, v, tone]) => (
                <div key={k as string}>
                  <p className="flex justify-between text-[0.6875rem] font-semibold text-ink-2">
                    {k} <span className="num text-ink">{v}</span>
                  </p>
                  <Bar value={(v as number) / 100} tone={tone as string} className="mt-1 h-1.5" />
                </div>
              ))}
            </div>

            <div className="grid grid-cols-5 border-t border-rule">
              {ACTIONS.map((a, n) => (
                <button
                  key={a.action}
                  type="button"
                  onClick={() => play(n, true)}
                  aria-pressed={action === a.action}
                  className="group flex flex-col items-center gap-1.5 border-r border-rule px-1 py-3.5 text-[0.6875rem] font-semibold text-ink-2 transition-colors last:border-r-0 hover:bg-paper-3 hover:text-ink aria-pressed:text-ink"
                >
                  <a.icon className="size-5 transition-transform duration-200 ease-[var(--ease-out)] group-hover:-translate-y-0.5 group-active:scale-90 group-aria-pressed:text-volt" aria-hidden />
                  <span className="whitespace-nowrap">{a.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-start-1">
          <div className="space-y-4">
            <Picker label="Gatunek" options={SPECIES} value={species} onChange={setSpecies} />
            <Picker label="Etap" options={STAGES} value={stage} onChange={setStage} />
            <div>
              <p className="label text-ink-2">Szafa</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {WEAR.map(([slot, key, label]) => {
                  const active = worn[slot] === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      aria-pressed={active}
                      onClick={() => {
                        touched.current = true;
                        setWorn((w) => {
                          const next = { ...w };
                          if (active) delete next[slot];
                          else next[slot] = key;
                          return next;
                        });
                      }}
                      className="filter"
                    >
                      {active && <Check className="size-4" strokeWidth={3} aria-hidden />}
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <ul className="chapter-list mt-10 border-t border-rule-strong">
            {items.map((x, n) => (
              <li key={x.title} {...reveal(n % 4, 'row')} className="flex gap-3.5 border-b border-rule py-4">
                <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-paper-3">
                  <x.icon className="size-[18px] text-food" aria-hidden />
                </span>
                <div className="min-w-0">
                  <h3 className="font-semibold leading-snug">{x.title}</h3>
                  <p className="mt-1 text-[0.9375rem] leading-relaxed text-ink-2">{x.body}</p>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-10 flex items-center gap-6">
            <Device shot="pet" alt="Ekran zwierzaka w aplikacji: chomik Kluska w czapce i butach w swoim pokoju" className="w-40 shrink-0 sm:w-48" />
            <p className="max-w-[18rem] text-ink-2">
              W aplikacji zwierzak ma swój pokój, szafę i sklepik. Urządzasz go za FitCoins z treningów.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Picker<T extends string>({ label, options, value, onChange }: { label: string; options: [T, string][]; value: T; onChange: (v: T) => void }) {
  return (
    <div>
      <p className="label text-ink-2">{label}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map(([v, name]) => (
          <button key={v} type="button" aria-pressed={value === v} onClick={() => onChange(v)} className="filter">
            {name}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ wiedza, mapa, sklep */

const ARTICLES = [
  ['Trening', 'Ile serii w tygodniu naprawdę wystarczy', true],
  ['Dieta', 'Białko: ile, kiedy i z czego', true],
  ['Przepis', 'Owsianka proteinowa — 550 kcal', false],
  ['Regeneracja', 'Sen a przyrost siły', false],
] as const;

const SHOP = [
  ['shop-hoodie-men', 'Bluza męska', '219 zł'],
  ['shop-hoodie-women', 'Bluza damska', '219 zł'],
  ['shop-tee-men', 'Koszulka męska', '99 zł'],
  ['shop-tank-women', 'Top damski', '89 zł'],
] as const;

export function MoreSection() {
  return (
    <section id="wiecej" aria-labelledby="more-title" className="section">
      <div className="shell">
        <p className="hash font-display text-2xl font-extrabold uppercase leading-none tracking-[0.01em] text-ink-2 sm:text-[1.75rem]">Menu</p>
        <h2 id="more-title" className="h-section mt-3 max-w-[14ch]">
          Wiedza, mapa <span className="text-run">i coś na grzbiet.</span>
        </h2>

        <div className="mt-12 grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <article {...reveal(0, 'screen')} className="surface overflow-hidden">
            <div className="p-6 sm:p-8">
              <BookOpen className="size-6 text-run" aria-hidden />
              <h3 className="h-sub mt-4">Strefa wiedzy</h3>
              <p className="mt-2 max-w-[30rem] text-ink-2">Artykuły w kategoriach i przepisy z policzonym makro. Przepis jednym przyciskiem ląduje w dzienniku kalorii.</p>
            </div>
            <ul className="border-t border-rule" aria-label="Przykładowe artykuły">
              {ARTICLES.map(([cat, title, read], n) => (
                <li key={title} {...reveal(n, 'row')} className="flex items-center gap-4 border-b border-rule px-6 py-3.5 last:border-b-0 sm:px-8">
                  <span className="chip shrink-0 bg-paper-3 text-ink-2">{cat}</span>
                  <span className="min-w-0 flex-1 truncate font-medium">{title}</span>
                  {read && <Check className="size-4 shrink-0 text-volt" strokeWidth={3} aria-label="przeczytane" />}
                </li>
              ))}
            </ul>
          </article>

          <article {...reveal(1, 'screen')} className="surface relative isolate overflow-hidden">
            <svg aria-hidden viewBox="0 0 600 420" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 -z-10 size-full">
              <g fill="none" stroke="var(--color-rule)" strokeWidth="1.5">
                <path d="M-20 90 L620 170 M-20 300 L620 250 M120 -20 L190 440 M410 -20 L470 440 M-20 200 C160 150 380 300 620 60" />
              </g>
              <path d="M-20 380 C160 300 300 400 620 300" fill="none" stroke="color-mix(in oklab, var(--color-run) 18%, transparent)" strokeWidth="26" />
            </svg>
            {[
              ['62%', '24%', 0],
              ['78%', '58%', 1],
              ['46%', '66%', 2],
            ].map(([l, t, n]) => (
              <span key={n} aria-hidden className="absolute grid size-9 place-items-center" style={{ left: l as string, top: t as string }}>
                <span className="live-dot absolute inset-0 rounded-full bg-accent/25" style={vars({ animationDelay: `${(n as number) * 420}ms` })} />
                <MapPin className="relative size-6 fill-accent text-on-accent" />
              </span>
            ))}
            <div className="flex h-full min-h-[22rem] flex-col justify-end bg-linear-to-t from-paper-2 via-paper-2/85 to-transparent p-6 sm:p-8">
              <h3 className="h-sub">Mapa siłowni</h3>
              <p className="mt-2 max-w-[26rem] text-ink-2">Siłownie w okolicy, Twoje ulubione miejsca i ostatnie treningi zrobione w każdej z nich.</p>
            </div>
          </article>
        </div>

        <article {...reveal(0, 'screen')} className="surface mt-4 overflow-hidden">
          <div className="grid grid-cols-[minmax(0,1fr)] gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,4fr)_minmax(0,7fr)] lg:items-end">
            <div>
              <span className="chip bg-food text-on-plate">Wkrótce w sprzedaży</span>
              <h3 className="h-sub mt-4">Noś swoją formę</h3>
              <p className="mt-2 max-w-[26rem] text-ink-2">Sklep z ubraniami siedzi już w aplikacji. Bluzy, koszulka i top z logo Leniwej Kluski — sprzedaż ruszy niebawem.</p>
            </div>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Ubrania z logo Leniwej Kluski">
              {SHOP.map(([file, name, price], n) => (
                <li key={file} className="group">
                  <div className="overflow-hidden rounded-xl bg-shade">
                    <img
                      src={`/app/${file}.webp`}
                      alt={`${name} z logo Leniwej Kluski na plecach`}
                      width={640}
                      height={857}
                      loading="lazy"
                      className="block aspect-[3/4] w-full object-cover transition-transform duration-700 ease-[var(--ease-out)] group-hover:scale-[1.06]"
                      style={vars({ '--i': n })}
                    />
                  </div>
                  <p className="mt-2.5 flex items-baseline justify-between gap-2 text-sm">
                    <span className="truncate font-semibold">{name}</span>
                    <span className="num shrink-0 text-ink-2">{price}</span>
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </article>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ aplikacja: offline, widżety, tablet, motyw */

function WidgetSession() {
  const [s, setS] = useState(72);
  useEffect(() => {
    const id = window.setInterval(() => setS((v) => (v <= 1 ? 90 : v - 1)), 1000);
    return () => window.clearInterval(id);
  }, []);
  return (
    <div className="rounded-[22px] bg-paper-3 p-3.5" role="img" aria-label="Widżet trwającego treningu z odliczaniem przerwy">
      <div aria-hidden>
        <p className="flex items-center gap-1.5 text-[0.625rem] font-semibold text-ink-2">
          <Timer className="size-3 text-accent" />
          Przerwa · Przysiad, seria 3
        </p>
        <p className="big mt-1 text-4xl text-accent">
          0{Math.floor(s / 60)}:{String(s % 60).padStart(2, '0')}
        </p>
        <div className="mt-2.5 flex items-center justify-between">
          <div className="flex gap-1">
            {[1, 0, 1, 0, 1, 1, 0].map((d, n) => (
              <span key={n} className={`size-2.5 rounded-full ${d ? 'bg-volt' : 'bg-rule-strong'}`} />
            ))}
          </div>
          <span className="flex items-center gap-1 text-[0.625rem] font-bold">
            <Flame className="size-3 text-accent" />4
          </span>
        </div>
      </div>
    </div>
  );
}

function WidgetPet() {
  const [hearts, setHearts] = useState(0);
  return (
    <button
      type="button"
      onClick={() => setHearts((h) => h + 1)}
      className="group w-full rounded-[22px] bg-paper-3 p-3.5 text-left transition-transform duration-150 ease-[var(--ease-out)] active:scale-[0.97]"
      aria-label="Widżet zwierzaka — dotknij, żeby pogłaskać"
    >
      <div className="flex items-center gap-3">
        <PetAvatar key={hearts} species="fox" stage="junior" size={64} mood="happy" action={hearts ? 'pet' : 'idle'} />
        <div className="min-w-0 flex-1 space-y-1.5">
          <p className="text-[0.6875rem] font-bold">Rudy {hearts > 0 && <span className="land ml-1 inline-block text-accent">+{hearts}</span>}</p>
          <Bar value={0.72} tone="var(--color-food)" className="h-1" />
          <Bar value={Math.min(1, 0.55 + hearts * 0.08)} tone="var(--color-accent)" className="h-1" />
          <Bar value={0.64} tone="var(--color-volt)" className="h-1" />
        </div>
      </div>
      <p className="mt-2 text-[0.625rem] text-ink-2">Dotknij, żeby pogłaskać</p>
    </button>
  );
}

function ThemeTile() {
  const [light, setLight] = useState(false);
  return (
    <div className={`${light ? 'sheet' : 'bg-paper-3'} rounded-2xl p-4 transition-colors duration-500 ease-[var(--ease-out)]`}>
      <div className="flex items-center justify-between">
        <p className="hash font-display text-xl font-extrabold uppercase leading-none">Ustawienia</p>
        <button
          type="button"
          role="switch"
          aria-checked={light}
          aria-label="Jasny motyw"
          onClick={() => setLight((v) => !v)}
          className={`relative h-8 w-14 rounded-full transition-colors duration-300 ${light ? 'bg-sheet-accent' : 'bg-rule-strong'}`}
        >
          <span
            className={`absolute left-1 top-1 grid size-6 place-items-center rounded-full bg-ink text-paper transition-transform duration-300 ease-[var(--ease-out)] ${light ? 'translate-x-6' : ''}`}
          >
            {light ? <Sun className="size-3.5" aria-hidden /> : <Moon className="size-3.5" aria-hidden />}
          </span>
        </button>
      </div>
      <p className={`mt-3 text-sm ${light ? 'muted' : 'text-ink-2'}`}>Motyw: {light ? 'jasny' : 'ciemny'}. Przełącz — tak samo działa w aplikacji.</p>
    </div>
  );
}

export function EverywhereSection() {
  const rows = byCat('wszedzie').filter((x) => !['Działa bez zasięgu', 'Widżety na Androida', 'Tablet i Fold', 'Ciemny i jasny motyw'].includes(x.title));

  return (
    <section id="wszedzie" aria-labelledby="everywhere-title" className="bg-paper-2">
      <div className="shell section">
        <p className="hash font-display text-2xl font-extrabold uppercase leading-none tracking-[0.01em] text-ink-2 sm:text-[1.75rem]">Aplikacja</p>
        <h2 id="everywhere-title" className="h-section mt-3 max-w-[13ch]">
          W piwnicy, na pulpicie, <span className="text-accent">bez konta.</span>
        </h2>

        <div className="mt-12 grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-2 lg:grid-cols-[minmax(0,5fr)_minmax(0,4fr)_minmax(0,4fr)]">
          <article className="rounded-[var(--radius-card)] border border-rule bg-paper p-6 md:row-span-2">
            <h3 className="h-sub">Działa bez zasięgu</h3>
            <p className="mt-2 text-ink-2">Serie zapisują się na telefonie i same lecą do chmury, gdy wróci sieć. Plany i animacje ćwiczeń pobierzesz wcześniej.</p>
            <div {...reveal(0, 'live')} className="mt-6">
              <SyncScreen />
            </div>
          </article>

          <article className="rounded-[var(--radius-card)] border border-rule bg-paper p-6">
            <h3 className="h-sub">Widżety na Androida</h3>
            <p className="mt-2 text-ink-2">Przerwa odlicza się na pulpicie.</p>
            <div className="mt-5">
              <WidgetSession />
            </div>
          </article>

          <article className="rounded-[var(--radius-card)] border border-rule bg-paper p-6">
            <h3 className="h-sub">Zwierzak na pulpicie</h3>
            <p className="mt-2 text-ink-2">Pogłaszczesz go bez otwierania aplikacji.</p>
            <div className="mt-5">
              <WidgetPet />
            </div>
          </article>

          <article className="rounded-[var(--radius-card)] border border-rule bg-paper p-6">
            <h3 className="h-sub">Tablet i Fold</h3>
            <p className="mt-2 text-ink-2">Menu obok bieżącego ekranu.</p>
            <div aria-hidden className="mt-5 grid grid-cols-[1fr_3fr] gap-1.5 rounded-2xl bg-paper-3 p-2">
              <div className="space-y-1.5 rounded-xl bg-screen p-2">
                {[1, 0, 0, 0, 0].map((a, n) => (
                  <span key={n} className={`block h-2.5 rounded-full ${a ? 'bg-volt' : 'bg-rule-strong'}`} />
                ))}
              </div>
              <div className="space-y-1.5 rounded-xl bg-screen p-2">
                <span className="block h-2.5 w-1/2 rounded-full bg-accent" />
                <span className="block h-9 rounded-lg bg-paper-3" />
                <span className="block h-9 rounded-lg bg-paper-3" />
              </div>
            </div>
          </article>

          <article className="rounded-[var(--radius-card)] border border-rule bg-paper p-6">
            <h3 className="h-sub">Ciemny i jasny motyw</h3>
            <div className="mt-5">
              <ThemeTile />
            </div>
          </article>
        </div>

        <ul className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-x-10 border-t border-rule-strong sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((x, n) => (
            <li key={x.title} {...reveal(n % 3, 'row')} className="flex gap-3.5 border-b border-rule py-4">
              <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-paper-3">
                <x.icon className="size-[18px] text-accent" aria-hidden />
              </span>
              <div className="min-w-0">
                <h3 className="font-semibold leading-snug">{x.title}</h3>
                <p className="mt-1 text-[0.9375rem] leading-relaxed text-ink-2">{x.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ pełna lista funkcji */

const fold = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ł/g, 'l');

export function Catalogue() {
  const [cat, setCat] = useState<CategoryId | 'all'>('all');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const list = useMemo(() => {
    const q = fold(query.trim());
    return FEATURES.filter((x) => (cat === 'all' || x.cat === cat) && (!q || fold(`${x.title} ${x.body}`).includes(q)));
  }, [cat, query]);

  // the whole index is long: it opens on the first dozen and unfolds on request
  const folded = !open && cat === 'all' && !query.trim();
  const shown = folded ? list.slice(0, 12) : list;

  const tone = (id: CategoryId) => CATEGORIES.find((c) => c.id === id)!;

  return (
    <section id="funkcje" aria-labelledby="catalogue-title" className="section">
      <div className="shell">
        <div className="grid grid-cols-[minmax(0,1fr)] items-end gap-6 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div>
            <p className="hash font-display text-2xl font-extrabold uppercase leading-none tracking-[0.01em] text-ink-2 sm:text-[1.75rem]">Wszystko</p>
            <h2 id="catalogue-title" className="h-section mt-3">
              <span className="text-volt">{FEATURES.length}</span> funkcji. Zero dopłat.
            </h2>
          </div>
          <label className="relative block w-full lg:w-80">
            <span className="sr-only">Szukaj funkcji</span>
            <Search className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-ink-2" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Szukaj, np. stoper, Strava, waga"
              className="h-12 w-full rounded-full border border-rule bg-paper-2 pl-11 pr-11 text-[0.9375rem] placeholder:text-ink-3 hover:border-rule-strong focus:border-ink-2 [&::-webkit-search-cancel-button]:hidden"
            />
            {query && (
              <button type="button" onClick={() => setQuery('')} aria-label="Wyczyść wyszukiwanie" className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-ink-2 hover:bg-paper-3 hover:text-ink">
                <X className="size-4" />
              </button>
            )}
          </label>
        </div>

        <div className="-mx-[var(--shell-pad)] mt-8 flex gap-2 overflow-x-auto px-[var(--shell-pad)] pb-1 [scrollbar-width:none] sm:flex-wrap [&::-webkit-scrollbar]:hidden" role="group" aria-label="Filtruj według kategorii">
          <button type="button" className="filter" aria-pressed={cat === 'all'} onClick={() => setCat('all')}>
            Wszystko <span className="num opacity-60">{FEATURES.length}</span>
          </button>
          {CATEGORIES.map((c) => (
            <button key={c.id} type="button" className="filter" aria-pressed={cat === c.id} onClick={() => setCat(c.id)}>
              {c.label} <span className="num opacity-60">{byCat(c.id).length}</span>
            </button>
          ))}
        </div>

        <p className="sr-only" aria-live="polite">
          Pokazano {list.length} z {FEATURES.length} funkcji
        </p>

        {list.length ? (
          <ul key={cat} className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {shown.map((x, n) => (
              <li key={x.cat + x.title} className="tile rounded-[var(--radius-card)] border border-rule bg-paper-2 p-4" style={vars({ '--i': n })}>
                <div className="flex items-center justify-between gap-3">
                  <span className="grid size-9 place-items-center rounded-xl bg-paper-3">
                    <x.icon className="size-[18px]" style={{ color: tone(x.cat).tone }} aria-hidden />
                  </span>
                  <span className="text-xs font-semibold text-ink-3">{tone(x.cat).label}</span>
                </div>
                <h3 className="mt-3 font-semibold leading-snug">{x.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-ink-2">{x.body}</p>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-6 rounded-[var(--radius-card)] border border-dashed border-rule-strong p-10 text-center">
            <p className="h-sub">Tego jeszcze nie ma.</p>
            <p className="mt-2 text-ink-2">Nic nie pasuje do „{query}”. Spróbuj innego słowa albo napisz do nas z poziomu aplikacji — dopiszemy do listy.</p>
            <button type="button" className="btn btn-ghost btn-sm mt-5" onClick={() => { setQuery(''); setCat('all'); }}>
              Pokaż wszystko
            </button>
          </div>
        )}

        {folded && (
          <div className="mt-6 flex justify-center">
            <button type="button" className="btn btn-ghost" onClick={() => setOpen(true)}>
              Pokaż wszystkie {FEATURES.length}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ stopka: spis treści trasy */

export function SiteFooter() {
  return (
    <footer className="border-t border-rule pb-32 pt-14 min-[1180px]:pb-12">
      <div className="shell">
        <div className="grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)]">
          <div>
            <a href="#top" aria-label="Leniwa Kluska — do góry" className="inline-block">
              <Wordmark size="lg" />
            </a>
            <p className="mt-4 max-w-[22rem] text-ink-2">Treningi, bieganie, dieta, nawyki i postępy w jednym miejscu. Za darmo.</p>
            <a href={APP} className="btn btn-primary mt-6">
              Otwórz aplikację
              <ArrowRight className="nudge size-5" aria-hidden />
            </a>
          </div>

          <nav aria-label="Stopka" className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3">
            <FooterGroup
              title="Aplikacja"
              links={[
                ['Trening', '#trening'],
                ['Bieganie', '#bieganie'],
                ['Jedzenie', '#dieta'],
                ['Nawyki', '#nawyki'],
                ['Postępy', '#postepy'],
              ]}
            />
            <FooterGroup
              title="Razem"
              links={[
                ['Zwierzak', '#zwierzak'],
                ['Ekipa', '#ekipa'],
                ['Trener', '#trenerzy'],
                ['Wiedza i sklep', '#wiecej'],
                ['Panel trenera', APP],
              ]}
            />
            <FooterGroup
              title="Na skróty"
              links={[
                ['Wszystkie funkcje', '#funkcje'],
                ['Kalkulator talerzy', '#kalkulator'],
                ['Plan na rok', '#rok'],
                ['Cennik', '#cennik'],
                ['Pytania', '#faq'],
              ]}
            />
          </nav>
        </div>
        <p className="mt-12 border-t border-rule pt-6 text-sm leading-relaxed text-ink-2">
          © {new Date().getFullYear()} Leniwa Kluska. Zrobione w Polsce. Liczby i osoby na ekranach aplikacji to dane przykładowe.
        </p>
      </div>
    </footer>
  );
}

function FooterGroup({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <p className="font-display text-xl font-bold uppercase leading-none">{title}</p>
      <ul className="mt-4 space-y-2.5 text-[0.9375rem]">
        {links.map(([label, href]) => (
          <li key={label}>
            <a href={href} className="whitespace-nowrap text-ink-2 transition-colors hover:text-ink">
              {label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
